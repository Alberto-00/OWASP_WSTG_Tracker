from pathlib import Path
from typing import Final, List, Optional

from PyQt6.QtCore import QEasingCurve, QPointF, QPropertyAnimation, QTimer, Qt, pyqtSignal
from PyQt6.QtGui import QColor, QPaintEvent, QPainter, QPainterPath, QPixmap, QRadialGradient
from PyQt6.QtCore import QRectF
from PyQt6.QtWidgets import QLabel, QProgressBar, QVBoxLayout, QWidget


# ---------------------------------------------------------------------------
# CONFIGURAZIONE
# ---------------------------------------------------------------------------
WINDOW_W: Final = 480
WINDOW_H: Final = 320
CORNER_RADIUS: Final = 16
LOGO_SIZE: Final = 140  # Ridotto per evitare problemi di memoria

# Grigio scuro pastello per dark theme - più rilassante per gli occhi
BG_COLOR: Final = QColor(45, 47, 51, 245)  # #2D2F33 con trasparenza
GLOW_COLOR: Final = QColor(0, 200, 150, 50)  # Glow più tenue

FADE_IN_MS: Final = 500
PROGRESS_DURATION_MS: Final = 2500
FADE_OUT_MS: Final = 300
STATUS_INTERVAL_MS: Final = 500

STATUS_MESSAGES: Final[List[str]] = [
    "Caricamento moduli…",
    "Inizializzo interfaccia…",
    "Connessione al database…",
    "Verifica permessi…",
    "Avvio servizi…",
]


# ---------------------------------------------------------------------------
# SPLASH‑SCREEN
# ---------------------------------------------------------------------------
class ModernSplashScreenPNG(QWidget):
    """Splash‑screen basato su *QWidget*."""

    # Signal per notificare quando la splash è finita
    finished = pyqtSignal()

    TOTAL_DURATION_MS: Final = FADE_IN_MS + PROGRESS_DURATION_MS + FADE_OUT_MS

    def __init__(self, logo_path: str | Path, parent: QWidget | None = None) -> None:
        super().__init__(parent)

        # Flag per evitare doppie chiamate
        self._is_closing = False
        self._animations_started = False

        # Imposta flags della finestra
        self.setWindowFlags(
            Qt.WindowType.FramelessWindowHint |
            Qt.WindowType.WindowStaysOnTopHint |
            Qt.WindowType.Tool  # Aggiunto per evitare problemi con taskbar
        )
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)
        self.setAttribute(Qt.WidgetAttribute.WA_DeleteOnClose)  # Importante per la pulizia
        self.setFixedSize(WINDOW_W, WINDOW_H)

        # Inizializza le animazioni a None
        self.fade_in_anim: Optional[QPropertyAnimation] = None
        self.progress_anim: Optional[QPropertyAnimation] = None
        self.fade_out_anim: Optional[QPropertyAnimation] = None
        self.status_timer: Optional[QTimer] = None

        self._setup_ui(logo_path)
        self._setup_animations()

    def _setup_ui(self, logo_path: str | Path) -> None:
        """Configura l'interfaccia utente."""
        layout = QVBoxLayout(self)
        layout.setContentsMargins(40, 50, 40, 40)
        layout.setSpacing(20)

        # --- LOGO ---
        self.logo_label = QLabel(self)

        try:
            pixmap = QPixmap(str(logo_path))
            if pixmap.isNull():
                print(f"Avviso: Impossibile caricare il logo da: {logo_path}")
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

        # --- TITOLO ---
        '''
        title_label = QLabel("OWASP Checklist", self)
        title_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        title_label.setFont(QFont("Arial", 18, QFont.Weight.Bold))
        title_label.setStyleSheet("color: #77ffcc; margin: 10px 0;")
        layout.addWidget(title_label)

        layout.addItem(QSpacerItem(0, 20, QSizePolicy.Policy.Minimum, QSizePolicy.Policy.Fixed))
        '''

        # --- PROGRESS BAR ---
        self.progress = QProgressBar(self)
        self.progress.setRange(0, 100)
        self.progress.setValue(0)
        self.progress.setFixedHeight(10)
        self.progress.setTextVisible(False)
        self.progress.setStyleSheet(
            """
            QProgressBar {
                background-color: rgba(255,255,255,25);
                border-radius: 5px;
                border: none;
            }
            QProgressBar::chunk {
                background-color: #00c896;
                border-radius: 5px;
            }
            """
        )
        layout.addWidget(self.progress)

        # --- STATUS LABEL ---
        self.status_label = QLabel(STATUS_MESSAGES[0], self)
        self.status_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.status_label.setStyleSheet("color: #d4d4d4; margin-top: 10px;")
        layout.addWidget(self.status_label)

        # Status index
        self._status_index = 0

    def _create_placeholder_logo(self) -> QPixmap:
        """Crea un logo placeholder."""
        pixmap = QPixmap(LOGO_SIZE, LOGO_SIZE)
        pixmap.fill(Qt.GlobalColor.transparent)

        painter = QPainter(pixmap)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        painter.setBrush(QColor(0, 200, 150))
        painter.setPen(Qt.PenStyle.NoPen)
        painter.drawEllipse(10, 10, LOGO_SIZE - 20, LOGO_SIZE - 20)
        painter.end()

        return pixmap

    def _setup_animations(self) -> None:
        """Configura le animazioni."""
        # Fade in
        self.fade_in_anim = QPropertyAnimation(self, b"windowOpacity", self)
        self.fade_in_anim.setDuration(FADE_IN_MS)
        self.fade_in_anim.setStartValue(0.0)
        self.fade_in_anim.setEndValue(1.0)
        self.fade_in_anim.setEasingCurve(QEasingCurve.Type.InOutQuad)

        # Progress animation
        self.progress_anim = QPropertyAnimation(self.progress, b"value", self)
        self.progress_anim.setDuration(PROGRESS_DURATION_MS)
        self.progress_anim.setStartValue(0)
        self.progress_anim.setEndValue(100)
        self.progress_anim.setEasingCurve(QEasingCurve.Type.OutCubic)

        # Fade out
        self.fade_out_anim = QPropertyAnimation(self, b"windowOpacity", self)
        self.fade_out_anim.setDuration(FADE_OUT_MS)
        self.fade_out_anim.setStartValue(1.0)
        self.fade_out_anim.setEndValue(0.0)
        self.fade_out_anim.setEasingCurve(QEasingCurve.Type.InOutQuad)

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

        # Avvia l'animazione di fade in
        if self.fade_in_anim:
            self.fade_in_anim.start()

    def finish(self, main_window: QWidget) -> None:
        """Termina la splash screen e mostra la finestra principale."""
        if self._is_closing:
            return

        self._is_closing = True

        # Ferma tutte le animazioni e timer
        self._stop_all_animations()

        # Mostra la finestra principale
        if main_window:
            main_window.show()
            main_window.raise_()
            main_window.activateWindow()

        # Chiudi la splash
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
    # Paint: sfondo arrotondato + glow
    # ------------------------------------------------------------------
    def paintEvent(self, event: QPaintEvent) -> None:
        """Disegna lo sfondo arrotondato e l'effetto glow."""
        try:
            painter = QPainter(self)
            painter.setRenderHint(QPainter.RenderHint.Antialiasing)

            # --- SFONDO ARROTONDATO ---
            # Converti QRect in QRectF per compatibilità
            rect_f = QRectF(self.rect())
            rect_path = QPainterPath()
            rect_path.addRoundedRect(rect_f, CORNER_RADIUS, CORNER_RADIUS)
            painter.fillPath(rect_path, BG_COLOR)

            # --- EFFETTO GLOW (semplificato) ---
            center = QPointF(self.width() / 2, self.height() / 2 - 20)
            radius = LOGO_SIZE * 0.6  # Ridotto per performance
            gradient = QRadialGradient(center, radius)

            glow_color = GLOW_COLOR
            transparent_glow = QColor(glow_color.red(), glow_color.green(), glow_color.blue(), 0)

            gradient.setColorAt(0.0, glow_color)
            gradient.setColorAt(1.0, transparent_glow)

            painter.setBrush(gradient)
            painter.setPen(Qt.PenStyle.NoPen)
            painter.drawEllipse(center, radius, radius)

            painter.end()
        except Exception as e:
            print(f"Errore nel paintEvent: {e}")

        # Chiama il paintEvent del parent
        super().paintEvent(event)


    # ------------------------------------------------------------------
    # Cleanup
    # ------------------------------------------------------------------
    def closeEvent(self, event) -> None:
        """Gestisce la chiusura della finestra."""
        self._is_closing = True
        self._stop_all_animations()
        super().closeEvent(event)