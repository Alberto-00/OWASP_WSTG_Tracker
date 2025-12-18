import json
import sys
import re

from pathlib import Path
from typing import Dict, Any, Optional, List

from PyQt6.QtCore import Qt, QSize, QPropertyAnimation, QEasingCurve, QSettings
from PyQt6.QtGui import QColor, QTextCharFormat, QFont, QShortcut, QKeySequence, QCloseEvent, QPainter
from PyQt6.QtWidgets import (QVBoxLayout, QComboBox, QLineEdit, QPushButton,
                             QFileDialog, QMenu, QFrame, QLabel, QProgressBar,
                             QWidget, QHBoxLayout, QSplitter, QTextEdit,
                             QListWidget, QListWidgetItem, QApplication, QStyledItemDelegate,
                             QStyleOptionViewItem, QStyle)

from ui.custom_message_box import CustomMessageBox
from css.theme import Theme
from css.styles import Styles

# -----------------------------------------------------------------------------
# VERSION
# -----------------------------------------------------------------------------
__version__ = "1.1.0"

# -----------------------------------------------------------------------------
# 1. CONFIGURATION & HELPERS (usa Theme dal design system)
# -----------------------------------------------------------------------------

# Alias per compatibilita con codice esistente
Config = Theme


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

    @staticmethod
    def _get_base_path() -> Path:
        """Compatibile con esecuzione tramite PyInstaller"""
        if hasattr(sys, '_MEIPASS'):
            return Path(sys._MEIPASS)
        return Path(__file__).resolve().parent.parent

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
        except Exception as ex:
            print(f"[FileManager] Errore salvataggio {path}: {ex}")
            return False


StyleManager = Styles


class ProgressBarManager:
    """Anima e personalizza la QProgressBar"""

    def __init__(self, bar: QProgressBar) -> None:
        self._bar = bar
        self._setup()

    def _setup(self) -> None:
        self._bar.setMinimum(0)
        self._bar.setMaximum(100)
        self._bar.setValue(0)
        self._bar.setTextVisible(True)
        self._bar.setFixedHeight(32)  # Era 28
        self._bar.setStyleSheet(StyleManager.progress_bar())

        self._anim = QPropertyAnimation(self._bar, b"value")
        self._anim.setDuration(600)  # Era 500
        self._anim.setEasingCurve(QEasingCurve.Type.OutCubic)

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

    def _update_chunk_color(self, pct: float) -> None:
        c = Config.COLORS
        if pct == 100:
            start, mid, end = c['success'], c['success_dark'], c['success']
        elif pct >= 75:
            start, mid, end = c['accent_primary'], c['accent_secondary'], c['accent_glow']
        elif pct >= 50:
            start, mid, end = '#3b82f6', '#6366f1', '#8b5cf6'
        elif pct >= 25:
            start, mid, end = c['warning'], '#fb923c', c['warning']
        else:
            start, mid, end = c['error'], '#f87171', c['error']

        chunk = (
            "QProgressBar::chunk { "
            "background: qlineargradient(x1:0,y1:0,x2:1,y2:0,"
            f"stop:0 {start}, stop:0.5 {mid}, stop:1 {end});"
            "border-radius:10px; margin:2px; }"  # Era 6px e 1px
        )
        base = re.sub(r"QProgressBar::chunk\s*\{[^}]+}", '', self._bar.styleSheet())
        self._bar.setStyleSheet(base + chunk)


class ColorPreservingDelegate(QStyledItemDelegate):
    def paint(self, painter, option, index):
        painter.save()
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)

        # Stati dell'item
        is_selected = option.state & QStyle.StateFlag.State_Selected
        is_hovered = option.state & QStyle.StateFlag.State_MouseOver

        # Recupera TUTTI i dati dall'item
        fg = index.data(Qt.ItemDataRole.ForegroundRole)
        bg_default = index.data(Qt.ItemDataRole.BackgroundRole)
        border_default = index.data(Qt.ItemDataRole.UserRole + 1)
        border_w_default = index.data(Qt.ItemDataRole.UserRole + 2) or 0

        # Dati per selezionato/hover
        bg_selected = index.data(Qt.ItemDataRole.UserRole + 3)
        border_selected = index.data(Qt.ItemDataRole.UserRole + 4)
        border_w_selected = index.data(Qt.ItemDataRole.UserRole + 5)

        # Decidi quale usare
        use_bg = bg_default
        use_border = border_default
        use_border_w = border_w_default

        if is_selected or is_hovered:
            # Usa i colori di selezione se disponibili
            if bg_selected:
                use_bg = QColor(bg_selected)

                if is_selected and is_hovered:
                    # Più intenso
                    alpha = use_bg.alpha()
                    use_bg.setAlpha(min(255, int(alpha * 1.6)))
                elif is_hovered:
                    # Medio
                    alpha = use_bg.alpha()
                    use_bg.setAlpha(min(255, int(alpha * 0.8)))

            if border_selected:
                use_border = border_selected

            if border_w_selected is not None:
                use_border_w = border_w_selected

        # Geometria
        radius = 8
        rect = option.rect.adjusted(2, 2, -2, -2)

        # 1) BACKGROUND
        if use_bg:
            if isinstance(use_bg, QColor) and use_bg.alpha() > 0:
                painter.setPen(Qt.PenStyle.NoPen)
                painter.setBrush(use_bg)
                painter.drawRoundedRect(rect, radius, radius)

        # 2) TESTO (disegno standard)
        opt = QStyleOptionViewItem(option)
        opt.state &= ~QStyle.StateFlag.State_Selected  # Rimuovi highlight
        super().paint(painter, opt, index)

        # 3) BORDO (SEMPRE ALLA FINE, SOPRA TUTTO)
        if use_border and use_border != "transparent" and use_border_w > 0:
            pen = painter.pen()
            pen.setColor(QColor(use_border))
            pen.setWidth(int(use_border_w))
            pen.setStyle(Qt.PenStyle.SolidLine)
            painter.setPen(pen)
            painter.setBrush(Qt.BrushStyle.NoBrush)
            painter.drawRoundedRect(rect, radius, radius)

        painter.restore()


# -----------------------------------------------------------------------------
# 2. MAPPING DIALOG
# -----------------------------------------------------------------------------

class MappingDialog(QWidget):
    """Finestra per la visualizzazione del mapping WSTG ↔ OWASP Top-10"""

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

        try:
            self._lang = getattr(parent, 'current_lang', 'it')
        except Exception:
            self._lang = 'it'

        if not isinstance(owasp_data, dict):
            raise ValueError("owasp_data deve essere un dizionario")

        self._owasp = owasp_data
        self._list: Optional[QListWidget] = None
        self._detail: Optional[QTextEdit] = None

        self._setup_ui()

    def _extract_fields(self, entry: dict) -> tuple[str, str, str]:
        if not isinstance(entry, dict):
            return "Descrizione non trovata.", "", "medio"

        if 'it' in entry or 'en' in entry:
            sec = entry.get(self._lang) or entry.get('it') or entry.get('en') or {}
        else:
            sec = entry

        if not isinstance(sec, dict):
            sec = {}

        description = sec.get('description') or entry.get('description') or "Descrizione non trovata."
        link = sec.get('link') or entry.get('link') or ""
        level = entry.get('level') or sec.get('level') or "medio"
        return description, link, level

    def _setup_ui(self) -> None:
        try:
            self._configure_window()
            self._create_layout()
            self._center_window()
        except Exception as e:
            print(f"Errore nella configurazione UI: {e}")
            raise

    def _configure_window(self) -> None:
        self.setWindowTitle("Mapping WSTG ↔ OWASP Top 10")
        self.resize(1400, 650)
        self.setObjectName("mappingDialog")

        self.setWindowFlags(
            Qt.WindowType.Window |
            Qt.WindowType.WindowTitleHint |
            Qt.WindowType.WindowSystemMenuHint |
            Qt.WindowType.WindowMinimizeButtonHint |
            Qt.WindowType.WindowMaximizeButtonHint |
            Qt.WindowType.WindowCloseButtonHint
        )

        self.setStyleSheet(StyleManager.mapping_dialog())

    def _create_layout(self) -> None:
        layout = QHBoxLayout(self)
        layout.setContentsMargins(16, 16, 16, 16)
        layout.setSpacing(12)

        splitter = QSplitter(Qt.Orientation.Horizontal)
        splitter.setHandleWidth(6)

        html_widget = self._create_html_table()
        self._list = self._create_owasp_list()
        self._detail = self._create_detail_widget()

        if self._list:
            self._list.currentItemChanged.connect(self._show_detail)

        splitter.addWidget(html_widget)
        splitter.addWidget(self._list)
        splitter.addWidget(self._detail)

        splitter.setStretchFactor(0, 3)
        splitter.setStretchFactor(1, 2)
        splitter.setStretchFactor(2, 5)

        layout.addWidget(splitter)

    def _create_html_table(self) -> QTextEdit:
        html_box = QTextEdit()
        html_box.setObjectName("mappingHtmlBox")
        html_box.setReadOnly(True)
        html_box.setHtml(self._build_table_html())
        html_box.setMinimumWidth(550)
        return html_box

    def _create_owasp_list(self) -> QListWidget:
        list_widget = QListWidget()
        list_widget.setObjectName("mappingOwaspList")
        list_widget.setMinimumWidth(360)
        list_widget.setItemDelegate(ColorPreservingDelegate(list_widget))

        for code, entry in self._owasp.items():
            item = QListWidgetItem(code)
            _, _, level = self._extract_fields(entry)

            # Ottieni colore severity
            try:
                severity_color = Config.LEVEL_COLORS.get(level, '#e5e7eb')
            except (NameError, AttributeError):
                severity_color = '#e5e7eb'

            # TESTO COLORATO
            item.setForeground(QColor(severity_color))

            # BACKGROUND normale (trasparente)
            item.setBackground(QColor(0, 0, 0, 0))
            item.setData(Qt.ItemDataRole.UserRole + 1, 'transparent')
            item.setData(Qt.ItemDataRole.UserRole + 2, 0)

            # BACKGROUND e BORDO per hover/selected (basati su severity)
            selected_bg = QColor(severity_color)
            selected_bg.setAlpha(int(255 * 0.18))  # 18% opacità
            item.setData(Qt.ItemDataRole.UserRole + 3, selected_bg)
            item.setData(Qt.ItemDataRole.UserRole + 4, severity_color)  # Bordo colorato
            item.setData(Qt.ItemDataRole.UserRole + 5, 2)  # Spessore bordo

            item.setSizeHint(QSize(0, 38))
            list_widget.addItem(item)

        return list_widget

    def _create_detail_widget(self) -> QTextEdit:
        detail_widget = QTextEdit()
        detail_widget.setObjectName("mappingDetailBox")
        detail_widget.setReadOnly(True)
        detail_widget.setMinimumWidth(400)
        return detail_widget

    def _build_table_html(self) -> str:
        rows = []
        row_colors = ['rgba(38, 40, 47, 1)', 'rgba(30, 32, 40, 1)']  # imposta lo zebra color

        for i, (category, reference) in enumerate(self.WSTG_OWASP_MAPPING.items()):
            rows.append(
                f"<tr style='background-color: {row_colors[i % 2]};'>"
                f"<td style='padding: 12px 10px; color: #e5e7eb;'>{self._escape_html(category)}</td>"
                f"<td></td>"
                f"<td style='padding: 12px 10px; color: #a78bfa;'>{self._escape_html(reference)}</td>"
                "</tr>"
            )

        table_style = (
            "border: 0; cellspacing: 0; cellpadding: 8; "
            "style='border-collapse: collapse; table-layout: fixed; width: 100%; "
            "background-color: rgba(26, 28, 36, 0.95); border: 1.5px solid #374151; "
            "box-shadow: 0 4px 20px rgba(99, 102, 241, 0.15); border-radius: 12px;'"
        )

        return (
                f"<table {table_style}>"
                "<col style='width:49%; text-align:left;'>"
                "<col style='width:2%; background-color:#6366f1;'>"  # barra separatrice solida
                "<col style='width:49%;'>"
                "<tr style='background-color:#1A1B20;'>"  # header solido scuro
                "<th align='left' style='color:#e5e7eb; font-size:15px; padding:14px 8px; font-weight:600;'>Categoria WSTG</th>"
                "<th></th>"
                "<th style='color:#e5e7eb; font-size:15px; padding:14px 8px; font-weight:600;'>OWASP Top 10 (2021)</th>"
                "</tr>"
                + ''.join(rows) +
                "</table>"
        )

    def _show_detail(self, item: Optional[QListWidgetItem]) -> None:
        if not item or not self._detail:
            return

        try:
            code = item.text()
            entry = self._owasp.get(code, {})

            if not isinstance(entry, dict):
                self._detail.setHtml(f"<p style='color: #ef4444;'>Errore: dati non validi per {code}</p>")
                return

            description, link, _level = self._extract_fields(entry)
            formatted_desc = self._format_description(description)
            html_content = self._build_detail_html(code, formatted_desc, link)
            self._detail.setHtml(html_content)

        except Exception as e:
            if self._detail:
                self._detail.setHtml(f"<p style='color: #ef4444;'>Errore nel caricamento dettagli: {e}</p>")

    def _format_description(self, description: str) -> str:
        import html, re

        if not isinstance(description, str):
            return "Descrizione non valida."

        formatted = html.escape(description)

        formatted = (
            formatted
            .replace('**Esempio:**', '<b style="color: #e5e7eb;">Esempio:</b><br>')
            .replace('**Example:**', '<b style="color: #e5e7eb;">Example:</b><br>')
            .replace('\n', '<br>')
        )

        formatted = re.sub(
            r"`([^`]+)`",
            r"<code style='background-color: #1E1F24; padding: 3px 6px; border-radius: 6px; "
            r"font-family: \"SF Mono\", Consolas; font-size: 12px;'>\1</code>",
            formatted
        )

        return formatted

    def _build_detail_html(self, code: str, description: str, link: str) -> str:
        try:
            info_color = Config.COLORS['info']
            purple_color = Config.COLORS['accent_glow']
        except (NameError, KeyError):
            info_color = "#6366f1"
            purple_color = "#a78bfa"

        html_parts = [
            f"<h3 style='color: {info_color}; font-weight: 600; "
            f"margin: 2px 0 6px 0;'>{self._escape_html(code)}</h3>",
            f"<p style='color: #e5e7eb; margin: 0 0 6px 0;'>{description}</p>"
        ]

        if link:
            escaped_link = self._escape_html(link)
            html_parts.append(
                f"<p><a href='{escaped_link}' style='color: {purple_color};'>{escaped_link}</a></p>"
            )

        return ''.join(html_parts)

    def _center_window(self) -> None:
        try:
            screen = QApplication.primaryScreen()
            if screen:
                screen_geometry = screen.availableGeometry()
                window_geometry = self.frameGeometry()
                center_point = screen_geometry.center()
                window_geometry.moveCenter(center_point)
                self.move(window_geometry.topLeft())
            else:
                self.move(300, 200)
        except Exception as e:
            print(f"Impossibile centrare la finestra: {e}")
            self.move(300, 200)

    @staticmethod
    def _escape_html(text: str) -> str:
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
                data = json.load(f)

            # Carica solo il nuovo formato (status + notes)
            if not isinstance(data, dict) or 'status' not in data:
                raise ValueError("Formato file non valido. Il file deve contenere 'status' e 'notes'.")

            self.status_map = data.get('status', {})
            self.notes_map = data.get('notes', {})

            self._saved_status_snapshot = dict(self.status_map)
            self._dirty = False
            self._update_checklist()
            self._progress.update(self._count_completed(), len(self.status_map))
            # Remember last project
            self._last_project_path = str(p)
            self._settings.setValue('last_project_path', self._last_project_path)
            return True
        except Exception as ex:  # noqa: BLE001
            CustomMessageBox.danger(
                self,
                '❌ Errore',
                f'Errore durante il caricamento:\n{ex}',
                confirm_text='OK'
            )
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
        self.notes_map: Dict[str, str] = {}  # Note per ogni test
        self.collapsed_sections: set[str] = set()
        self.current_reference_sections: Dict[str, Any] = {}
        self.reference_buttons: List[QPushButton] = []
        self._dirty = False  # Flag per modifiche non salvate
        self._saved_status_snapshot: Dict[str, str] = {}  # Snapshot per confronto

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
        self.categories = self.data.get('categories', {}).keys()
        self.category_desc = self._fm.load_json_from_path(base / 'category_descriptions.json', {})
        self.offline_ref = self._fm.load_json_from_path(base / 'checklist_info_data.json', {})
        self.owasp_top10 = self._fm.load_json_from_path(base / 'owasp_top_10.json', {})

    # ------------------------------------------------------------------
    # UI BUILD
    # ------------------------------------------------------------------
    def _init_ui(self) -> None:
        self.setWindowTitle(f'OWASP WSTG Checklist v{__version__}')
        self.setGeometry(100, 100, 1300, 750)
        self.setStyleSheet(StyleManager.main())

        root = QVBoxLayout(self)
        root.setContentsMargins(16, 16, 16, 16)
        root.setSpacing(12)

        # -- Progress ---------------------------------------------------
        prog_layout = QHBoxLayout()
        prog_layout.setSpacing(8)
        label = QLabel('📊 Progresso Complessivo:')
        label.setObjectName("progressLabel")
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
        main_splitter = QSplitter(Qt.Orientation.Horizontal)
        main_splitter.setHandleWidth(1)

        # PANNELLO SINISTRO: Lista WSTG
        left_widget = self._build_checklist_widget()
        left_widget.setMinimumWidth(620)

        # PANNELLO DESTRO: Dettagli e riferimenti
        right_widget = QWidget()
        right_layout = self._build_right_panel()
        right_layout.setContentsMargins(10, 0, 0, 0) # SEPARAZIONE pannelli sinistra e destra
        right_widget.setLayout(right_layout)
        right_widget.setMinimumWidth(700)

        # Aggiungi al splitter
        main_splitter.addWidget(left_widget)
        main_splitter.addWidget(right_widget)

        # PROPORZIONI INIZIALI: 60% sinistra, 40% destra
        main_splitter.setStretchFactor(0, 60)
        main_splitter.setStretchFactor(1, 40)

        # Abilita ridimensionamento live (opzionale, default è True)
        main_splitter.setOpaqueResize(True)

        root.addWidget(main_splitter)

        # -- Footer -----------------------------------------------------
        footer_layout = QHBoxLayout()
        footer_layout.setContentsMargins(0, 0, 0, 0)

        # Etichetta di stato
        self._footer = QLabel()
        self._footer.setObjectName("footerLabel")
        footer_layout.addWidget(self._footer)

        # Shortcut hint
        shortcut_hint = QLabel('⌨ Ctrl+S Salva | Ctrl+O Carica | Ctrl+F Cerca | Space Cambia stato')
        shortcut_hint.setObjectName("shortcutHint")
        footer_layout.addWidget(shortcut_hint)

        footer_layout.addStretch()

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

        # -- Keyboard shortcuts -----------------------------------------
        self._setup_shortcuts()

    def _setup_shortcuts(self) -> None:
        """Configura le shortcut da tastiera"""
        # Ctrl+S → Salva
        QShortcut(QKeySequence("Ctrl+S"), self, self._save_status)
        # Ctrl+O → Carica
        QShortcut(QKeySequence("Ctrl+O"), self, self._load_status)
        # Ctrl+F → Focus su ricerca
        QShortcut(QKeySequence("Ctrl+F"), self, lambda: self._search.setFocus())
        # Ctrl+E → Espandi tutto
        QShortcut(QKeySequence("Ctrl+E"), self, lambda: self.collapse_all(False))
        # Ctrl+W → Collassa tutto
        QShortcut(QKeySequence("Ctrl+W"), self, lambda: self.collapse_all(True))
        # Space → Toggle stato test selezionato
        QShortcut(QKeySequence("Space"), self, self._toggle_selected_status)

    def _toggle_selected_status(self) -> None:
        """Cicla lo stato del test selezionato: pending → in-progress → done → pending"""
        items = self._list.selectedItems()
        if not items:
            return
        status_cycle = ['pending', 'in-progress', 'done']
        changed = False
        for item in items:
            tid = item.data(Qt.ItemDataRole.UserRole)
            if isinstance(tid, str) and not tid.startswith('_header_'):
                current = self.status_map.get(tid, 'pending')
                try:
                    idx = status_cycle.index(current)
                    new_status = status_cycle[(idx + 1) % 3]
                except ValueError:
                    new_status = 'pending'
                self.status_map[tid] = new_status
                changed = True
        if changed:
            self._dirty = True
        self._update_checklist()

    # ------------------------------------------------------------------
    # UI sub‑builders
    # ------------------------------------------------------------------
    def _build_top_controls(self) -> QHBoxLayout:
        lay = QHBoxLayout()
        lay.setContentsMargins(0, 0, 0, 0)
        lay.setSpacing(8)

        # Search bar (più larga)
        self._search = QLineEdit()
        self._search.setPlaceholderText('🔍 Cerca WSTG…')
        self._search.setMinimumWidth(280)
        self._search.textChanged.connect(self._update_checklist)
        lay.addWidget(self._search)

        # Category dropdown
        self._cat_cb = QComboBox()
        self._cat_cb.addItem('📂 Tutte le Categorie')
        self._cat_cb.addItems(self.categories)
        self._cat_cb.currentIndexChanged.connect(self._update_checklist)
        lay.addWidget(self._cat_cb)

        # Buttons (più alti e larghi per evitare testo tagliato)
        for text, cb in [
            ('🧩 Mapping WSTG ↔ OWASP Top 10', self._show_mapping_table),
            ('💾 Salva Stato', self._save_status),
            ('📂 Carica Stato', self._load_status),
        ]:
            b = QPushButton(text)
            b.setFixedHeight(32)  # Altezza uniforme con altri controlli
            b.clicked.connect(cb)
            lay.addWidget(b)

        return lay

    def _build_checklist_widget(self) -> QWidget:
        # Container con bordo
        container = QWidget()
        container.setObjectName("wstgListContainer")
        container_layout = QVBoxLayout(container)
        container_layout.setContentsMargins(0, 0, 0, 0)
        container_layout.setSpacing(0)

        # Lista WSTG senza bordo (il bordo è sul container)
        self._list = QListWidget()
        self._list.setObjectName("wstgList")
        self._list.setMinimumWidth(520)
        self._list.setMouseTracking(True)
        self._list.setContextMenuPolicy(Qt.ContextMenuPolicy.CustomContextMenu)
        self._list.customContextMenuRequested.connect(self._show_context_menu)
        self._list.itemClicked.connect(self._handle_list_click)
        self._list.currentRowChanged.connect(self._handle_arrow_navigation)
        self._list.setSelectionMode(QListWidget.SelectionMode.ExtendedSelection)
        self._list.setItemDelegate(ColorPreservingDelegate(self._list))

        container_layout.addWidget(self._list)
        return container

    def _build_right_panel(self) -> QVBoxLayout:
        lay = QVBoxLayout()

        # Container per detailBox
        detail_container = QWidget()
        detail_container.setObjectName("detailBoxContainer")
        detail_layout = QVBoxLayout(detail_container)
        detail_layout.setContentsMargins(0, 0, 0, 0)
        detail_layout.setSpacing(0)

        self._detail_box = QTextEdit()
        self._detail_box.setObjectName("detailBox")
        self._detail_box.setReadOnly(True)
        detail_layout.addWidget(self._detail_box)
        lay.addWidget(detail_container)

        line = QFrame()
        line.setFrameShape(QFrame.Shape.HLine)
        line.setFrameShadow(QFrame.Shadow.Sunken)
        lay.addWidget(line)

        # Container per refBox
        ref_container = QWidget()
        ref_container.setObjectName("refBoxContainer")
        ref_layout = QVBoxLayout(ref_container)
        ref_layout.setContentsMargins(0, 0, 0, 0)
        ref_layout.setSpacing(0)

        self._ref_box = QTextEdit()
        self._ref_box.setObjectName("refBox")
        self._ref_box.setReadOnly(True)
        ref_layout.addWidget(self._ref_box)
        lay.addWidget(ref_container)

        lay.addLayout(self._build_reference_tabs())

        # --- Note per test ---
        self._current_test_id: Optional[str] = None  # Traccia test selezionato per note

        return lay

    def _build_reference_tabs(self) -> QHBoxLayout:
        lay = QHBoxLayout()

        self.reference_buttons.clear()
        for text, section in [
            ('📄 Summary', 'summary'),
            ('🔍 How‑To', 'how-to'),
            ('🛠 Tools', 'tools'),
            ('🛡 Remediation', 'remediation'),
            ('📋 Note', 'notes'),
        ]:
            b = QPushButton(text)
            b.setFixedSize(130, 40)
            b.setCheckable(True)
            b.setEnabled(False)
            b.setCursor(Qt.CursorShape.PointingHandCursor)
            b.setProperty('variant', 'tab')
            b.clicked.connect(lambda _chk, s=section: self._display_reference_section(s))
            self.reference_buttons.append(b)
            lay.addWidget(b)

        return lay

    # ------------------------------------------------------------------
    # CHECKLIST RENDERING
    # ------------------------------------------------------------------
    def _update_checklist(self) -> None:
        # SALVA TUTTE LE SELEZIONI CORRENTI
        selected_tids = []
        for i in range(self._list.count()):
            item = self._list.item(i)
            if item.isSelected():
                tid = item.data(Qt.ItemDataRole.UserRole)
                if tid and not tid.startswith('_header_'):
                    selected_tids.append(tid)

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

        # RIPRISTINA SELEZIONI se c'erano
        if selected_tids:
            self._restore_multiple_selection(selected_tids)

    def _restore_selection(self, tid: str) -> None:
        """Ripristina la selezione su un test ID specifico"""
        for i in range(self._list.count()):
            item = self._list.item(i)
            item_tid = item.data(Qt.ItemDataRole.UserRole)
            if item_tid == tid:
                self._list.setCurrentItem(item)
                item.setSelected(True)
                self._list.scrollToItem(item)
                self._show_test_details(tid)
                break

    def _restore_multiple_selection(self, tids: list[str]) -> None:
        """Ripristina la selezione su multipli test ID"""
        if not tids:
            return

        last_item = None
        for i in range(self._list.count()):
            item = self._list.item(i)
            item_tid = item.data(Qt.ItemDataRole.UserRole)
            if item_tid in tids:
                item.setSelected(True)  # SELEZIONA
                last_item = item  # Salva per mostrare dettagli

        # Mostra dettagli dell'ultimo e scrolla
        if last_item:
            self._list.setCurrentItem(last_item)
            self._list.scrollToItem(last_item)
            last_tid = last_item.data(Qt.ItemDataRole.UserRole)
            if last_tid and not last_tid.startswith('_header_'):
                self._show_test_details(last_tid)

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

    def _get_category_progress(self, cat_data: Dict[str, Any]) -> tuple[int, int]:
        """Calcola il progresso di una categoria (completati, totale)"""
        tests = cat_data.get('tests', [])
        total = len(tests)
        completed = sum(1 for t in tests if self.status_map.get(t['id']) == 'done')
        return completed, total

    # All categories
    def _render_all_categories(self, query: str) -> None:
        for category, details in self.data.get('categories', {}).items():
            spacer = QListWidgetItem('')
            spacer.setSizeHint(QSize(0, 16))
            spacer.setFlags(Qt.ItemFlag.NoItemFlags)
            self._list.addItem(spacer)

            # Calcola progresso categoria
            completed, total = self._get_category_progress(details)
            pct = int((completed / total) * 100) if total > 0 else 0

            arrow = '▼' if category not in self.collapsed_sections else '▶'
            # Mostra progresso nel header
            header_text = f"{arrow} {category}  [{completed}/{total}] {pct}%"
            header = QListWidgetItem(header_text)
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
            # Filtro solo per testo
            if query and query not in test['name'].lower() and query not in test['id'].lower():
                continue
            self._add_test_item(test)

    def _add_test_item(self, test: Dict[str, Any]) -> None:
        tid = test['id']
        status = self.status_map.get(tid, 'pending')
        conf = Config.STATUS_CONFIG.get(status, {'color': 'transparent', 'alpha': 0})
        alpha_pct = conf.get('alpha', 0)

        title = f"{conf.get('icon', '◻')} {tid} - {test['name']}"
        item = QListWidgetItem(title)

        if status == 'done':
            # ✅ Completato → TESTO VERDE + GRASSETTO
            fg = QColor(Config.COLORS['success'])
            bg = QColor(0, 0, 0, 0)
            border = 'transparent'
            border_w = 0
            # Colori per quando SELEZIONATO
            selected_bg = QColor(Config.COLORS['success'])
            selected_bg.setAlpha(int(255 * 0.18))
            selected_border = Config.COLORS['success']
            selected_border_w = 2  # VERIFICA CHE SIA 2
            font_bold = True
        elif status == 'in-progress':
            # ⏳ In Corso → TESTO VIOLA + GRASSETTO
            fg = QColor(Config.COLORS['accent_glow'])
            bg = QColor(0, 0, 0, 0)
            border = 'transparent'
            border_w = 0
            # Colori per quando SELEZIONATO
            selected_bg = QColor(Config.COLORS['purple'])
            selected_bg.setAlpha(int(255 * 0.18))
            selected_border = Config.COLORS['purple']
            selected_border_w = 2  # VERIFICA CHE SIA 2
            font_bold = True
        else:
            # ◻ Pending → testo default, nessun grassetto
            fg = QColor(Config.COLORS['text_primary'])
            bg = QColor(0, 0, 0, 0)  # Trasparente quando NON selezionato
            border = 'transparent'
            border_w = 0
            # Colori per quando SELEZIONATO/HOVER
            selected_bg = QColor(Config.COLORS['bg_card'])  # Usa bg_card invece di bg_tertiary
            selected_bg.setAlpha(int(255 * 0.25))  # Aumenta opacità per visibilità
            selected_border = Config.COLORS['border_light']
            selected_border_w = 2
            font_bold = False

        # Applica font
        font = QFont('Segoe UI', 10)
        if font_bold:
            font.setWeight(QFont.Weight.Bold)
        item.setFont(font)

        # Salva dati normali
        item.setForeground(fg)
        item.setBackground(bg)
        item.setData(Qt.ItemDataRole.UserRole + 1, border)
        item.setData(Qt.ItemDataRole.UserRole + 2, border_w)

        # SALVA COLORI PER SELEZIONE (UserRole + 3, 4, 5)
        item.setData(Qt.ItemDataRole.UserRole + 3, selected_bg)
        item.setData(Qt.ItemDataRole.UserRole + 4, selected_border)
        item.setData(Qt.ItemDataRole.UserRole + 5, selected_border_w)

        item.setData(Qt.ItemDataRole.UserRole, tid)
        item.setSizeHint(QSize(0, 28))
        self._list.addItem(item)

    # ------------------------------------------------------------------
    # STATUS / COLOR HELPERS
    # ------------------------------------------------------------------
    def _get_category_color(self, cat_data: Dict[str, Any]) -> str:
        statuses = [self.status_map.get(t['id'], 'pending') for t in cat_data.get('tests', [])]
        if any(s == 'in-progress' for s in statuses):
            return Config.COLORS['accent_glow']  # viola più chiaro per visibilità
        if any(s == 'done' for s in statuses):
            return Config.COLORS['success']  # verde della palette
        return Config.COLORS['blue_main']

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

        # Pulisci note quando si seleziona una categoria
        self._current_test_id = None

    def _on_notes_changed_from_ref(self) -> None:
        """Salva le note quando vengono modificate nel ref_box"""
        if self._current_test_id:
            self.notes_map[self._current_test_id] = self._ref_box.toPlainText()
            self._dirty = True

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

        # Imposta test corrente per note
        self._current_test_id = tid

    def _find_test_by_id(self, tid: str) -> List[Any] | None:
        for cat, details in self.data.get('categories', {}).items():
            for test in details.get('tests', []):
                if test['id'] == tid:
                    return [test, cat]
        return None

    def _display_reference_section(self, section: str) -> None:
        for b in self.reference_buttons: b.setChecked(False)
        idx_map = {'summary': 0, 'how-to': 1, 'tools': 2, 'remediation': 3, 'notes': 4}
        if section in idx_map: self.reference_buttons[idx_map[section]].setChecked(True)

        # Gestione sezione Note
        if section == 'notes':
            self._ref_box.setReadOnly(False)
            self._ref_box.setPlaceholderText('Inserisci note, findings, evidenze per questo test...')
            self._ref_box.blockSignals(True)
            self._ref_box.setPlainText(self.notes_map.get(self._current_test_id, ''))
            self._ref_box.blockSignals(False)
            # Collega evento per salvare note
            try:
                self._ref_box.textChanged.disconnect()
            except:
                pass
            self._ref_box.textChanged.connect(self._on_notes_changed_from_ref)
            return

        # Ripristina readonly per altre sezioni
        self._ref_box.setReadOnly(True)
        try:
            self._ref_box.textChanged.disconnect()
        except:
            pass

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
        selected_tids = []  # SALVA TUTTI I SELEZIONATI

        for i in range(self._list.count()):
            itm = self._list.item(i)
            if itm.isSelected():
                tid = itm.data(Qt.ItemDataRole.UserRole)
                if isinstance(tid, str) and not tid.startswith('_header_'):
                    selected_tids.append(tid)  # AGGIUNGI ALLA LISTA
                    if self.status_map.get(tid) != status:
                        self.status_map[tid] = status
                        changed += 1

        if changed:
            self._dirty = True
            self._update_checklist()

            # RIPRISTINA SELEZIONE su TUTTI gli item
            if selected_tids:
                self._restore_multiple_selection(selected_tids)

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

        # Salva status e note insieme
        save_data = {
            'status': self.status_map,
            'notes': self.notes_map
        }
        ok = self._fm.save_json(save_data, Path(filename))
        if ok:
            # Remember last used file (save)
            self._last_project_path = filename
            self._settings.setValue('last_project_path', filename)
            self._saved_status_snapshot = dict(self.status_map)
            self._dirty = False
            CustomMessageBox.success(
                self,
                '✅ Salvataggio completato',
                f'Stato salvato in:\n{filename}',
                confirm_text='OK'
            )
        else:
            CustomMessageBox.danger(
                self,
                '❌ Errore',
                'Errore durante il salvataggio',
                confirm_text='OK'
            )

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
            CustomMessageBox.success(
                self,
                'Caricamento completato',
                'Stato caricato correttamente',
                confirm_text='OK'
            )

    # ------------------------------------------------------------------
    # MAPPING DIALOG
    # ------------------------------------------------------------------
    def _show_mapping_table(self) -> None:
        dlg = MappingDialog(self.owasp_top10, self)
        dlg.show()
        dlg.raise_()
        dlg.activateWindow()

    # ------------------------------------------------------------------
    # CLOSE EVENT - Conferma chiusura
    # ------------------------------------------------------------------
    def closeEvent(self, event: QCloseEvent) -> None:
        """Chiede conferma se ci sono modifiche non salvate"""
        if self._dirty:
            # Usa CustomMessageBox.warning con conferma/annulla
            result = CustomMessageBox.warning(
                self,
                '⚠️ Modifiche non salvate',
                'Ci sono modifiche non salvate.\nVuoi salvare prima di uscire?',
                confirm_text='Salva e chiudi',
                on_confirm=None
            )

            if result:
                # User clicked "Salva e chiudi"
                self._save_status()
                # Se l'utente ha annullato il salvataggio, non chiudere
                if self._dirty:
                    event.ignore()
                    return
                event.accept()
            else:
                # User clicked "Annulla" (discard) - chiudi senza salvare
                event.accept()
        else:
            event.accept()
