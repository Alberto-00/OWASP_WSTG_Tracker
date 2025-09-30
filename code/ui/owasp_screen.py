import json
import sys
import re

from pathlib import Path
from typing import Dict, Any, Optional, List

from PyQt6.QtCore import Qt, QSize, QPropertyAnimation, QEasingCurve, QSettings
from PyQt6.QtGui import QColor, QTextCharFormat, QFont
from PyQt6.QtWidgets import (QVBoxLayout, QComboBox, QLineEdit, QPushButton,
                             QFileDialog, QMenu, QFrame, QLabel, QProgressBar, QMessageBox,
                             QWidget, QHBoxLayout, QSplitter, QTextEdit,
                             QListWidget, QListWidgetItem, QApplication, QStyledItemDelegate)

# -----------------------------------------------------------------------------
# 1. CONFIGURATION & HELPERS
# -----------------------------------------------------------------------------

class Config:
    """Configurazione centralizzata dell'applicazione"""

    COLORS = {
        'bg_primary': '#2D2F33',
        'bg_secondary': '#373A40',
        'bg_tertiary': '#41454D',
        'accent_primary': '#00C896',
        'accent_secondary': '#77FFCC',
        'text_primary': '#E4E4E4',
        'text_secondary': '#B4B4B4',
        'text_muted': '#8C8C8C',
        'success': '#2E7D57',
        'warning': '#FF9800',
        'error': '#FF4C4C',
        'info': '#80BFFF',
        'purple': '#BB86FC',
    }

    STATUS_CONFIG = {
        'done': {'icon': '✅', 'color': COLORS['success'], 'alpha': 30},
        'in-progress': {'icon': '⏳', 'color': COLORS['purple'], 'alpha': 30},
        'pending': {'icon': '◻', 'color': 'transparent', 'alpha': 0},
    }

    LEVEL_COLORS = {
        'critico': '#ff4c4c',
        'alto': '#ff9800',
        'medio': '#ffc107',
        'basso': '#4caf50',
    }


class FileManager:
    """Gestisce il caricamento e salvataggio dei file JSON"""

    def __init__(self) -> None:
        self.base_path = self._get_base_path()
        self.files = {
            'checklist': self.base_path / 'public' / 'json' / 'checklist.json',
            'info': self.base_path / 'public' / 'json' / 'checklist_info_data.json',
            'categories': self.base_path / 'public' / 'json' / 'category_descriptions.json',
            'owasp_top10': self.base_path / 'public' / 'json' / 'owasp_top_10.json',
            'progress_default': self.base_path / 'public' / 'json' / 'progress.json',
        }

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------
    @staticmethod
    def _get_base_path() -> Path:
        """Compatibile con esecuzione tramite PyInstaller"""
        if hasattr(sys, '_MEIPASS'):
            return Path(sys._MEIPASS)
        return Path(__file__).resolve().parent.parent

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------
    def load_json_from_path(self, path: Path, default: Any = None) -> Any:
        if not path.exists():
            print(f"[FileManager] File non trovato: {path}")
            return default or {}
        try:
            with open(path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as ex:
            print(f"[FileManager] Errore caricamento {path}: {ex}")
            return default or {}

    def save_json(self, data: Any, path: Path) -> bool:
        try:
            path.parent.mkdir(parents=True, exist_ok=True)
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=4, ensure_ascii=False)
            return True
        except Exception as ex:  # noqa: BLE001
            print(f"[FileManager] Errore salvataggio {path}: {ex}")
            return False


class StyleManager:
    """Raggruppa gli stylesheet più lunghi per tenere il codice ordinato"""

    @staticmethod
    def main() -> str:
        c = Config.COLORS
        # utility per trasformare un hex in rgba con alpha (0–1)
        def rgba(hex_color: str, a: float) -> str:
            hex_color = hex_color.lstrip('#')
            r = int(hex_color[0:2], 16)
            g = int(hex_color[2:4], 16)
            b = int(hex_color[4:6], 16)
            return f'rgba({r},{g},{b},{a})'

        return f"""
        /* base -------------------------------------------------------- */
        QWidget {{
            background-color: {c['bg_primary']};
            color: {c['text_primary']};
            font-size: 13px;
            font-family: 'Segoe UI', Arial, sans-serif;
            selection-background-color: {rgba(c['info'], 0.25)};
            selection-color: {c['text_primary']};
        }}
        QToolTip {{
            background-color: {c['bg_secondary']};
            color: {c['text_primary']};
            border: 1px solid {c['bg_tertiary']};
            padding: 4px 8px;
            border-radius: 6px;
        }}

        /* splitter + line -------------------------------------------- */
        QSplitter::handle {{
            background: {c['bg_tertiary']};
            margin: 0 2px;
        }}
        QFrame[frameShape="4"] {{ /* HLine */
            color: {c['bg_tertiary']};
        }}

        /* inputs ------------------------------------------------------ */
        QLineEdit, QComboBox {{
            background-color: {c['bg_secondary']};
            color: {c['text_primary']};
            border: 1px solid {c['bg_tertiary']};
            border-radius: 8px;
            padding: 6px 10px;
        }}
        QLineEdit:hover, QComboBox:hover {{
            border-color: {rgba(c['accent_secondary'], 0.75)};
            background-color: {c['bg_tertiary']};
        }}
        QLineEdit:focus, QComboBox:focus {{
            border-color: {c['accent_primary']};
            background-color: {c['bg_tertiary']};
        }}
        /* popup della combo */
        QComboBox QAbstractItemView {{
            background: {c['bg_secondary']};
            color: {c['text_primary']};
            border: 1px solid {c['bg_tertiary']};
            selection-background-color: {rgba(c['info'], 0.20)};
        }}

        /* bottoni ----------------------------------------------------- */
        QPushButton {{
            background-color: {c['accent_primary']};
            color: #232429;              /* testo scuro per contrasto */
            border: 1px solid {rgba(c['accent_primary'], 0.35)};
            border-radius: 8px;
            padding: 8px 12px;
            font-weight: 600;
        }}
        QPushButton:hover {{
            background-color: {c['accent_secondary']};
        }}
        QPushButton:pressed {{
            background-color: {rgba(c['accent_secondary'], 0.85)};
        }}
        QPushButton:disabled {{
            background: {rgba(c['bg_tertiary'], 0.65)};
            color: {c['text_muted']};
            border-color: {c['bg_tertiary']};
        }}

        /* “tab buttons” (Summary / How-To / Tools / Remediation) ------ */
        QPushButton[variant="tab"] {{
            background: {c['bg_secondary']};
            color: {c['text_primary']};
            border: 1px solid {c['bg_tertiary']};
            border-radius: 10px;
            padding: 8px 14px;
        }}
        QPushButton[variant="tab"]:hover {{
            background: {c['bg_tertiary']};
            border-color: {rgba(c['info'], 0.45)};
        }}
        QPushButton[variant="tab"]:checked {{
            background: {rgba(c['info'], 0.22)};
            border-color: {c['info']};
        }}
        QPushButton[variant="tab"]:disabled {{
            color: {c['text_muted']};
        }}

        /* list -------------------------------------------------------- */
        QListWidget {{
            background-color: {c['bg_secondary']};
            color: {c['text_primary']};
            border: 1px solid {c['bg_tertiary']};
            border-radius: 10px;
            outline: none;
            padding: 6px;
        }}
        QListWidget::item {{
            border: 1px solid transparent;
            padding: 8px 10px;
            margin: 2px 4px;
            border-radius: 8px;
        }}
        QListWidget::item:hover {{
            background-color: {rgba(c['info'], 0.10)};
            border-color: {rgba(c['info'], 0.20)};
        }}
        QListWidget::item:selected {{
            background-color: {rgba(c['info'], 0.22)};
            border-color: {c['info']};
        }}

        /* editors ----------------------------------------------------- */
        QTextEdit {{
            background-color: {c['bg_tertiary']};
            color: {c['text_primary']};
            border: 1px solid {c['bg_tertiary']};
            border-radius: 10px;
            padding: 10px;
        }}

        /* scrollbar unify -------------------------------------------- */
        QScrollBar:vertical, QScrollBar:horizontal {{
            background: {c['bg_secondary']};
            border: none;
            margin: 2px;
        }}
        QScrollBar:vertical {{ width: 10px; }}
        QScrollBar:horizontal {{ height: 10px; }}
        QScrollBar::handle {{
            background: {c['bg_tertiary']};
            border-radius: 6px;
            min-height: 24px;
            min-width: 24px;
        }}
        QScrollBar::handle:hover {{
            background: {rgba(c['accent_primary'], 0.65)};
        }}
        QScrollBar::add-line, QScrollBar::sub-line {{
            background: transparent;
            border: none;
        }}
        """


    @staticmethod
    def progress_bar() -> str:
        c = Config.COLORS
        # Bordo & background con palette, chunk a gradiente dalla palette
        return f"""
        QProgressBar {{
            border: 1px solid {c['bg_tertiary']};
            border-radius: 10px;
            background-color: {c['bg_secondary']};
            color: {c['text_primary']};
            text-align: center;
            padding: 2px;
            font-weight: 600;
        }}
        QProgressBar::chunk {{
            border-radius: 8px;
            margin: 1px;
            background: qlineargradient(x1:0,y1:0,x2:1,y2:0,
                stop:0   {c['accent_primary']},
                stop:0.5 {c['accent_secondary']},
                stop:1   {c['accent_primary']}
            );
        }}
        """

    @staticmethod
    def context_menu() -> str:
        c = Config.COLORS
        return (
            f"QMenu {{ background-color:{c['bg_secondary']}; color:{c['text_primary']}; "
            f"border:1px solid {c['bg_tertiary']}; padding:4px; border-radius:8px; }}"
            f"QMenu::item {{ padding:8px 14px; border-radius:6px; }}"
            f"QMenu::item:selected {{ background-color:rgba(128,191,255,0.20); color:#232429; }}"
        )


class ProgressBarManager:
    """Anima e personalizza la QProgressBar"""

    def __init__(self, bar: QProgressBar) -> None:
        self._bar = bar
        self._setup()

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------
    def _setup(self) -> None:
        self._bar.setMinimum(0)
        self._bar.setMaximum(100)
        self._bar.setValue(0)
        self._bar.setTextVisible(True)
        self._bar.setFixedHeight(28)
        self._bar.setStyleSheet(StyleManager.progress_bar())

        self._anim = QPropertyAnimation(self._bar, b"value")
        self._anim.setDuration(500)
        self._anim.setEasingCurve(QEasingCurve.Type.OutCubic)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------
    def update(self, current: int, total: int, *, animate: bool = True) -> None:
        pct = 0 if total == 0 else round((current / total) * 100, 1)
        if animate:
            self._anim.stop()
            self._anim.setStartValue(self._bar.value())
            self._anim.setEndValue(int(pct))
            self._anim.start()
        else:
            self._bar.setValue(int(pct))

        self._bar.setFormat(f"{current}/{total} completati ({pct}%)")
        self._update_chunk_color(pct)

    # ------------------------------------------------------------------
    # Color helpers
    # ------------------------------------------------------------------
    def _update_chunk_color(self, pct: float) -> None:
        c = Config.COLORS
        if pct == 100:
            start, mid = c['success'], '#4CAF50'
        elif pct >= 75:
            start, mid = '#00A884', '#00C896'
        elif pct >= 50:
            start, mid = '#00796B', '#26A69A'
        elif pct >= 25:
            start, mid = c['warning'], '#FFB74D'
        else:
            start, mid = c['error'], '#FF7043'

        chunk = (
            "QProgressBar::chunk { "
            "background: qlineargradient(x1:0,y1:0,x2:1,y2:0,"
            f"stop:0 {start}, stop:0.5 {mid}, stop:1 {start});"
            "border-radius:6px; margin:1px; }"
        )
        base = re.sub(r"QProgressBar::chunk\s*\{[^}]+}", '', self._bar.styleSheet())
        self._bar.setStyleSheet(base + chunk)


class ColorPreservingDelegate(QStyledItemDelegate):
    def paint(self, painter, option, index):
        fg = index.data(Qt.ItemDataRole.ForegroundRole)
        bg = index.data(Qt.ItemDataRole.BackgroundRole)
        border_color = index.data(Qt.ItemDataRole.UserRole + 1)

        painter.save()

        if bg:
            painter.fillRect(option.rect, bg)

        super().paint(painter, option, index)

        if border_color and border_color != "transparent":
            pen = painter.pen()
            pen.setColor(QColor(border_color))
            pen.setWidth(2)
            painter.setPen(pen)
            r = option.rect.adjusted(1, 1, -2, -2)
            painter.drawRoundedRect(r, 4, 4)

        painter.restore()


# -----------------------------------------------------------------------------
# 2. MAPPING DIALOG
# -----------------------------------------------------------------------------

class MappingDialog(QWidget):
    """Finestra per la visualizzazione del mapping WSTG ↔ OWASP Top-10"""

    # Mapping statico WSTG -> OWASP Top 10
    WSTG_OWASP_MAPPING = {
        'Information Gathering': 'A01, A05, A06',
        'Configuration and Deployment Management Testing': 'A05, A06',
        'Identity Management Testing': 'A07',
        'Authentication Testing': 'A07',
        'Authorization Testing': 'A01',
        'Session Management Testing': 'A07',
        'Input Validation Testing': 'A03, A10',
        'Testing for Error Handling': 'A05',
        'Testing for Weak Cryptography': 'A02, A08',
        'Business Logic Testing': 'A04, A08',
        'Client-side Testing': 'A03, A05',
        'API Testing': 'A01, A03, A05, A06, A10',
    }

    def __init__(self, owasp_data: Dict[str, Any], parent: Optional[QWidget] = None) -> None:
        super().__init__(parent)

        # Lingua corrente (fallback: 'it')
        try:
            self._lang = getattr(parent, 'current_lang', 'it')
        except Exception:
            self._lang = 'it'
        # Verifica che owasp_data sia valido
        if not isinstance(owasp_data, dict):
            raise ValueError("owasp_data deve essere un dizionario")

        self._owasp = owasp_data
        self._list: Optional[QListWidget] = None
        self._detail: Optional[QTextEdit] = None

        self._setup_ui()

    def _extract_fields(self, entry: dict) -> tuple[str, str, str]:
        """Estrae (description, link, level) da un record OWASP sia *flat* sia *multilingua*.
        - Preferisce la lingua corrente (self._lang), con fallback 'it' -> 'en'.
        - Accetta anche file legacy con 'description'/'link' al top-level.
        - 'level' viene letto dal top-level, con fallback alla sezione locale.
        """
        if not isinstance(entry, dict):
            return ("Descrizione non trovata.", "", "medio")

        # Se multilingua
        if 'it' in entry or 'en' in entry:
            sec = entry.get(self._lang) or entry.get('it') or entry.get('en') or {}
        else:
            sec = entry  # struttura flat

        if not isinstance(sec, dict):
            sec = {}

        description = sec.get('description') or entry.get('description') or "Descrizione non trovata."
        link = sec.get('link') or entry.get('link') or ""
        level = entry.get('level') or sec.get('level') or "medio"
        return (description, link, level)

    def _setup_ui(self) -> None:
        """Configura l'interfaccia utente."""
        try:
            self._configure_window()
            self._create_layout()
            self._center_window()
        except Exception as e:
            print(f"Errore nella configurazione UI: {e}")
            raise

    def _configure_window(self) -> None:
        """Configura le proprietà base della finestra."""
        self.setWindowTitle("Mapping WSTG ↔ OWASP Top 10")
        self.resize(1300, 580)  # Usa resize invece di setGeometry

        # Imposta i flag della finestra per avere controlli standard
        self.setWindowFlags(
            Qt.WindowType.Window |  # Finestra normale
            Qt.WindowType.WindowTitleHint |  # Barra del titolo
            Qt.WindowType.WindowSystemMenuHint |  # Menu di sistema
            Qt.WindowType.WindowMinimizeButtonHint |  # Pulsante minimizza
            Qt.WindowType.WindowMaximizeButtonHint |  # Pulsante massimizza
            Qt.WindowType.WindowCloseButtonHint  # Pulsante chiudi
        )

        # Controlla se Config è disponibile prima di usarlo
        try:
            bg_color = Config.COLORS['bg_primary']
        except (NameError, KeyError):
            bg_color = "#2e3137"  # Fallback color

        self.setStyleSheet(f"background-color: {bg_color};")

    def _create_layout(self) -> None:
        """Crea il layout principale con i componenti."""
        layout = QHBoxLayout(self)
        splitter = QSplitter(Qt.Orientation.Horizontal)

        # Tabella HTML
        html_widget = self._create_html_table()

        # Lista OWASP
        self._list = self._create_owasp_list()

        # Dettagli OWASP
        self._detail = self._create_detail_widget()

        # Connetti eventi
        if self._list:
            self._list.currentItemChanged.connect(self._show_detail)

        # Aggiungi widget al splitter
        splitter.addWidget(html_widget)
        splitter.addWidget(self._list)
        splitter.addWidget(self._detail)

        # Configura proporzioni
        splitter.setStretchFactor(0, 3)
        splitter.setStretchFactor(1, 2)
        splitter.setStretchFactor(2, 5)

        layout.addWidget(splitter)

    def _create_html_table(self) -> QTextEdit:
        """Crea il widget per la tabella HTML."""
        html_box = QTextEdit()
        html_box.setReadOnly(True)
        html_box.setHtml(self._build_table_html())
        html_box.setMinimumWidth(475)

        try:
            bg_color = Config.COLORS['bg_secondary']
            text_color = Config.COLORS['text_primary']
        except (NameError, KeyError):
            bg_color = "#3a3b40"
            text_color = "#ffffff"

        html_box.setStyleSheet(
            f"background-color: {bg_color}; color: {text_color};"
        )

        return html_box

    def _create_owasp_list(self) -> QListWidget:
        """Crea la lista degli elementi OWASP."""
        list_widget = QListWidget()
        list_widget.setMinimumWidth(340)

        try:
            bg_color = Config.COLORS['bg_secondary']
            text_color = Config.COLORS['text_primary']
        except (NameError, KeyError):
            bg_color = "#3a3b40"
            text_color = "#ffffff"

        list_widget.setStyleSheet(
            f"background-color: {bg_color}; color: {text_color};"
        )

        # Popola la lista
        for code, entry in self._owasp.items():
            item = QListWidgetItem(code)
            _, _, level = self._extract_fields(entry)
            try:
                color = Config.LEVEL_COLORS.get(level, '#ffffff')
            except (NameError, AttributeError):
                color = '#ffffff'
            item.setForeground(QColor(color))
            item.setSizeHint(QSize(0, 34))
            list_widget.addItem(item)

        return list_widget

    def _create_detail_widget(self) -> QTextEdit:
        """Crea il widget per i dettagli."""
        detail_widget = QTextEdit()
        detail_widget.setReadOnly(True)

        try:
            bg_color = Config.COLORS['bg_tertiary']
            text_color = Config.COLORS['text_primary']
        except (NameError, KeyError):
            bg_color = "#262932"
            text_color = "#ffffff"

        detail_widget.setStyleSheet(
            f"background-color: {bg_color}; color: {text_color}; "
            "font-family: Consolas; font-size: 13px;"
        )

        return detail_widget

    def _build_table_html(self) -> str:
        """Costruisce l'HTML per la tabella di mapping."""
        rows = []
        row_colors = ['rgba(46,49,55,0.7)', 'rgba(38,40,45,0.7)']

        for i, (category, reference) in enumerate(self.WSTG_OWASP_MAPPING.items()):
            rows.append(
                f"<tr style='background-color: {row_colors[i % 2]};'>"
                f"<td style='padding: 10px 8px; color: #dceaf7;'>{self._escape_html(category)}</td>"
                f"<td></td>"
                f"<td style='padding: 10px 8px; color: #e6f2ff;'>{self._escape_html(reference)}</td>"
                "</tr>"
            )

        table_style = (
            "border: 0; cellspacing: 0; cellpadding: 6; "
            "style='border-collapse: collapse; table-layout: fixed; width: 100%; "
            "background-color: rgba(33,34,38,0.95); border: 1px solid #3a3b40; "
            "box-shadow: 0 0 15px rgba(128,191,255,0.3); border-radius: 6px;'"
        )

        return (
                f"<table {table_style}>"
                "<col style='width: 49%; text-align: left;'>"
                "<col style='width: 2%; background-color: rgba(90,170,255,0.2);'>"
                "<col style='width: 49%;'>"
                "<tr style='background-color: rgba(128,191,255,0.12);'>"
                "<th align='left' style='color: #d2eaff; font-size: 15px; padding: 10px 6px;'>Categoria WSTG</th>"
                "<th></th>"
                "<th style='color: #d2eaff; font-size: 15px; padding: 10px 6px;'>OWASP Top 10 (2021)</th>"
                "</tr>"
                + ''.join(rows) +
                "</table>"
        )

    def _show_detail(self, item: Optional[QListWidgetItem]) -> None:
        """
        Mostra i dettagli dell'elemento selezionato.

        Args:
            item: Elemento selezionato nella lista
        """
        if not item or not self._detail:
            return

        try:
            code = item.text()
            entry = self._owasp.get(code, {})

            if not isinstance(entry, dict):
                self._detail.setHtml(f"<p style='color: #ff6b6b;'>Errore: dati non validi per {code}</p>")
                return

            # Estrai campi in modo robusto (multilingua o flat)
            description, link, _level = self._extract_fields(entry)

            # Formatta la descrizione
            formatted_desc = self._format_description(description)

            # Estrai link in modo sicuro
            link = link

            # Costruisci HTML
            html_content = self._build_detail_html(code, formatted_desc, link)
            self._detail.setHtml(html_content)

        except Exception as e:
            if self._detail:
                self._detail.setHtml(f"<p style='color: #ff6b6b;'>Errore nel caricamento dettagli: {e}</p>")

    def _format_description(self, description: str) -> str:
        """
        Formatta la descrizione per l'HTML.

        Args:
            description: Descrizione raw da formattare

        Returns:
            Stringa HTML formattata
        """
        import html, re

        if not isinstance(description, str):
            return "Descrizione non valida."

        # Escaping prima, così evitiamo HTML indesiderato
        formatted = html.escape(description)

        # Bold per **Esempio:** e **Example:**
        formatted = (
            formatted
            .replace('**Esempio:**', '<b style="color: #dddddd;">Esempio:</b><br>')
            .replace('**Example:**', '<b style="color: #dddddd;">Example:</b><br>')
            .replace('\n', '<br>')
        )

        # Regex per codice inline
        formatted = re.sub(
            r"`([^`]+)`",
            r"<code style='background-color: #333; padding: 2px 4px; border-radius: 4px; "
            r"font-family: Consolas; font-size: 12px;'>\1</code>",
            formatted
        )

        return formatted

    def _build_detail_html(self, code: str, description: str, link: str) -> str:
        """
        Costruisce l'HTML per i dettagli.

        Args:
            code: Codice OWASP
            description: Descrizione formattata
            link: Link di riferimento

        Returns:
            Stringa HTML completa
        """
        try:
            info_color = Config.COLORS['info']
            purple_color = Config.COLORS['purple']
        except (NameError, KeyError):
            info_color = "#5dade2"
            purple_color = "#bb86fc"

        html_parts = [
            f"<h3 style='color: {info_color};'>{self._escape_html(code)}</h3>",
            f"<p style='color: #dddddd;'>{description}</p>"
        ]

        if link:
            escaped_link = self._escape_html(link)
            html_parts.append(
                f"<p><a href='{escaped_link}' style='color: {purple_color};'>{escaped_link}</a></p>"
            )

        return ''.join(html_parts)

    def _center_window(self) -> None:
        """Centra la finestra sullo schermo."""
        try:
            # Ottieni la geometria dello schermo
            screen = QApplication.primaryScreen()
            if screen:
                screen_geometry = screen.availableGeometry()

                # Calcola la posizione centrata
                window_geometry = self.frameGeometry()
                center_point = screen_geometry.center()
                window_geometry.moveCenter(center_point)

                # Sposta la finestra
                self.move(window_geometry.topLeft())
            else:
                # Fallback: centra manualmente
                self.move(300, 200)

        except Exception as e:
            print(f"Impossibile centrare la finestra: {e}")
            # Fallback sicuro
            self.move(300, 200)

    @staticmethod
    def _escape_html(text: str) -> str:
        """
        Escape dei caratteri HTML speciali.

        Args:
            text: Testo da escapare

        Returns:
            Testo con caratteri HTML escapati
        """
        if not isinstance(text, str):
            return str(text)

        return (
            text.replace('&', '&amp;')
            .replace('<', '&lt;')
            .replace('>', '&gt;')
            .replace('"', '&quot;')
            .replace("'", '&#x27;')
        )


# -----------------------------------------------------------------------------
# 3. MAIN APPLICATION
# -----------------------------------------------------------------------------

class OWASPChecklistApp(QWidget):
    # ------------------------------------------------------------------
    # Startup helpers
    # ------------------------------------------------------------------
    def _default_progress_path(self) -> Path:
        return self._fm.base_path / 'public' / 'json' / 'progress.json'

    def _saves_dir(self) -> Path:
        return self._fm.base_path / 'public' / 'saves'

    def _load_status_from_path(self, filename: str | Path) -> bool:
        try:
            p = Path(filename)
            if not p.exists():
                raise FileNotFoundError(str(p))
            with open(p, 'r', encoding='utf-8') as f:
                self.status_map = json.load(f)
            self._update_checklist()
            self._progress.update(self._count_completed(), len(self.status_map))
            # Remember last project
            self._last_project_path = str(p)
            self._settings.setValue('last_project_path', self._last_project_path)
            return True
        except Exception as ex:  # noqa: BLE001
            QMessageBox.critical(self, '❌ Errore', f'Errore durante il caricamento: {ex}')
            return False

    def _auto_open_last_or_default(self) -> None:
        # 1) Prova l’ultimo progetto usato
        last = str(self._last_project_path) if self._last_project_path else self._settings.value('last_project_path',
                                                                                                 '')
        if last:
            if self._load_status_from_path(last):
                return

        # 2) Fallback: usa SOLO il file di default "Progress"
        default_p = self._default_progress_path()  # -> public/json/progress.json
        if not default_p.exists():
            # Se non esiste, crealo vuoto (o con lo stato corrente)
            # Qui salvo lo stato attuale (anche vuoto) per avere sempre un "paracadute"
            self._fm.save_json(self.status_map or {}, default_p)

        self._load_status_from_path(default_p)

    """Applicazione principale"""

    # ------------------------------------------------------------------
    # Init & data loading
    # ------------------------------------------------------------------
    def __init__(self) -> None:
        super().__init__()
        self._fm = FileManager()

        # Preferences (persist across runs)
        self._settings = QSettings('AlbertoAltro', 'OWASP WSTG Checklist')
        # Language preference (default to Italian)
        saved_lang = self._settings.value('language', 'it')
        if saved_lang not in ('it', 'en'):
            saved_lang = 'it'
        self.current_lang = saved_lang
        # Last project path
        self._last_project_path = self._settings.value('last_project_path', '')
        # Runtime state
        self.status_map: Dict[str, str] = {}
        self.collapsed_sections: set[str] = set()
        self.current_reference_sections: Dict[str, Any] = {}
        self.reference_buttons: List[QPushButton] = []

        # Lingua
        self.current_lang = 'it'  # default

        # Data
        self._load_data()

        # UI
        self._init_ui()
        self._update_checklist()
        self._progress.update(self._count_completed(), len(self.status_map), animate=False)
        # Open last project or default progress file automatically
        self._auto_open_last_or_default()

    # ------------------------------------------------------------------
    # Data helpers
    # ------------------------------------------------------------------
    def _load_data(self) -> None:
        lang = self.current_lang
        base = self._fm.base_path / 'public' / 'json' / lang
        self.data = self._fm.load_json_from_path(base / 'checklist.json', {})
        self.categories = sorted(self.data.get('categories', {}).keys())
        self.category_desc = self._fm.load_json_from_path(base / 'category_descriptions.json', {})
        self.offline_ref = self._fm.load_json_from_path(base / 'checklist_info_data.json', {})
        self.owasp_top10 = self._fm.load_json_from_path(base / 'owasp_top_10.json', {})

    # ------------------------------------------------------------------
    # UI BUILD
    # ------------------------------------------------------------------
    def _init_ui(self) -> None:
        self.setWindowTitle('OWASP WSTG Checklist')
        self.setGeometry(100, 100, 1300, 700)
        self.setStyleSheet(StyleManager.main())

        root = QVBoxLayout(self)
        root.setContentsMargins(16, 16, 16, 12)
        root.setSpacing(10)

        # -- Progress ---------------------------------------------------
        prog_layout = QHBoxLayout()
        prog_layout.setSpacing(8)
        label = QLabel('📊 Progresso Complessivo:')
        label.setStyleSheet(f"color:{Config.COLORS['text_secondary']};font-weight:bold;font-size:14px;")
        prog_layout.addWidget(label)
        self._bar = QProgressBar()
        self._progress = ProgressBarManager(self._bar)
        prog_layout.addWidget(self._bar)
        root.addLayout(prog_layout)

        # -- Top controls ----------------------------------------------
        top = self._build_top_controls()
        top.setSpacing(8)
        root.addLayout(top)

        # -- Main content ----------------------------------------------
        main = QHBoxLayout()
        main.setSpacing(10)
        main.addWidget(self._build_checklist_widget())
        main.addLayout(self._build_right_panel())
        root.addLayout(main)

        # -- Footer -----------------------------------------------------
        footer_layout = QHBoxLayout()
        footer_layout.setContentsMargins(0, 0, 0, 0)

        # Etichetta di stato
        self._footer = QLabel()
        self._footer.setStyleSheet(f"color:{Config.COLORS['text_muted']};font-size:12px;padding-top:6px;")
        footer_layout.addWidget(self._footer)

        # Selettore lingua
        self._lang_cb = QComboBox()
        self._lang_cb.addItems(['🇮🇹 Italiano', '🇬🇧 English'])
        self._lang_cb.setFixedWidth(150)
        self._lang_cb.currentIndexChanged.connect(self._change_language)
        footer_layout.addWidget(self._lang_cb)
        # Ensure UI reflects saved language (default Italian)
        try:
            idx = 1 if self.current_lang == 'en' else 0
            # Block signal to avoid double reload during init
            self._lang_cb.blockSignals(True)
            self._lang_cb.setCurrentIndex(idx)
            self._lang_cb.blockSignals(False)
        except Exception:
            pass

        root.addLayout(footer_layout)

    # ------------------------------------------------------------------
    # UI sub‑builders
    # ------------------------------------------------------------------
    def _build_top_controls(self) -> QHBoxLayout:
        lay = QHBoxLayout()
        lay.setContentsMargins(0, 0, 0, 0)
        lay.setSpacing(8)

        # Search bar
        self._search = QLineEdit()
        self._search.setPlaceholderText('🔍 Cerca test…')
        self._search.textChanged.connect(self._update_checklist)
        lay.addWidget(self._search)

        # Category dropdown
        self._cat_cb = QComboBox()
        self._cat_cb.addItem('📂 Tutte le Categorie')
        self._cat_cb.addItems(self.categories)
        self._cat_cb.currentIndexChanged.connect(self._update_checklist)
        lay.addWidget(self._cat_cb)

        # Buttons
        for text, cb in [
            ('🧩 Mapping WSTG ↔ OWASP Top 10', self._show_mapping_table),
            ('💾 Salva Stato', self._save_status),
            ('📂 Carica Stato', self._load_status),
        ]:
            b = QPushButton(text)
            b.setFixedHeight(32)
            b.clicked.connect(cb)
            lay.addWidget(b)

        return lay

    def _build_checklist_widget(self) -> QListWidget:
        self._list = QListWidget()
        self._list.setContextMenuPolicy(Qt.ContextMenuPolicy.CustomContextMenu)
        self._list.customContextMenuRequested.connect(self._show_context_menu)
        self._list.itemClicked.connect(self._handle_list_click)
        self._list.currentRowChanged.connect(self._handle_arrow_navigation)
        self._list.setSelectionMode(QListWidget.SelectionMode.ExtendedSelection)
        self._list.setItemDelegate(ColorPreservingDelegate())  # << aggiunto qui
        return self._list

    def _build_right_panel(self) -> QVBoxLayout:
        lay = QVBoxLayout()
        self._detail_box = QTextEdit()
        self._detail_box.setReadOnly(True)
        lay.addWidget(self._detail_box)
        line = QFrame()
        line.setFrameShape(QFrame.Shape.HLine)
        line.setFrameShadow(QFrame.Shadow.Sunken)
        lay.addWidget(line)
        self._ref_box = QTextEdit()
        self._ref_box.setReadOnly(True)
        lay.addWidget(self._ref_box)
        lay.addLayout(self._build_reference_tabs())
        return lay

    def _build_reference_tabs(self) -> QHBoxLayout:
        lay = QHBoxLayout()
        self.reference_buttons.clear()
        for text, section in [
            ('📄 Summary', 'summary'),
            ('🔍 How‑To', 'how-to'),
            ('🛠 Tools', 'tools'),
            ('🛡 Remediation', 'remediation'),
        ]:
            b = QPushButton(text)
            b.setFixedSize(160, 40)
            b.setCheckable(True)
            b.setEnabled(False)
            b.setCursor(Qt.CursorShape.PointingHandCursor)
            b.setProperty('variant', 'tab')  # <— usa lo stylesheet globale
            b.clicked.connect(lambda _chk, s=section: self._display_reference_section(s))
            self.reference_buttons.append(b)
            lay.addWidget(b)
        return lay

    # ------------------------------------------------------------------
    # CHECKLIST RENDERING
    # ------------------------------------------------------------------
    def _update_checklist(self) -> None:
        # Ensure every test has a status
        for cat, details in self.data.get('categories', {}).items():
            for test in details.get('tests', []):
                self.status_map.setdefault(test['id'], 'pending')

        self._list.clear()
        cat_sel = self._cat_cb.currentText()
        query = self._search.text().strip().lower()

        if cat_sel != '📂 Tutte le Categorie':
            self._render_single_category(cat_sel, query)
        else:
            self._render_all_categories(query)

        self._update_footer_status()

    # Single category
    def _render_single_category(self, category: str, query: str) -> None:
        if category not in self.data.get('categories', {}):
            return
        cat_data = self.data['categories'][category]
        title = QListWidgetItem(f"{category}:")
        title.setFont(QFont('Segoe UI', 12, QFont.Weight.Bold))
        title.setForeground(QColor(self._get_category_color(cat_data)))
        title.setFlags(Qt.ItemFlag.NoItemFlags)
        self._list.addItem(title)
        self._show_category_description(category)
        self._render_tests(cat_data, query)

    # All categories
    def _render_all_categories(self, query: str) -> None:
        for category, details in self.data.get('categories', {}).items():
            spacer = QListWidgetItem('')
            spacer.setSizeHint(QSize(0, 16))
            spacer.setFlags(Qt.ItemFlag.NoItemFlags)
            self._list.addItem(spacer)
            arrow = '▼' if category not in self.collapsed_sections else '▶'
            header = QListWidgetItem(f"{arrow} {category}")
            header.setSizeHint(QSize(0, 28))
            header.setFont(QFont('Segoe UI', 0, QFont.Weight.Bold))
            header.setData(Qt.ItemDataRole.UserRole, f"_header_{category}")
            header.setForeground(QColor(self._get_category_color(details)))
            self._list.addItem(header)
            if category not in self.collapsed_sections:
                self._render_tests(details, query)

    # Tests inside a category
    def _render_tests(self, cat_data: Dict[str, Any], query: str) -> None:
        for test in cat_data.get('tests', []):
            if not query or query in test['name'].lower() or query in test['id'].lower():
                self._add_test_item(test)

    def _add_test_item(self, test: Dict[str, Any]) -> None:
        tid = test['id']
        status = self.status_map.get(tid, 'pending')
        conf = Config.STATUS_CONFIG[status]
        title = f"{conf['icon']} {tid} - {test['name']}"
        item = QListWidgetItem(title)

        if status == 'done':
            # ✅ Completato
            fg = QColor(Config.COLORS['accent_primary'])
            bg = QColor(Config.COLORS['success'])
            bg.setAlpha(30)
            border = Config.COLORS['success']
        elif status == 'in-progress':
            # ⏳ In Corso
            fg = QColor(Config.COLORS['purple'])
            bg = QColor(Config.COLORS['purple'])
            bg.setAlpha(30)
            border = Config.COLORS['purple']
        else:
            # ◻ Pending (trasparente)
            fg = QColor(Config.COLORS['text_primary'])
            bg = QColor(0, 0, 0, 0)
            border = 'transparent'

        item.setForeground(fg)
        item.setBackground(bg)
        item.setData(Qt.ItemDataRole.UserRole + 1, border)
        item.setData(Qt.ItemDataRole.UserRole, tid)
        item.setSizeHint(QSize(0, 28))
        self._list.addItem(item)

    # ------------------------------------------------------------------
    # STATUS / COLOR HELPERS
    # ------------------------------------------------------------------
    def _get_category_color(self, cat_data: Dict[str, Any]) -> str:
        statuses = [self.status_map.get(t['id'], 'pending') for t in cat_data.get('tests', [])]
        if any(s == 'in-progress' for s in statuses):
            return Config.COLORS['purple']
        if any(s == 'done' for s in statuses):
            return Config.COLORS['accent_primary']
        return Config.COLORS['info']

    def _count_completed(self) -> int:
        return sum(1 for s in self.status_map.values() if s == 'done')

    # ------------------------------------------------------------------
    # FOOTER / PROGRESS -------------------------------------------------
    # ------------------------------------------------------------------
    def _update_footer_status(self) -> None:
        done = self._count_completed()
        in_prog = sum(1 for s in self.status_map.values() if s == 'in-progress')
        pending = sum(1 for s in self.status_map.values() if s == 'pending')
        self._progress.update(done, len(self.status_map))
        self._footer.setText(f"🔲 Non Fatto: {pending}   ⏳ In Corso: {in_prog}   ✅ Completati: {done}")

    # ------------------------------------------------------------------
    # FOOTER / LANGUAGE -------------------------------------------------
    # ------------------------------------------------------------------
    def _change_language(self) -> None:
        new_lang = 'it' if self._lang_cb.currentIndex() == 0 else 'en'
        if new_lang != self.current_lang:
            self.current_lang = new_lang
            # persist
            try:
                self._settings.setValue('language', self.current_lang)
            except Exception:
                pass
            self._load_data()
            self._update_checklist()

    # ------------------------------------------------------------------
    # LIST INTERACTION --------------------------------------------------
    # ------------------------------------------------------------------
    def _handle_list_click(self, item: QListWidgetItem) -> None:
        data = item.data(Qt.ItemDataRole.UserRole)
        cat_sel = self._cat_cb.currentText()
        if isinstance(data, str) and data.startswith('_header_'):
            cat = data.replace('_header_', '')
            self._toggle_category_collapse(cat)
            self._show_category_description(cat)
        elif cat_sel != '📂 Tutte le Categorie' and item.text().strip().endswith(':'):
            self._show_category_description(cat_sel)
        elif isinstance(data, str):
            self._show_test_details(data)

    def _toggle_category_collapse(self, category: str) -> None:
        if category in self.collapsed_sections:
            self.collapsed_sections.remove(category)
        else:
            self.collapsed_sections.add(category)
        self._update_checklist()

    def _handle_arrow_navigation(self, idx: int) -> None:
        itm = self._list.item(idx)
        if itm:
            data = itm.data(Qt.ItemDataRole.UserRole)
            if isinstance(data, str) and not data.startswith('_header_'):
                self._show_test_details(data)

    # ------------------------------------------------------------------
    # DETAIL / REFERENCE SECTIONS
    # ------------------------------------------------------------------
    def _show_category_description(self, category: str) -> None:
        self._detail_box.clear()
        cur = self._detail_box.textCursor()
        title_fmt = QTextCharFormat()
        title_fmt.setFontWeight(QFont.Weight.Bold)
        title_fmt.setForeground(QColor(Config.COLORS['info']))
        cur.insertText(f"📂 Category: {category}\n\n", title_fmt)
        desc_fmt = QTextCharFormat()
        desc_fmt.setForeground(QColor('#e0e0e0'))
        cur.insertText(
            self.category_desc.get(category, '').strip() or 'No description available for this category.' + '\n\n',
            desc_fmt)

        self._ref_box.setHtml('<i>Seleziona un test per visualizzare i dettagli.</i>')
        for b in self.reference_buttons:
            b.setEnabled(False)
            b.setChecked(False)

    def _show_test_details(self, tid: str) -> None:
        res = self._find_test_by_id(tid)
        if not res:
            return
        test, category = res
        self._detail_box.clear()
        cur = self._detail_box.textCursor()
        bold = QTextCharFormat()
        bold.setFontWeight(QFont.Weight.Bold)
        bold.setForeground(QColor('#ff80ab'))
        cur.insertText(f"📌 Category: {category}\n\n", bold)
        cur.insertText(f"🆔 ID: {test['id']}\n\n", bold)
        if 'objectives' in test:
            cur.insertText('🎯 Test Objectives:', bold)
            html = '<ul style="color:#ff80ab">' + ''.join(
                f'<li style="margin-bottom:10px">{o}</li>' for o in test['objectives']) + '</ul><br>'
            cur.insertHtml(html)
        cur.insertText('🔗 Reference: ', bold)
        cur.insertHtml(f"<a href='{test['reference']}' style='color:#ff80ab;'>{test['reference']}</a>\n\n")

        self.current_reference_sections = self.offline_ref.get(tid, {
            'summary': '<i>Dati non disponibili offline.</i>', 'how-to': '', 'tools': [], 'remediation': ''
        })
        for b in self.reference_buttons: b.setEnabled(True); b.setChecked(False)
        self.reference_buttons[0].setChecked(True)
        self._display_reference_section('summary')

    def _find_test_by_id(self, tid: str) -> List[Any] | None:
        for cat, details in self.data.get('categories', {}).items():
            for test in details.get('tests', []):
                if test['id'] == tid:
                    return [test, cat]
        return None

    def _display_reference_section(self, section: str) -> None:
        for b in self.reference_buttons: b.setChecked(False)
        idx_map = {'summary': 0, 'how-to': 1, 'tools': 2, 'remediation': 3}
        if section in idx_map: self.reference_buttons[idx_map[section]].setChecked(True)
        content = self.current_reference_sections.get(section, '')
        if not content or (isinstance(content, str) and not content.strip()):
            self._ref_box.setHtml('<i>Sezione vuota o non disponibile.</i>')
            return
        if isinstance(content, list):
            html = '<ul>' + ''.join(f'<li>{i}</li>' for i in content) + '</ul>'
        else:
            html = str(content)
        self._ref_box.setHtml(html)

    # ------------------------------------------------------------------
    # CONTEXT MENU / BATCH STATUS
    # ------------------------------------------------------------------
    def set_status_batch(self, status: str) -> None:
        changed = 0
        for i in range(self._list.count()):
            itm = self._list.item(i)
            if itm.isSelected():
                tid = itm.data(Qt.ItemDataRole.UserRole)
                if isinstance(tid, str) and not tid.startswith('_header_') and self.status_map.get(tid) != status:
                    self.status_map[tid] = status
                    changed += 1
        if changed:
            self._update_checklist()

    def _show_context_menu(self, pos) -> None:
        itm = self._list.itemAt(pos)
        if not itm:
            return
        menu = QMenu(self)
        menu.setStyleSheet(StyleManager.context_menu())
        if self._cat_cb.currentText() == '📂 Tutte le Categorie':
            menu.addAction('▶ Collassa Tutto', lambda: self.collapse_all(True))
            menu.addAction('▼ Espandi Tutto', lambda: self.collapse_all(False))
            menu.addSeparator()
        menu.addAction('✅ Imposta Selezionati Completati', lambda: self.set_status_batch('done'))
        menu.addAction('⏳ Imposta Selezionati In Corso', lambda: self.set_status_batch('in-progress'))
        menu.addAction('◻ Imposta Selezionati Non Fatto', lambda: self.set_status_batch('pending'))
        menu.exec(self._list.mapToGlobal(pos))

    def collapse_all(self, collapse: bool) -> None:
        if collapse:
            self.collapsed_sections = set(self.data.get('categories', {}).keys())
        else:
            self.collapsed_sections.clear()
        self._update_checklist()

    # ------------------------------------------------------------------
    # SAVE / LOAD STATUS
    # ------------------------------------------------------------------
    def _save_status(self) -> None:
        # Always ask where to save; prefill with last path or default
        last = self._last_project_path or self._settings.value('last_project_path', '')
        if last:
            default_file = str(last)
        else:
            self._saves_dir().mkdir(parents=True, exist_ok=True)
            default_file = str(self._saves_dir() / 'progress.json')

        filename, _ = QFileDialog.getSaveFileName(self, 'Salva stato', default_file, 'JSON Files (*.json)')
        if not filename:
            return

        ok = self._fm.save_json(self.status_map, Path(filename))
        if ok:
            # Remember last used file (save)
            self._last_project_path = filename
            self._settings.setValue('last_project_path', filename)
            QMessageBox.information(self, '✅ Salvataggio completato', f'Stato salvato in:\n{filename}')
        else:
            QMessageBox.critical(self, '❌ Errore', 'Errore durante il salvataggio')

    def _load_status(self) -> None:
        last = self._last_project_path or self._settings.value('last_project_path', '')
        start_dir = str(last) if last else ''
        filename, _ = QFileDialog.getOpenFileName(self, 'Carica stato', start_dir, 'JSON Files (*.json)')
        if not filename:
            return
        if self._load_status_from_path(filename):
            # Remember last used file (load)
            self._last_project_path = filename
            self._settings.setValue('last_project_path', filename)
            QMessageBox.information(self, '✅ Caricamento completato', 'Stato caricato correttamente')

    # ------------------------------------------------------------------
    # MAPPING DIALOG
    # ------------------------------------------------------------------
    def _show_mapping_table(self) -> None:
        dlg = MappingDialog(self.owasp_top10, self)
        dlg.show()
        dlg.raise_()
        dlg.activateWindow()