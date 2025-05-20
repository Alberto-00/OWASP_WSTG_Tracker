import os
import json
import re
from PyQt6.QtWidgets import (
    QApplication, QWidget, QVBoxLayout, QHBoxLayout, QListWidget,
    QComboBox, QTextEdit, QLineEdit, QPushButton, QListWidgetItem,
    QFileDialog, QMenu, QFrame, QLabel
)
from PyQt6.QtGui import QTextCharFormat, QFont, QColor
from PyQt6.QtCore import Qt, QSize
from PyQt6.QtWidgets import QStyledItemDelegate
from PyQt6.QtWidgets import QMessageBox
from PyQt6 import QtCore


WSTG = "../public/json/checklist.json"
WSTG_INFO = "../public/json/checklist_info_data.json"
LOAD_DEFAULT_CHECKLIST_STATE = "../public/json/progress.json"
WSTG_CATEGORY_DESCRIPTIONS = "../public/json/category_descriptions.json"
OWASP_TOP_10 = "../public/json/owasp_top_10.json"

SAVES_WSTG_STATE = "../public/saves/progress_temp.json"


def fetch_checklist():
    try:
        filepath = os.path.join(os.path.dirname(__file__), WSTG)
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"Errore nel caricamento del checklist locale: {e}")
        return {}


class ColorPreservingDelegate(QStyledItemDelegate):
    def paint(self, painter, option, index):
        fg = index.data(Qt.ItemDataRole.ForegroundRole)
        bg = index.data(Qt.ItemDataRole.BackgroundRole)
        border_color = index.data(Qt.ItemDataRole.UserRole + 1)

        painter.save()

        # Background personalizzato
        if bg:
            painter.fillRect(option.rect, bg)

        # Disegna il testo
        super().paint(painter, option, index)

        # Bordo personalizzato
        if border_color and border_color != "transparent":
            pen = painter.pen()
            pen.setColor(QColor(border_color))
            pen.setWidth(1)
            painter.setPen(pen)
            painter.drawRect(option.rect.adjusted(0, 0, -1, -1))

        painter.restore()


class OWASPChecklistApp(QWidget):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("OWASP WSTG Checklist")
        self.setGeometry(100, 100, 1300, 700)

        self.data = fetch_checklist()
        self.categories = sorted(self.data["categories"].keys())
        self.status_map = {}
        self.category_descriptions = self.loadCategoryDescriptions()
        self.offline_reference_data = self.loadOfflineReferenceData()

        # self.loadProgressFromFile()  # 👈 carica in automatico
        self.initUI()
    
    def loadOfflineReferenceData(self):
        try:
            filepath = os.path.join(os.path.dirname(__file__), WSTG_INFO)
            with open(filepath, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"Errore caricando dati offline: {e}")
            return {}
    
    def loadProgressFromFile(self):
        filepath = os.path.join(os.path.dirname(__file__), LOAD_DEFAULT_CHECKLIST_STATE)
        if os.path.exists(filepath):
            with open(filepath, "r") as f:
                self.status_map = json.load(f)
    
    def loadCategoryDescriptions(self):
        try:
            filepath = os.path.join(os.path.dirname(__file__), WSTG_CATEGORY_DESCRIPTIONS)
            if os.path.exists(filepath):
                with open(filepath, "r", encoding="utf-8") as f:
                    return json.load(f)
        except Exception as e:
            print(f"Errore nel caricamento descrizioni categorie: {e}")
        return {}

    def loadOwaspTop10(self):
        try:
            path = os.path.join(os.path.dirname(__file__), OWASP_TOP_10)
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"Errore nel caricamento OWASP Top 10: {e}")
            return {}
    
    def conditionalContextMenu(self, pos):
        selected_category = self.categoryDropdown.currentText()
        if selected_category == "📂 All Categories":
            self.showListContextMenu(pos)

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

        self.mappingButton = QPushButton("🧩 Mapping WSTG ↔ OWASP Top 10")
        self.mappingButton.clicked.connect(self.showMappingTable)
        topControlsLayout.addWidget(self.mappingButton)

        self.saveButton = QPushButton("💾 Salva Stato")
        self.saveButton.clicked.connect(self.saveStatus)
        topControlsLayout.addWidget(self.saveButton)

        self.loadButton = QPushButton("📂 Carica Stato")
        self.loadButton.clicked.connect(self.loadStatus)
        topControlsLayout.addWidget(self.loadButton)

        self.mappingButton.setFixedHeight(32)
        self.mappingButton.setStyleSheet("""
            QPushButton {
                background-color: #80bfff;
                color: #2f3035;
                border: 1px solid #555;
                border-radius: 5px;
                font-weight: bold;
            }
            QPushButton:hover {
                background-color: #5aaaff;
            }
        """)
        
        layout.addLayout(topControlsLayout)

        mainLayout = QHBoxLayout()

        self.checklistBox = QListWidget()
        self.checklistBox.setStyleSheet("""
            QListWidget::item {
                border: 1px solid transparent;
                padding: 6px;
                margin: 1px;
                border-radius: 4px;
                outline: none;
            }
            QListWidget::item:hover {
                border: 1px solid #5aaaff;
                background-color: rgba(90, 170, 255, 0.1);
            }
            QListWidget::item:selected {
                border: 1px solid #80bfff;
                background-color: rgba(90, 170, 255, 0.2);
            }
        """)
        self.checklistBox.setItemDelegate(ColorPreservingDelegate())
        self.checklistBox.itemClicked.connect(self.displayDetails)
        self.checklistBox.currentRowChanged.connect(self.handleArrowKeyNavigation)
        self.checklistBox.setFocusPolicy(Qt.FocusPolicy.NoFocus)
       
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
        self.btnRemediation = QPushButton("🛡 Remediation")

        # Raccogli i pulsanti reference in una lista
        self.referenceButtons = [
            self.btnSummary, self.btnHowTo, self.btnTools, self.btnRemediation
        ]

        # Disabilita tutti i pulsanti all'avvio (rimangono visibili)
        for btn in self.referenceButtons:
            btn.setEnabled(False)
    
        # Stile coerente
        for btn in [self.btnSummary, self.btnHowTo, self.btnTools, self.btnRemediation]:
            btn.setFixedSize(160, 40)
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
        self.owasp_top10 = self.loadOwaspTop10()

    def _make_button(self, label, action):
        btn = QPushButton(label)
        btn.clicked.connect(action)
        return btn

    def showMappingTable(self):
        from PyQt6.QtWidgets import QSplitter, QListWidgetItem, QTextEdit, QHBoxLayout, QListWidget, QWidget

        mapping_data = {
            "Information Gathering": "A01, A05, A06",
            "Configuration and Deployment Management Testing": "A05, A06",
            "Identity Management Testing": "A07",
            "Authentication Testing": "A07",
            "Authorization Testing": "A01",
            "Session Management Testing": "A07",
            "Input Validation Testing": "A03, A10",
            "Testing for Error Handling": "A05",
            "Testing for Weak Cryptography": "A02, A08",
            "Business Logic Testing": "A04, A08",
            "Client-side Testing": "A03, A05",
            "API Testing": "A01, A03, A05, A06, A10"
        }

        level_colors = {
            "critico": "#ff4c4c",
            "alto": "#ff9800",
            "medio": "#ffc107",
            "basso": "#4caf50"
        }

        dialog = QWidget()
        dialog.setWindowTitle("Mapping WSTG ↔ OWASP Top 10")
        dialog.setGeometry(200, 200, 1300, 580)
        layout = QHBoxLayout(dialog)

        splitter = QSplitter()
        splitter.setOrientation(Qt.Orientation.Horizontal)

        # Tabella mapping WSTG ↔ OWASP
        html = (
            "<table border='0' cellspacing='0' cellpadding='6' "
            "style='border-collapse: collapse; table-layout: fixed; width: 100%;"
            "background-color: rgba(33, 34, 38, 0.95); border: 1px solid #3a3b40; box-shadow: 0 0 15px rgba(128,191,255,0.3); border-radius: 6px;'>"
            "<col style='width: 49%; text-align: left;'>"
            "<col style='width: 2%; background-color: rgba(90,170,255,0.2);'>"
            "<col style='width: 49%;'>"
        )

        html += (
            "<tr style='background-color: rgba(128,191,255,0.12);'>"
            "<th align='left' style='color:#d2eaff; font-size: 15px; padding: 10px 6px;'>Categoria WSTG</th>"
            "<th></th>"
            "<th style='color:#d2eaff; font-size: 15px; padding: 10px 6px;'>OWASP Top 10 (2021)</th>"
            "</tr>"
        )

        row_colors = ["rgba(46, 49, 55, 0.7)", "rgba(38, 40, 45, 0.7)"]
        for i, (wstg_cat, owasp_refs) in enumerate(mapping_data.items()):
            bg_color = row_colors[i % 2]
            html += (
                f"<tr style='background-color:{bg_color};'>"
                f"<td style='padding: 10px 8px; color:#dceaf7;'>{wstg_cat}</td>"
                f"<td></td>"
                f"<td style='padding: 10px 8px; color:#e6f2ff;'>{owasp_refs}</td>"
                f"</tr>"
            )

        html += "</table>"

        html_box = QTextEdit()
        html_box.setMinimumWidth(475)
        html_box.setHtml(html)
        html_box.setReadOnly(True)
        html_box.setStyleSheet("background-color: #2a2b2e; color: #ffffff; font-size: 13px; border: none; border-radius: 6px;")

        # Lista OWASP Top 10
        self.owasp_list_widget = QListWidget()
        self.owasp_list_widget.setMinimumWidth(340)
        self.owasp_list_widget.setStyleSheet("background-color: #2a2b2e; color: #ffffff; font-size: 13px;")

        for code, entry in self.owasp_top10.items():
            item = QListWidgetItem(code)
            level = entry.get("level", "medio")
            color = QColor(level_colors.get(level, "#ffffff"))
            item.setForeground(color)
            
            # Imposta un'altezza maggiore per ogni riga OWASP
            item.setSizeHint(QSize(0, 34))  # Altezza riga personalizzata
            
            self.owasp_list_widget.addItem(item)

        # Box descrizione OWASP
        self.owasp_detail_box = QTextEdit()
        self.owasp_detail_box.setReadOnly(True)
        self.owasp_detail_box.setStyleSheet("background-color: #232429; color: #d0d0d0; font-family: Consolas; font-size: 13px;")

        self.owasp_list_widget.currentItemChanged.connect(self.showOwaspDescription)

        # Layout
        splitter.addWidget(html_box)
        splitter.addWidget(self.owasp_list_widget)
        splitter.addWidget(self.owasp_detail_box)
        splitter.setStretchFactor(0, 3)
        splitter.setStretchFactor(1, 2)
        splitter.setStretchFactor(2, 5)

        layout.addWidget(splitter)
        dialog.setLayout(layout)
        dialog.setStyleSheet("background-color: #232429;")
        dialog.show()
        dialog.raise_()
        dialog.activateWindow()
        
        OWASPChecklistApp.center_window_on_screen(dialog)
        self.mappingWindow = dialog

    def center_window_on_screen(window):
        screen_geometry = QApplication.primaryScreen().availableGeometry()
        x = (screen_geometry.width() - window.width()) // 2
        y = (screen_geometry.height() - window.height()) // 2
        window.move(x, y)

    def showOwaspDescription(self):
        item = self.owasp_list_widget.currentItem()
        if item:
            code = item.text()
            entry = self.owasp_top10.get(code, {})
            desc_raw = entry.get("it", {}).get("description", "Descrizione non trovata.")
            desc_html = desc_raw.replace("**Esempio:**", "<b style='color:#dddddd;'>Esempio:</b><br>").replace("\n", "<br>")
            desc_html = re.sub(r"`([^`]+)`", r"<code style='background-color:#333;padding:2px 4px;border-radius:4px;font-family:Consolas;font-size:12px;'>\1</code>", desc_html)
            link = entry.get("it", {}).get("link", "")

            html = f"<h3 style='color:#80bfff;'>{code}</h3>"
            html += f"<p style='color:#dddddd;'>{desc_html}</p>"

            if link:
                html += f"<p><a href='{link}' style='color:#bb86fc;'>{link}</a></p>"

            self.owasp_detail_box.setHtml(html)

    def updateFooterStatus(self):
        done = sum(1 for v in self.status_map.values() if v == "done")
        progress = sum(1 for v in self.status_map.values() if v == "in-progress")
        pending = sum(1 for v in self.status_map.values() if v == "pending")
        if not hasattr(self, "footerStatus"):
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
                    spacer.setSizeHint(QtCore.QSize(0, 16))  # spazio ridotto
                    spacer.setFlags(Qt.ItemFlag.NoItemFlags)
                    self.checklistBox.addItem(spacer)

                    arrow = '▼' if category not in self.collapsed_sections else '▶'
                    category_title = QListWidgetItem(f"{arrow} {category}")
                    category_title.setSizeHint(QtCore.QSize(0, 28))  # altezza maggiore
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
                        bg = QColor(46, 125, 87, 30)  # verde trasparente
                        fg = QColor("#d0f5e0")
                        border_color = "#2e7d57"
                    elif status == "in-progress":
                        icon = "⏳"
                        bg = QColor(187, 134, 252, 30)  # viola trasparente
                        fg = QColor("#bb86fc")
                        border_color = "#bb86fc"
                    else:
                        icon = "◻"
                        bg = QColor(0, 0, 0, 0)  # completamente trasparente
                        fg = QColor("#dcdcdc")
                        border_color = "transparent"


                    title = f"{icon} {test_id} - {test['name']}"
                    if search_query in test['name'].lower() or search_query in test['id'].lower():
                        item = QListWidgetItem(title)
                        item.setBackground(bg)
                        item.setForeground(fg)
                        item.setData(Qt.ItemDataRole.UserRole + 1, border_color)
                        item.setData(Qt.ItemDataRole.UserRole, test_id)

                        item.setSizeHint(QSize(0, 28))  # Altezza tra le righe personalizzata (default ≈ 22)
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
                border-radius: 4px;
            }
            /*
            QComboBox::drop-down {
                subcontrol-origin: padding;
                subcontrol-position: top right;
                width: 20px;
                border-left: 1px solid #444;
            }*/
            QComboBox QAbstractItemView {
                background-color: #2a2b30;
                selection-background-color: #3a3b40;
                color: #ffffff;
                border: 1px solid #444;
                padding: 4px;
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
        for btn in [self.btnSummary, self.btnHowTo, self.btnTools, self.btnRemediation]:
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

                    # 🔽 CARICAMENTO DATI DA FILE JSON OFFLINE
                    self.current_reference_sections = self.offline_reference_data.get(test["id"])
                    if not self.current_reference_sections:
                        self.current_reference_sections = {
                            "summary": "<i>Dati non disponibili offline.</i>",
                            "how-to": "",
                            "tools": [],
                            "remediation": "",
                            "test_objectives": []
                        }

                    self.displayReferenceSection("summary")

                    # COLLEGA I BOTTONI
                    self.btnSummary.clicked.connect(lambda: self.displayReferenceSection("summary"))
                    self.btnHowTo.clicked.connect(lambda: self.displayReferenceSection("how-to"))
                    self.btnTools.clicked.connect(lambda: self.displayReferenceSection("tools"))
                    self.btnRemediation.clicked.connect(lambda: self.displayReferenceSection("remediation"))

                    for btn in [self.btnSummary, self.btnHowTo, self.btnTools, self.btnRemediation]:
                        btn.setChecked(False)
                    self.btnSummary.setChecked(True)

                    for btn in self.referenceButtons:
                        btn.setEnabled(True)
                    return

    def displayReferenceSection(self, section):
        # Reset di tutti i pulsanti SEMPRE, prima di ogni altro controllo
        for btn in self.referenceButtons:
            btn.setChecked(False)

        # Mappa sezione → bottone
        mapping = {
            "summary": self.btnSummary,
            "how-to": self.btnHowTo,
            "tools": self.btnTools,
            "remediation": self.btnRemediation
        }

        # Recupera i contenuti della sezione richiesta
        content = self.current_reference_sections.get(section)

        # Se vuoto o non esiste → messaggio fallback
        if not content or (isinstance(content, str) and not content.strip()):
            self.referenceDetailsBox.setHtml("<i>Sezione vuota o non disponibile.</i>")
        else:
            # Rendi HTML come lista solo se tools / test_objectives sono liste
            if section in ["tools", "test_objectives", "test objectives"] and isinstance(content, list):
                html = "<ul>" + "".join(f"<li>{item}</li>" for item in content) + "</ul>"
            else:
                html = content if isinstance(content, str) else str(content)
            self.referenceDetailsBox.setHtml(html)

        # Imposta il pulsante attuale come selezionato (se esiste)
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
        filepath = os.path.join(os.path.dirname(__file__), SAVES_WSTG_STATE)
        with open(filepath, 'w') as f:
            json.dump(self.status_map, f, indent=4)

        msg = QMessageBox(self)
        msg.setWindowTitle("✅ Salvataggio completato")
        msg.setText(
            "<div style='font-size:15px; font-weight:600; letter-spacing:0.5px;'>"
            "Stato salvato correttamente</div>"
            "<br><div style='font-size:13px; font-weight:400;'>"
            "Il file <code>saves/progress_temp.json</code> è stato aggiornato."
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

