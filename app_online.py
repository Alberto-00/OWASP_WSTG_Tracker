import sys
import os
import json
import requests
from bs4 import BeautifulSoup
from PyQt6.QtWidgets import (
    QApplication, QWidget, QVBoxLayout, QHBoxLayout, QListWidget,
    QComboBox, QTextEdit, QLineEdit, QPushButton, QListWidgetItem,
    QFileDialog, QMenu, QFrame
)
from PyQt6.QtGui import QTextCharFormat, QFont, QColor
from PyQt6.QtCore import Qt
from PyQt6.QtWidgets import QStyledItemDelegate
from PyQt6.QtGui import QBrush
from PyQt6.QtWidgets import QMessageBox

JSON_URL = "https://raw.githubusercontent.com/OWASP/wstg/master/checklists/checklist.json"

def fetch_checklist():
    response = requests.get(JSON_URL)
    if response.status_code == 200:
        return response.json()
    return {}

def fetch_reference_details(url):
    try:
        response = requests.get(url)
        if response.status_code != 200:
            return {"summary": "<i>Failed to fetch reference.</i>"}

        soup = BeautifulSoup(response.text, "html.parser")
        main_content = soup.find("div", id="main")
        if not main_content:
            return {"summary": "<i>Main content not found.</i>"}

        sections = {
            "summary": "",
            "how-to": "",
            "tools": "",
            "test objectives": "",
            "remediation": ""
        }

        current_section = "summary"
        capture = False

        for element in main_content.find_all(['h2', 'p', 'ul', 'li', 'pre', 'code', 'br']):
            if element.name == 'h2':
                section_id = element.get('id', '').lower()
                title = element.get_text(strip=True)
                if 'summary' in section_id:
                    current_section = "summary"
                    capture = True
                elif 'how-to' in section_id:
                    current_section = "how-to"
                elif 'tools' in section_id:
                    current_section = "tools"
                elif 'test objectives' in section_id:
                    current_section = "test objectives"
                elif 'remediation' in section_id:
                    current_section = "remediation"

                sections[current_section] += f"<h3>{title}</h3>"
            elif capture:
                if element.name == 'p':
                    sections[current_section] += f"<p>{element.get_text(' ', strip=True)}</p>"
                elif element.name == 'ul':
                    sections[current_section] += "<ul>"
                    for li in element.find_all('li'):
                        sections[current_section] += f"<li>{li.get_text(strip=True)}</li>"
                    sections[current_section] += "</ul>"
                elif element.name == 'pre':
                    code_block = element.get_text(" ", strip=True)
                    sections[current_section] += f"<pre><code>{code_block}</code></pre>"
                elif element.name == 'br':
                    sections[current_section] += "<br>"
                elif element.name[0] == 'h' and element.name != "h2":
                    sections[current_section] += f"<h5>{element.get_text(strip=True)}</h5>"

        return sections

    except Exception as e:
        return {"summary": f"<i>Error fetching reference: {str(e)}</i>"}



class ColorPreservingDelegate(QStyledItemDelegate):
    def paint(self, painter, option, index):
        fg = index.data(Qt.ItemDataRole.ForegroundRole)
        bg = index.data(Qt.ItemDataRole.BackgroundRole)

        if bg is not None:
            option.palette.setBrush(option.palette.ColorRole.Highlight, QBrush(bg))
        if fg is not None:
            option.palette.setBrush(option.palette.ColorRole.HighlightedText, QBrush(fg))

        super().paint(painter, option, index)


class OWASPChecklistApp(QWidget):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("OWASP WSTG Checklist")
        self.setGeometry(100, 100, 1300, 700)

        self.data = fetch_checklist()
        self.categories = sorted(self.data["categories"].keys())
        self.status_map = {}
        self.category_descriptions = self.loadCategoryDescriptions()

        self.loadProgressFromFile()  # 👈 carica in automatico
        self.initUI()
    
    def conditionalContextMenu(self, pos):
        selected_category = self.categoryDropdown.currentText()
        if selected_category == "📂 All Categories":
            self.showListContextMenu(pos)
    
    def loadProgressFromFile(self):
        filepath = os.path.join(os.path.dirname(__file__), "progress.json")
        if os.path.exists(filepath):
            with open(filepath, "r") as f:
                self.status_map = json.load(f)
    
    def loadCategoryDescriptions(self):
        try:
            filepath = os.path.join(os.path.dirname(__file__), "category_descriptions.json")
            if os.path.exists(filepath):
                with open(filepath, "r", encoding="utf-8") as f:
                    return json.load(f)
        except Exception as e:
            print(f"Errore nel caricamento descrizioni categorie: {e}")
        return {}

    def initUI(self):
        layout = QVBoxLayout()
        self.setStyleSheet("""
            QWidget {
                background-color: #232429;
                color: #e0e0e0;
                font-size: 13px;
            }
            QLineEdit, QComboBox, QPushButton {
                font-size: 13px;
                padding: 6px;
                background-color: #2b2c30;
                color: #ffffff;
                border: 1px solid #555;
                border-radius: 4px;
            }
            QComboBox {
                background-color: #2f3035;
                selection-background-color: #3a3b40;
            }
            QListWidget {
                font-size: 13px;
                background-color: #2a2b2e;
                border: 1px solid #3d3d3d;
                border-radius: 6px;
                color: #ffffff;
            }
            QListWidget::item:hover {
                background-color: #3b3c41;
            }
            QTextEdit {
                font-family: Consolas;
                background-color: #2d2e32;
                padding: 10px;
                color: #e0e0e0;
                border: 1px solid #505050;
                border-radius: 6px;
            }
            QFrame#line {
                background-color: #3a3b40;
                max-height: 1px;
                min-height: 1px;
            }
            QPushButton {
                color: #2f3035;
                font-weight: bold;
                background-color: #80bfff;
                border-radius: 5px;
                border: 1px solid #666;
                padding: 5px;
            }
            QPushButton:hover {
                background-color: #5aaaff;
            }
        """)


        topControlsLayout = QHBoxLayout()
        
        self.searchBar = QLineEdit()
        self.searchBar.setPlaceholderText("🔍 Search checklists...")
        self.searchBar.textChanged.connect(self.updateChecklist)
        topControlsLayout.addWidget(self.searchBar)

        self.categoryDropdown = QComboBox()
        self.categoryDropdown.addItem("📂 All Categories")
        self.categoryDropdown.addItems(self.categories)
        self.categoryDropdown.currentIndexChanged.connect(self.updateChecklist)
        topControlsLayout.addWidget(self.categoryDropdown)

        self.saveButton = QPushButton("💾 Salva Stato")
        self.saveButton.clicked.connect(self.saveStatus)
        topControlsLayout.addWidget(self.saveButton)

        self.loadButton = QPushButton("📂 Carica Stato")
        self.loadButton.clicked.connect(self.loadStatus)
        topControlsLayout.addWidget(self.loadButton)

        layout.addLayout(topControlsLayout)

        mainLayout = QHBoxLayout()

        self.checklistBox = QListWidget()
        self.checklistBox.setItemDelegate(ColorPreservingDelegate())
        self.checklistBox.itemClicked.connect(self.displayDetails)
        self.checklistBox.currentRowChanged.connect(self.handleArrowKeyNavigation)
       
        # Abilita menu contestuale personalizzato (clic destro)
        self.checklistBox.setContextMenuPolicy(Qt.ContextMenuPolicy.CustomContextMenu)
        self.checklistBox.customContextMenuRequested.connect(self.showListContextMenu)


        self.checklistBox.setContextMenuPolicy(Qt.ContextMenuPolicy.CustomContextMenu)
        mainLayout.addWidget(self.checklistBox)

        rightLayout = QVBoxLayout()

        self.detailsBox = QTextEdit()
        self.detailsBox.setReadOnly(True)
        rightLayout.addWidget(self.detailsBox)

        line = QFrame()
        line.setFrameShape(QFrame.Shape.HLine)
        line.setFrameShadow(QFrame.Shadow.Sunken)
        line.setObjectName("line")
        rightLayout.addWidget(line)

        self.referenceDetailsBox = QTextEdit()
        self.referenceDetailsBox.setReadOnly(True)
        self.referenceDetailsBox.setAcceptRichText(True)
        rightLayout.addWidget(self.referenceDetailsBox)

        # Crea i pulsanti-sezioni
        self.referenceTabs = QHBoxLayout()

        self.btnSummary = QPushButton("📄 Summary")
        self.btnHowTo = QPushButton("🔍 How-To")
        self.btnTools = QPushButton("🛠 Tools")
        self.btnObjectives = QPushButton("🎯 Objectives")
        self.btnRemediation = QPushButton("🛡 Remediation")

        # Raccogli i pulsanti reference in una lista
        self.referenceButtons = [
            self.btnSummary, self.btnHowTo, self.btnTools, self.btnObjectives, self.btnRemediation
        ]

        # Disabilita tutti i pulsanti all'avvio (rimangono visibili)
        for btn in self.referenceButtons:
            btn.setEnabled(False)
    

        # Stile coerente
        for btn in [self.btnSummary, self.btnHowTo, self.btnTools, self.btnObjectives, self.btnRemediation]:
            btn.setFixedSize(120, 40)
            btn.setStyleSheet("""
                QPushButton {
                    background-color: #2f3035;
                    color: #e0e0e0;
                    border: 1px solid #555;
                    border-radius: 6px;
                }
                QPushButton:hover {
                    background-color: #404247;
                }
                QPushButton:checked {
                    background-color: #80bfff;
                    color: #2f3035;
                }
            """)
            btn.setCheckable(True)
            self.referenceTabs.addWidget(btn)

        # Aggiungi layout al rightLayout
        rightLayout.addLayout(self.referenceTabs)


        mainLayout.addLayout(rightLayout)
        layout.addLayout(mainLayout)
        self.setLayout(layout)

        self.updateChecklist()

    def _make_button(self, label, action):
        btn = QPushButton(label)
        btn.clicked.connect(action)
        return btn
    
    def updateFooterStatus(self):
        done = sum(1 for v in self.status_map.values() if v == "done")
        progress = sum(1 for v in self.status_map.values() if v == "in-progress")
        pending = sum(1 for v in self.status_map.values() if v == "pending")
        if not hasattr(self, "footerStatus"):
            from PyQt6.QtWidgets import QLabel
            self.footerStatus = QLabel()
            self.footerStatus.setStyleSheet("color: #aaaaaa; font-size: 12px; padding-top: 6px;")
            self.layout().addWidget(self.footerStatus)
        self.footerStatus.setText(
            f"🔲 Non Fatto: {pending}   ⏳ In Corso: {progress}   ✅ Completati: {done}"
        )

    def showListContextMenu(self, pos):
        item = self.checklistBox.itemAt(pos)
        if not item:
            return

        menu = QMenu(self)
        menu.setStyleSheet("""
            QMenu {
                background-color: #2a2b2e;
                color: #ffffff;
                border: 1px solid #444;
                padding: 4px;
            }
            QMenu::item {
                padding: 6px 20px;
                background-color: transparent;
            }
            QMenu::item:selected {
                background-color: #5aaaff;  /* colore hover */
                color: #232429;             /* colore testo hover */
                border-radius: 4px;
            }
        """)

        selected_category = self.categoryDropdown.currentText()

        # Solo in modalità "All Categories" mostra Collassa/Espandi
        if selected_category == "📂 All Categories":
            toggleCollapseAll = menu.addAction("▶ Collassa Tutto")
            toggleCollapseAll.triggered.connect(lambda: self.collapseAll(True))

            toggleExpandAll = menu.addAction("▼ Espandi Tutto")
            toggleExpandAll.triggered.connect(lambda: self.collapseAll(False))
            menu.addSeparator()

        # Azioni sempre disponibili
        markDone = menu.addAction("✅ Imposta Selezionati Completati")
        markDone.triggered.connect(lambda: self.setStatusBatch("done"))

        markProgress = menu.addAction("⏳ Imposta Selezionati In Corso")
        markProgress.triggered.connect(lambda: self.setStatusBatch("in-progress"))

        markPending = menu.addAction("◻ Imposta Selezionati Non Fatto")
        markPending.triggered.connect(lambda: self.setStatusBatch("pending"))

        menu.exec(self.checklistBox.mapToGlobal(pos))



    def collapseAll(self, should_collapse):
        self.collapsed_sections = set(self.data["categories"].keys()) if should_collapse else set()
        self.updateChecklist()
        self.updateFooterStatus()

        # Etichetta di riepilogo (solo se non già esistente)
        if not hasattr(self, "footerStatus"):
            from PyQt6.QtWidgets import QLabel
            self.footerStatus = QLabel()
            self.footerStatus.setStyleSheet("color: #aaaaaa; font-size: 12px; padding-top: 6px;")
            self.layout().addWidget(self.footerStatus)

        # Aggiorna la barra di stato con i conteggi aggiornati
        done = sum(1 for v in self.status_map.values() if v == "done")
        progress = sum(1 for v in self.status_map.values() if v == "in-progress")
        pending = sum(1 for v in self.status_map.values() if v == "pending")
        if hasattr(self, "footerStatus"):
            self.footerStatus.setText(
                f"🔲 Non Fatto: {pending}   ⏳ In Corso: {progress}   ✅ Completati: {done}"
            )

    def setStatusBatch(self, status):
        for i in range(self.checklistBox.count()):
            item = self.checklistBox.item(i)
            test_id = item.data(Qt.ItemDataRole.UserRole)
            if isinstance(test_id, str) and not test_id.startswith("_header_") and item.isSelected():
                self.status_map[test_id] = status
        self.updateChecklist()
        self.updateFooterStatus()
        for i in range(self.checklistBox.count()):
            item = self.checklistBox.item(i)
            test_id = item.data(Qt.ItemDataRole.UserRole)
            if isinstance(test_id, str) and not test_id.startswith("_header_") and item.isSelected():
                self.status_map[test_id] = status
        self.updateChecklist()

    def updateChecklist(self):
        # Imposta tutti i test come non fatti se non ancora registrati
        for category, details in self.data["categories"].items():
            for test in details["tests"]:
                if test["id"] not in self.status_map:
                    self.status_map[test["id"]] = "pending"

        selected_category = self.categoryDropdown.currentText()
        search_query = self.searchBar.text().strip().lower()
        self.checklistBox.clear()
        self.checklistBox.setSelectionMode(QListWidget.SelectionMode.ExtendedSelection)

        collapsed_sections = getattr(self, 'collapsed_sections', set())
        if not hasattr(self, 'collapsed_sections'):
            self.collapsed_sections = set()

        if selected_category != "📂 All Categories":
            category_data = self.data["categories"].get(selected_category, {})
            test_ids = [test["id"] for test in category_data.get("tests", [])]
            statuses = [self.status_map.get(tid, "pending") for tid in test_ids]

            has_in_progress = any(s == "in-progress" for s in statuses)
            has_done = any(s == "done" for s in statuses)

            if has_in_progress:
                color = QColor("#bb86fc")  # viola
            elif has_done:
                color = QColor("#2e7d57")  # verde
            else:
                color = QColor("#80bfff")  # blu (default)

            category_title = QListWidgetItem(f"{selected_category}:")
            font = category_title.font()
            font.setBold(True)
            category_title.setFont(font)
            category_title.setForeground(color)
            category_title.setFlags(Qt.ItemFlag.NoItemFlags)
            self.checklistBox.addItem(category_title)

            # Mostra la descrizione della categoria selezionata
            self.showCategoryDescription(selected_category)

        for category, details in self.data["categories"].items():
            show_category = selected_category == "📂 All Categories" or category == selected_category
            if show_category:
                if selected_category == "📂 All Categories":
                    spacer = QListWidgetItem("")
                    spacer.setFlags(Qt.ItemFlag.NoItemFlags)
                    self.checklistBox.addItem(spacer)

                    arrow = '▼' if category not in self.collapsed_sections else '▶'
                    category_title = QListWidgetItem(f"{arrow} {category}")
                    font = category_title.font()
                    font.setBold(True)
                    category_title.setFont(font)
                    category_title.setData(Qt.ItemDataRole.UserRole, f"_header_{category}")

                    # Conta gli stati nella categoria
                    statuses = [self.status_map.get(test["id"], "pending") for test in details["tests"]]
                    has_in_progress = any(s == "in-progress" for s in statuses)
                    has_done = any(s == "done" for s in statuses)

                    # Assegna il colore in base alle regole
                    if has_in_progress:
                        category_title.setForeground(QColor("#bb86fc"))  # viola
                    elif has_done:
                        category_title.setForeground(QColor("#2e7d57"))  # verde
                    else:
                        category_title.setForeground(QColor("#80bfff"))  # blu (default)

                    self.checklistBox.addItem(category_title)


                    if category in collapsed_sections:
                        continue

                for test in details["tests"]:
                    test_id = test["id"]
                    status = self.status_map.get(test_id, "pending")

                    if status == "done":
                        icon = "✅"
                        bg, fg = QColor("#2e7d57"), QColor("#d0f5e0")
                    elif status == "in-progress":
                        icon = "⏳"
                        # bg, fg = QColor("#345481"), QColor("#d0e8ff") // Colore Blu
                        bg, fg = QColor("#442c5c"), QColor("#bb86fc")  # Colore Grigio
                    else:
                        icon = "◻"
                        bg, fg = QColor("transparent"), QColor("#dcdcdc")

                    title = f"{icon} {test_id} - {test['name']}"
                    if search_query in test['name'].lower() or search_query in test['id'].lower():
                        item = QListWidgetItem(title)
                        item.setBackground(bg)
                        item.setForeground(fg)
                        item.setData(Qt.ItemDataRole.UserRole, test_id)
                        self.checklistBox.addItem(item)

        try:
            self.checklistBox.itemClicked.disconnect(self.handleListClick)
        except Exception:
            pass
        self.checklistBox.itemClicked.connect(self.handleListClick)

        self.categoryDropdown.setStyleSheet("""
            QComboBox {
                background-color: #2f3035;
                color: #dcdcdc;
                border: 1px solid #444;
                padding: 6px;
            }
            QComboBox::drop-down {
                subcontrol-origin: padding;
                subcontrol-position: top right;
                width: 20px;
                border-left: 1px solid #444;
            }
            QComboBox QAbstractItemView {
                background-color: #2a2b30;
                selection-background-color: #3a3b40;
                color: #ffffff;
            }
            QComboBox:hover {
                background-color: #383a40;
            }
            QComboBox:editable {
                font-weight: normal;
            }
            QComboBox:!editable, QComboBox::drop-down:editable {
                font-weight: normal;
            }
            QComboBox QAbstractItemView::item:selected {
                color: #80bfff;
                font-weight: bold;
            }
        """)
    
    def showCategoryDescription(self, category):
        self.detailsBox.clear()
        cursor = self.detailsBox.textCursor()

        # Titolo categoria (in grassetto + blu)
        title_format = QTextCharFormat()
        title_format.setFontWeight(QFont.Weight.Bold)
        title_format.setForeground(QColor("#80bfff"))
        cursor.insertText(f"📂 Category: {category}\n\n", title_format)

        # Descrizione normale (non in grassetto, colore grigio chiaro)
        desc_format = QTextCharFormat()
        desc_format.setFontWeight(QFont.Weight.Normal)
        desc_format.setForeground(QColor("#e0e0e0"))

        description = self.category_descriptions.get(category, "").strip()
        if description:
            cursor.insertText(f"{description}\n\n", desc_format)
        else:
            cursor.insertText("No description available for this category.\n\n", desc_format)

        self.detailsBox.setTextCursor(cursor)

        # Reset il pannello dei dettagli reference
        self.referenceDetailsBox.clear()
        self.referenceDetailsBox.setHtml("<i>Seleziona un test per visualizzare i dettagli.</i>")

        # Disabilita bottoni reference quando si seleziona una categoria
        for btn in self.referenceButtons:
            btn.setEnabled(False)
    

        # Reset pulsanti tab
        for btn in [self.btnSummary, self.btnHowTo, self.btnTools, self.btnObjectives, self.btnRemediation]:
            btn.setChecked(False)


    def handleListClick(self, item):
        data = item.data(Qt.ItemDataRole.UserRole)
        selected_category = self.categoryDropdown.currentText()
        
        # Click su header categoria in modalità "All Categories"
        if isinstance(data, str) and data.startswith("_header_"):
            category = data.replace("_header_", "")
            if not hasattr(self, 'collapsed_sections'):
                self.collapsed_sections = set()
            if category in self.collapsed_sections:
                self.collapsed_sections.remove(category)
            else:
                self.collapsed_sections.add(category)
            self.updateChecklist()
            self.showCategoryDescription(category)

        # Click su titolo della categoria in modalità singola categoria
        elif selected_category != "📂 All Categories" and item.text().strip().endswith(":"):
            self.showCategoryDescription(selected_category)



    def displayDetails(self, item):
        if item:
            self.showDetails(item.text())

    def handleArrowKeyNavigation(self, index):
        item = self.checklistBox.item(index)
        if item:
            self.showDetails(item.text())

    def showDetails(self, selected_text):
        selected_text = selected_text.split(" - ", 1)[1] if " - " in selected_text else selected_text
        for category, details in self.data["categories"].items():
            for test in details["tests"]:
                if test["name"] == selected_text:
                    self.detailsBox.clear()
                    cursor = self.detailsBox.textCursor()
                    bold = QTextCharFormat()
                    bold.setFontWeight(QFont.Weight.Bold)
                    bold.setForeground(QColor("#ff80ab"))
                    
                    cursor.insertText(f"📌 Category: {category}\n\n", bold)
                    cursor.insertText(f"🆔 ID: {test['id']}\n\n", bold)

                    if "objectives" in test:
                        cursor.insertText("🎯 Test Objectives:", bold)
                        html = "<ul style='color:#ff80ab'>"
                        for obj in test["objectives"]:
                            html += f"<li style='margin-bottom: 10px'>{obj}</li>"
                        html += "</ul><br>"
                        cursor.insertHtml(html)

                    cursor.insertText("🔗 Reference: ", bold)
                    cursor.insertHtml(f'<a href="{test["reference"]}" style="color:#ff80ab;">{test["reference"]}</a>\n\n')
                    self.detailsBox.setTextCursor(cursor)

                    # 🔽 FETCH E VISUALIZZAZIONE DELLE SEZIONI REFERENCE
                    self.current_reference_sections = fetch_reference_details(test.get("reference", ""))
                    self.displayReferenceSection("summary")

                    # 🔗 COLLEGA I PULSANTI ALLE SEZIONI
                    self.btnSummary.clicked.connect(lambda: self.displayReferenceSection("summary"))
                    self.btnHowTo.clicked.connect(lambda: self.displayReferenceSection("how-to"))
                    self.btnTools.clicked.connect(lambda: self.displayReferenceSection("tools"))
                    self.btnObjectives.clicked.connect(lambda: self.displayReferenceSection("test objectives"))
                    self.btnRemediation.clicked.connect(lambda: self.displayReferenceSection("remediation"))

                    # 🔘 IMPOSTA 'Summary' COME SELEZIONATO DI DEFAULT
                    for btn in [self.btnSummary, self.btnHowTo, self.btnTools, self.btnObjectives, self.btnRemediation]:
                        btn.setChecked(False)
                    self.btnSummary.setChecked(True)

                    # Riabilita i pulsanti delle sezioni
                    for btn in self.referenceButtons:
                        btn.setEnabled(True)
                    return


    def displayReferenceSection(self, section):
        html = self.current_reference_sections.get(section, "<i>Section not found.</i>")
        self.referenceDetailsBox.setHtml(html)
        for btn in [self.btnSummary, self.btnHowTo, self.btnTools, self.btnObjectives, self.btnRemediation]:
            btn.setChecked(False)
        mapping = {
            "summary": self.btnSummary,
            "how-to": self.btnHowTo,
            "tools": self.btnTools,
            "test objectives": self.btnObjectives,
            "remediation": self.btnRemediation
        }
        if section in mapping:
            mapping[section].setChecked(True)


    def showContextMenu(self, position):
        item = self.checklistBox.itemAt(position)
        if not item:
            return
        test_id = item.data(Qt.ItemDataRole.UserRole)
        menu = QMenu(self)
        for state, label in [("pending", "◻ Non fatto"), ("in-progress", "⏳ In corso"), ("done", "✅ Risolto")]:
            action = menu.addAction(label)
            action.triggered.connect(lambda _, s=state: self.setStatus(test_id, s))
        menu.exec(self.checklistBox.mapToGlobal(position))

    def setStatus(self, test_id, status):
        self.status_map[test_id] = status
        self.updateChecklist()

    def saveStatus(self):
        filepath = os.path.join(os.path.dirname(__file__), "progress_temp.json")
        with open(filepath, 'w') as f:
            json.dump(self.status_map, f, indent=4)

        msg = QMessageBox(self)
        msg.setWindowTitle("✅ Salvataggio completato")
        msg.setText(
            "<div style='font-size:15px; font-weight:600; letter-spacing:0.5px;'>"
            "Stato salvato correttamente</div>"
            "<br><div style='font-size:13px; font-weight:400;'>"
            "Il file <code>progress_temp.json</code> è stato aggiornato."
            "</div>"
        )
        msg.setIcon(QMessageBox.Icon.Information)
        msg.setStandardButtons(QMessageBox.StandardButton.Ok)

        # Stile stile Apple Dark Mode
        msg.setStyleSheet("""
            QMessageBox {
                color: #e5e5ea;
                padding: 16px;
                border: none;
            }
            QLabel {
                color: #e5e5ea;
                font-size: 13px;
            }
            QPushButton {
                background-color: #0a84ff;
                color: white;
                padding: 6px 20px;
                border-radius: 8px;
                font-size: 13px;
                font-weight: 600;
                min-width: 80px;
            }
            QPushButton:hover {
                background-color: #409cff;
            }
            QPushButton:pressed {
                background-color: #0060df;
            }
        """)

        msg.exec()




    def loadStatus(self):
        filename, _ = QFileDialog.getOpenFileName(self, "Carica stato", "", "JSON Files (*.json)")
        if filename:
            with open(filename, 'r') as f:
                self.status_map = json.load(f)
            self.updateChecklist()

if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = OWASPChecklistApp()
    window.show()
    sys.exit(app.exec())
