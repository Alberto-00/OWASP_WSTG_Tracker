from pathlib import Path
from typing import Final, List, Optional

from PyQt6.QtCore import QEasingCurve, QPointF, QPropertyAnimation, QTimer, Qt, pyqtSignal
from PyQt6.QtGui import QColor, QPaintEvent, QPainter, QPainterPath, QPixmap, QRadialGradient, QLinearGradient, QFont
from PyQt6.QtCore import QRectF
from PyQt6.QtWidgets import QLabel, QProgressBar, QVBoxLayout, QWidget

from ui.owasp_screen import __version__

# ---------------------------------------------------------------------------
# CONFIGURAZIONE
# ---------------------------------------------------------------------------
WINDOW_W: Final = 520
WINDOW_H: Final = 360
CORNER_RADIUS: Final = 24
LOGO_SIZE: Final = 120

# Design moderno con gradiente (colori dal documento)
BG_START_COLOR: Final = QColor(26, 28, 36, 255)  # Blu scuro
BG_END_COLOR: Final = QColor(38, 42, 54, 255)    # Blu scuro più chiaro
ACCENT_COLOR: Final = QColor(99, 102, 241)       # Indigo moderno
GLOW_COLOR: Final = QColor(99, 102, 241, 40)     # Glow sottile

FADE_IN_MS: Final = 600
PROGRESS_DURATION_MS: Final = 2800
FADE_OUT_MS: Final = 600
STATUS_INTERVAL_MS: Final = 450

STATUS_MESSAGES: Final[List[str]] = [
    "Inizializzazione...",
    "Caricamento moduli...",
    "Connessione database...",
    "Verifica permessi...",
    "Preparazione interfaccia...",
    "Avvio servizi...",
]


# ---------------------------------------------------------------------------
# MODERN SPLASH SCREEN
# ---------------------------------------------------------------------------
class ModernSplashScreenPNG(QWidget):
    """Splash screen moderna con design glassmorphism."""

    finished = pyqtSignal()
    TOTAL_DURATION_MS: Final = FADE_IN_MS + PROGRESS_DURATION_MS + FADE_OUT_MS

    def __init__(self, logo_path: str | Path, parent: QWidget | None = None) -> None:
        super().__init__(parent)

        self._is_closing = False
        self._animations_started = False

        self.setWindowFlags(
            Qt.WindowType.FramelessWindowHint |
            Qt.WindowType.WindowStaysOnTopHint |
            Qt.WindowType.Tool
        )
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)
        self.setAttribute(Qt.WidgetAttribute.WA_DeleteOnClose)
        self.setFixedSize(WINDOW_W, WINDOW_H)

        self.fade_in_anim: Optional[QPropertyAnimation] = None
        self.progress_anim: Optional[QPropertyAnimation] = None
        self.fade_out_anim: Optional[QPropertyAnimation] = None
        self.status_timer: Optional[QTimer] = None
        self.logo_anim: Optional[QPropertyAnimation] = None

        self._setup_ui(logo_path)
        self._setup_animations()

    def _setup_ui(self, logo_path: str | Path) -> None:
        """Configura l'interfaccia utente moderna."""
        layout = QVBoxLayout(self)
        layout.setContentsMargins(50, 60, 50, 50)
        layout.setSpacing(25)

        # --- LOGO ---
        self.logo_label = QLabel(self)

        try:
            pixmap = QPixmap(str(logo_path))
            if pixmap.isNull():
                pixmap = self._create_placeholder_logo()
            else:
                pixmap = pixmap.scaled(
                    LOGO_SIZE,
                    LOGO_SIZE,
                    Qt.AspectRatioMode.KeepAspectRatio,
                    Qt.TransformationMode.SmoothTransformation,
                )
        except Exception as e:
            print(f"Errore nel caricamento del logo: {e}")
            pixmap = self._create_placeholder_logo()

        self.logo_label.setPixmap(pixmap)
        self.logo_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.logo_label.setFixedSize(LOGO_SIZE, LOGO_SIZE)
        layout.addWidget(self.logo_label, 0, Qt.AlignmentFlag.AlignCenter)

        # Spazio per bilanciare il layout
        layout.addStretch(1)

        # --- PROGRESS BAR ---
        self.progress = QProgressBar(self)
        self.progress.setRange(0, 100)
        self.progress.setValue(0)
        self.progress.setFixedHeight(8)
        self.progress.setTextVisible(False)
        self.progress.setStyleSheet("""
            QProgressBar {
                background-color: rgba(255, 255, 255, 0.08);
                border-radius: 4px;
                border: none;
            }
            QProgressBar::chunk {
                background: qlineargradient(x1:0, y1:0, x2:1, y2:0,
                    stop:0 #6366f1, stop:0.5 #8b5cf6, stop:1 #a78bfa);
                border-radius: 4px;
            }
        """)
        layout.addWidget(self.progress)

        # --- STATUS LABEL ---
        self.status_label = QLabel(STATUS_MESSAGES[0], self)
        self.status_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        status_font = QFont("Segoe UI", 10)
        self.status_label.setFont(status_font)
        self.status_label.setStyleSheet("""
            color: rgba(255, 255, 255, 0.7);
            margin-top: 12px;
            letter-spacing: 0.5px;
        """)
        layout.addWidget(self.status_label)

        # --- VERSION LABEL ---
        version_label = QLabel(f"v{__version__}", self)
        version_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        version_font = QFont("Segoe UI", 8)
        version_label.setFont(version_font)
        version_label.setStyleSheet("""
            color: rgba(255, 255, 255, 0.4);
            margin-top: 5px;
        """)
        layout.addWidget(version_label)

        self._status_index = 0

    def _create_placeholder_logo(self) -> QPixmap:
        """Crea un logo placeholder moderno."""
        pixmap = QPixmap(LOGO_SIZE, LOGO_SIZE)
        pixmap.fill(Qt.GlobalColor.transparent)

        painter = QPainter(pixmap)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)

        # Gradiente per il logo
        gradient = QLinearGradient(0, 0, LOGO_SIZE, LOGO_SIZE)
        gradient.setColorAt(0, QColor(99, 102, 241))
        gradient.setColorAt(1, QColor(139, 92, 246))

        painter.setBrush(gradient)
        painter.setPen(Qt.PenStyle.NoPen)
        painter.drawEllipse(15, 15, LOGO_SIZE - 30, LOGO_SIZE - 30)

        # Aggiungi un simbolo interno
        painter.setBrush(QColor(255, 255, 255, 200))
        painter.drawEllipse(35, 35, LOGO_SIZE - 70, LOGO_SIZE - 70)

        painter.end()
        return pixmap

    def _setup_animations(self) -> None:
        """Configura le animazioni."""
        # Fade in
        self.fade_in_anim = QPropertyAnimation(self, b"windowOpacity", self)
        self.fade_in_anim.setDuration(FADE_IN_MS)
        self.fade_in_anim.setStartValue(0.0)
        self.fade_in_anim.setEndValue(1.0)
        self.fade_in_anim.setEasingCurve(QEasingCurve.Type.OutCubic)

        # Progress animation
        self.progress_anim = QPropertyAnimation(self.progress, b"value", self)
        self.progress_anim.setDuration(PROGRESS_DURATION_MS)
        self.progress_anim.setStartValue(0)
        self.progress_anim.setEndValue(100)
        self.progress_anim.setEasingCurve(QEasingCurve.Type.InOutCubic)

        # Fade out
        self.fade_out_anim = QPropertyAnimation(self, b"windowOpacity", self)
        self.fade_out_anim.setDuration(FADE_OUT_MS)
        self.fade_out_anim.setStartValue(1.0)
        self.fade_out_anim.setEndValue(0.0)
        self.fade_out_anim.setEasingCurve(QEasingCurve.Type.InOutQuart)

        # Connessioni
        self.fade_in_anim.finished.connect(self._on_fade_in_finished)
        self.progress_anim.finished.connect(self._on_progress_finished)
        self.fade_out_anim.finished.connect(self._on_fade_out_finished)

        # Timer per status
        self.status_timer = QTimer(self)
        self.status_timer.setInterval(STATUS_INTERVAL_MS)
        self.status_timer.timeout.connect(self._advance_status)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------
    def start(self) -> None:
        """Mostra la splash e avvia la sequenza di animazioni."""
        if self._animations_started or self._is_closing:
            return

        self._animations_started = True
        self.setWindowOpacity(0.0)
        self._center_on_primary_screen()
        self.show()
        self.raise_()
        self.activateWindow()

        if self.fade_in_anim:
            self.fade_in_anim.start()

    def finish(self, main_window: QWidget) -> None:
        """Termina la splash screen e mostra la finestra principale."""
        if self._is_closing:
            return

        self._is_closing = True
        self._stop_all_animations()

        if main_window:
            main_window.show()
            main_window.raise_()
            main_window.activateWindow()

        self.close()

    def total_duration_ms(self) -> int:
        return self.TOTAL_DURATION_MS

    # ------------------------------------------------------------------
    # Slot privati
    # ------------------------------------------------------------------
    def _on_fade_in_finished(self) -> None:
        """Chiamato quando il fade in è completato."""
        if self._is_closing:
            return

        if self.status_timer:
            self.status_timer.start()
        if self.progress_anim:
            self.progress_anim.start()

    def _on_progress_finished(self) -> None:
        """Chiamato quando la progress bar è completata."""
        if self._is_closing:
            return

        if self.status_timer:
            self.status_timer.stop()
        if self.fade_out_anim:
            self.fade_out_anim.start()

    def _on_fade_out_finished(self) -> None:
        """Chiamato quando il fade out è completato."""
        self.finished.emit()
        self.close()

    def _advance_status(self) -> None:
        """Avanza al prossimo messaggio di status."""
        if self._is_closing:
            return

        self._status_index += 1
        if self._status_index >= len(STATUS_MESSAGES):
            if self.status_timer:
                self.status_timer.stop()
            return
        self.status_label.setText(STATUS_MESSAGES[self._status_index])

    def _stop_all_animations(self) -> None:
        """Ferma tutte le animazioni e timer."""
        if self.fade_in_anim:
            self.fade_in_anim.stop()
        if self.progress_anim:
            self.progress_anim.stop()
        if self.fade_out_anim:
            self.fade_out_anim.stop()
        if self.status_timer:
            self.status_timer.stop()

    # ------------------------------------------------------------------
    # Utility
    # ------------------------------------------------------------------
    def _center_on_primary_screen(self) -> None:
        """Centra la finestra sullo schermo principale."""
        try:
            from PyQt6.QtGui import QGuiApplication

            screen = QGuiApplication.primaryScreen()
            if screen is None:
                return

            geometry = screen.availableGeometry()
            x = geometry.x() + (geometry.width() - self.width()) // 2
            y = geometry.y() + (geometry.height() - self.height()) // 2
            self.move(x, y)
        except Exception as e:
            print(f"Errore nel centrare la finestra: {e}")

    # ------------------------------------------------------------------
    # Paint: sfondo con gradiente e effetti
    # ------------------------------------------------------------------
    def paintEvent(self, event: QPaintEvent) -> None:
        """Disegna lo sfondo moderno con gradiente e glow."""
        try:
            painter = QPainter(self)
            painter.setRenderHint(QPainter.RenderHint.Antialiasing)

            rect_f = QRectF(self.rect())

            # --- SFONDO PRINCIPALE CON GRADIENTE ---
            bg_gradient = QLinearGradient(0, 0, 0, self.height())
            bg_gradient.setColorAt(0, BG_START_COLOR)
            bg_gradient.setColorAt(1, BG_END_COLOR)

            rect_path = QPainterPath()
            rect_path.addRoundedRect(rect_f, CORNER_RADIUS, CORNER_RADIUS)
            painter.fillPath(rect_path, bg_gradient)

            # --- BORDO SOTTILE LUMINOSO ---
            border_gradient = QLinearGradient(0, 0, self.width(), self.height())
            border_gradient.setColorAt(0, QColor(99, 102, 241, 100))
            border_gradient.setColorAt(0.5, QColor(139, 92, 246, 100))
            border_gradient.setColorAt(1, QColor(99, 102, 241, 100))

            from PyQt6.QtGui import QPen
            border_pen = QPen(border_gradient, 2)
            painter.strokePath(rect_path, border_pen)

            # --- EFFETTO GLOW CENTRALE ---
            center = QPointF(self.width() / 2, self.height() / 3)
            radius = LOGO_SIZE * 1.2
            glow_gradient = QRadialGradient(center, radius)

            glow_gradient.setColorAt(0.0, GLOW_COLOR)
            glow_gradient.setColorAt(0.5, QColor(99, 102, 241, 15))
            glow_gradient.setColorAt(1.0, QColor(99, 102, 241, 0))

            painter.setBrush(glow_gradient)
            painter.setPen(Qt.PenStyle.NoPen)
            painter.drawEllipse(center, radius, radius)

            painter.end()
        except Exception as e:
            print(f"Errore nel paintEvent: {e}")

        super().paintEvent(event)

    # ------------------------------------------------------------------
    # Cleanup
    # ------------------------------------------------------------------
    def closeEvent(self, event) -> None:
        """Gestisce la chiusura della finestra."""
        self._is_closing = True
        self._stop_all_animations()
        super().closeEvent(event)