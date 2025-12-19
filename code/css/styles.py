"""
Stylesheet Manager - PyQt6 Stylesheets centralizzati
Tutti gli stili dell'applicazione organizzati per componente
"""

from .theme import Theme

# Alias per comodita
C = Theme.COLORS
R = Theme.RADIUS
S = Theme.SPACING
T = Theme.TYPOGRAPHY


def _rgba(hex_color: str, alpha: float) -> str:
    """Helper per conversione rgba"""
    return Theme.rgba(hex_color, alpha)


class Styles:
    """Raccolta di tutti gli stylesheet dell'applicazione"""

    # ============================================
    # BASE STYLES (condivisi da tutte le interfacce)
    # ============================================
    @staticmethod
    def base() -> str:
        """Stili base condivisi: QWidget, scrollbar, tooltip, labels"""
        return f"""
        /* ===== BASE WIDGET ===== */
        QWidget {{
            background-color: {C['bg_primary']};
            color: {C['text_primary']};
            font-size: {T['font_size_md']}px;
            font-family: {T['font_family']};
            selection-background-color: {_rgba(C['purple'], 0.3)};
            selection-color: {C['text_primary']};
        }}

        /* ===== TOOLTIP ===== */
        QToolTip {{
            background-color: {C['bg_elevated']};
            color: {C['text_primary']};
            border: 1px solid {C['border_light']};
            padding: 8px 12px;
            border-radius: {R['sm']}px;
            font-size: {T['font_size_sm']}px;
        }}

        /* ===== SCROLLBARS ===== */
        QScrollBar:vertical, QScrollBar:horizontal {{
            background: {C['bg_secondary']};
            border: none;
            margin: 3px;
        }}
        QScrollBar:vertical {{
            width: 12px;
        }}
        QScrollBar:horizontal {{
            height: 12px;
        }}
        QScrollBar::handle {{
            background: {C['bg_tertiary']};
            border-radius: 6px;
            min-height: 30px;
            min-width: 30px;
        }}
        QScrollBar::handle:hover {{
            background: {C['border_light']};
        }}
        QScrollBar::handle:pressed {{
            background: {C['purple']};
        }}
        QScrollBar::add-line, QScrollBar::sub-line {{
            background: transparent;
            border: none;
            height: 0;
            width: 0;
        }}
        QScrollBar::add-page, QScrollBar::sub-page {{
            background: transparent;
        }}

        /* ===== LABELS ===== */
        QLabel {{
            background: transparent;
            border: none;
        }}

        /* ===== FRAME SEPARATOR ===== */
        QFrame[frameShape="4"] {{
            color: {C['border_primary']};
            max-height: 1px;
        }}
        """

    # ============================================
    # OWASP CHECKLIST APP
    # ============================================
    @staticmethod
    def owasp_app() -> str:
        """Stili specifici per OWASPChecklistApp"""
        return f"""
        /* ===== SPLITTER ===== */
        QSplitter::handle {{
            background: transparent;
            margin: 0 1px;
        }}

        /* ===== INPUT FIELDS ===== */
        QLineEdit {{
            background-color: {C['bg_input']};
            color: {C['text_primary']};
            border: 1.5px solid {C['border_light']};
            border-radius: {R['md']}px;
            padding: 10px 14px;
            font-size: {T['font_size_md']}px;
        }}
        QLineEdit:hover {{
            border-color: {C['border_hover']};
            background-color: {C['bg_input_hover']};
        }}
        QLineEdit:focus {{
            border-color: {C['border_focus']};
            background-color: {C['bg_input_focus']};
            outline: none;
        }}
        QLineEdit::placeholder {{
            color: {C['text_muted']};
        }}

        /* ===== BUTTONS ===== */
        QPushButton {{
            color: {C['text_white']};
            background-color: {C['purple']};
            border: none;
            border-radius: {R['md']}px;
            padding: 10px 18px;
            font-weight: {T['font_weight_semibold']};
            font-size: {T['font_size_md']}px;
            min-height: 20px;
        }}
        QPushButton:hover {{
            background-color: {C['purple_light']};
        }}
        QPushButton:pressed {{
            background-color: {C['purple_dark']};
        }}
        QPushButton:disabled {{
            background-color: {C['bg_tertiary']};
            color: {C['text_muted']};
        }}

        /* Tab-style buttons (Reference tabs) */
        QPushButton[variant="tab"] {{
            background: {C['bg_secondary']};
            color: {C['text_secondary']};
            border: 1.5px solid {C['border']};
            border-radius: 10px;
            padding: 6px 16px;
            font-weight: 500;
        }}
        QPushButton[variant="tab"]:hover {{
            background: {C['bg_tertiary']};
            border-color: {C['border_light']};
            color: {C['text_primary']};
        }}
        QPushButton[variant="tab"]:checked {{
            background: {_rgba(C['accent_primary'], 0.12)};
            border-color: {_rgba(C['accent_primary'], 0.60)};
            color: {C['accent_primary']};
            font-weight: 700;
        }}

       /* ===== WSTG LIST CONTAINER (pannello sinistro con bordo) ===== */
        QWidget#wstgListContainer {{
            background-color: {C['bg_secondary']};
            border: 1.5px solid {C['border']};
            border-radius: 12px;
            padding: 2px;
        }}
        
        /* ===== WSTG LIST (senza bordo, dentro container) ===== */
        QListWidget#wstgList {{
            background-color: transparent;
            color: {C['text_primary']};
            border: none;
            outline: none;
            padding: 4px;
            border-radius: 10px;
            margin: 0px;
        }}
        QListWidget#wstgList::item {{
            border: none;
            padding: 8px 10px;
            margin: 2px 4px;
            border-radius: 10px;
            background: transparent;
        }}

        /* ===== DETAIL/REF CONTAINERS (pannelli destri con bordo) ===== */
        QWidget#detailBoxContainer, QWidget#refBoxContainer {{
            background-color: {C['bg_card']};
            border: 1.5px solid {C['border']};
            border-radius: 12px;
            padding: 2px;
        }}
        
        /* ===== DETAIL/REF BOXES (senza bordo, dentro container) ===== */
        QTextEdit#detailBox, QTextEdit#refBox {{
            background-color: transparent;
            color: {C['text_primary']};
            border: none;
            padding: 6px;
            border-radius: 10px;
            selection-background-color: {_rgba(C['accent_primary'], 0.3)};
        }}

        /* ===== PROGRESS LABEL ===== */
        QLabel#progressLabel {{
            color: {C['text_secondary']};
            font-weight: bold;
            font-size: 14px;
        }}

        /* ===== FOOTER LABELS ===== */
        QLabel#footerLabel {{
            color: {C['text_muted']};
            font-size: 12px;
            padding-top: 6px;
        }}
        QLabel#shortcutHint {{
            color: {C['text_muted']};
            font-size: 10px;
            padding-top: 6px;
        }}
        """

    # ============================================
    # MAIN - combina base + owasp_app
    # ============================================
    @staticmethod
    def main() -> str:
        """Stylesheet completo per OWASPChecklistApp (base + app)"""
        return Styles.base() + Styles.owasp_app()

    # ============================================
    # MAPPING DIALOG
    # ============================================
    @staticmethod
    def mapping_dialog() -> str:
        """Stylesheet per MappingDialog"""
        return Styles.base() + f"""
        /* ===== MAPPING DIALOG ===== */
        QWidget#mappingDialog {{
            background-color: {C['bg_primary']};
        }}

        /* ===== SPLITTER ===== */
        QSplitter::handle {{
            background: transparent;  
            width: 13px;
            margin: 0;
        }}

        /* ===== CONTAINERS CON BORDI ARROTONDATI ===== */
        QWidget#mappingHtmlContainer,
        QWidget#mappingListContainer,
        QWidget#mappingDetailContainer {{
            background-color: {C['bg_secondary']};
            border: 1.5px solid {C['border_primary']};
            border-radius: 12px;
            padding: 2px;
        }}

        /* ===== HTML BOX (senza bordo, dentro container) ===== */
        QTextEdit#mappingHtmlBox {{
            background-color: transparent;
            color: {C['text_primary']};
            border: none;
            padding: 6px;
            border-radius: 10px;
            font-size: 13px;
        }}

        /* ===== OWASP LIST (senza bordo, dentro container) ===== */
        QListWidget#mappingOwaspList {{
            background-color: transparent;
            color: {C['text_primary']};
            border: none;
            padding: 4px;
            border-radius: 10px;
            outline: none;
        }}
        QListWidget#mappingOwaspList::item {{
            padding: 10px 12px;
            margin: 2px 4px;
            border-radius: 8px;
            border: none;
        }}

        /* ===== DETAIL BOX (senza bordo, dentro container) ===== */
        QTextEdit#mappingDetailBox {{
            background-color: transparent;
            color: {C['text_primary']};
            border: none;
            padding: 6px;
            border-radius: 10px;
            font-size: 13px;
        }}
        """

    # ============================================
    # PROGRESS BAR
    # ============================================
    @staticmethod
    def progress_bar() -> str:
        """Stylesheet per la progress bar"""
        return f"""
        QProgressBar {{
            border: 1.5px solid {C['border_primary']};
            border-radius: {R['lg']}px;
            background-color: {C['bg_secondary']};
            color: {C['text_primary']};
            text-align: center;
            padding: 3px;
            font-weight: {T['font_weight_semibold']};
            font-size: {T['font_size_md']}px;
            min-height: 28px;
        }}
        QProgressBar::chunk {{
            border-radius: {R['md']}px;
            margin: 2px;
            background: qlineargradient(x1:0, y1:0, x2:1, y2:0,
                stop:0 {C['accent_secondary']},
                stop:0.5 {C['purple']},
                stop:1 {C['purple_light']}
            );
        }}
        """

    # ============================================
    # CONTEXT MENU
    # ============================================
    @staticmethod
    def context_menu() -> str:
        """Stylesheet per i menu contestuali"""
        return f"""
        QMenu {{
            background-color: {C['bg_secondary']};
            color: {C['text_primary']};
            border: 1.5px solid {C['border_primary']};
            padding: 8px;
            border-radius: {R['lg']}px;
        }}
        QMenu::item {{
            padding: 10px 20px;
            border-radius: {R['sm']}px;
            margin: 2px 4px;
        }}
        QMenu::item:selected {{
            background: qlineargradient(x1:0, y1:0, x2:1, y2:0,
                stop:0 {C['indigo']}, stop:1 {C['purple']});
            color: {C['text_white']};
        }}
        QMenu::separator {{
            height: 1px;
            background: {C['border_primary']};
            margin: 6px 12px;
        }}
        """

    # ============================================
    # CUSTOM MESSAGE BOX
    # ============================================
    @staticmethod
    def message_box() -> str:
        """Stylesheet per CustomMessageBox"""
        return Styles.base() + f"""
        QPushButton {{
            color: {C['text_white']};
            background-color: {C['purple']};
            border: none;
            border-radius: {R['md']}px;
            padding: 10px 18px;
            font-weight: {T['font_weight_semibold']};
            min-height: 20px;
        }}
        QPushButton:hover {{
            background-color: {C['purple_light']};
        }}
        QPushButton[variant="secondary"] {{
            background-color: {C['bg_tertiary']};
            color: {C['text_primary']};
        }}
        QPushButton[variant="secondary"]:hover {{
            background-color: {C['bg_elevated']};
        }}
        """

    # ============================================
    # SPLASH SCREEN
    # ============================================
    @staticmethod
    def splash_progress() -> str:
        """Stylesheet per la progress bar dello splash screen"""
        return f"""
        QProgressBar {{
            background-color: {_rgba(C['text_white'], 0.08)};
            border-radius: 4px;
            border: none;
        }}
        QProgressBar::chunk {{
            background: qlineargradient(x1:0, y1:0, x2:1, y2:0,
                stop:0 {C['indigo']}, stop:0.5 {C['purple']}, stop:1 {C['purple_light']});
            border-radius: 4px;
        }}
        """
