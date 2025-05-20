from PyQt6.QtWidgets import QSplashScreen, QLabel, QProgressBar, QGraphicsOpacityEffect
from PyQt6.QtCore import Qt, QTimer, QPropertyAnimation, QEasingCurve, QPoint
from PyQt6.QtGui import QPixmap, QPainter, QColor, QFont, QLinearGradient, QBrush


class ModernSplashScreenPNG(QSplashScreen):
    def __init__(self, logo_path: str):
        super().__init__()
        self.setFixedSize(500, 500)
        self.setWindowFlags(Qt.WindowType.FramelessWindowHint | Qt.WindowType.SplashScreen)
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)

        # Caricamento PNG ad alta qualità
        raw_logo = QPixmap(logo_path)
        # Se si mette il logo del red team pass a 200 200
        self.logo = raw_logo.scaled(180, 180, Qt.AspectRatioMode.KeepAspectRatio, Qt.TransformationMode.SmoothTransformation) 

        # Messaggi testuali simulati stile terminale
        self.status_lines = [
            ">>> Inizializzazione moduli OWASP...",
            ">>> Parsing checklist.json...",
            ">>> Caricamento reference offline...",
            ">>> Connessione alla UI...",
            ">>> Verifica integrità categorie...",
            ">>> Caricamento completato. Avvio..."
        ]
        self.current_status_index = 0

        # Etichetta terminale
        self.status_label = QLabel(self)
        self.status_label.setGeometry(100, 370, 300, 20)
        self.status_label.setFont(QFont("Courier New", 10))
        self.status_label.setStyleSheet("color: #77ffcc; background: transparent;")
        self.status_label.setText("")

        # Timer per animare la scrittura
        self.status_timer = QTimer()
        self.status_timer.timeout.connect(self.updateStatusLine)

        # Testo 3D: font + colore
        self.title = "OWASP WSTG Checklist"
        self.loading_text = "Caricamento..."
        self.font_title = QFont("Segoe UI", 16, QFont.Weight.Bold)
        self.font_loading = QFont("Segoe UI", 11)

        # Barra di caricamento
        self.progress = QProgressBar(self)
        self.progress.setGeometry(100, 400, 300, 22)
        self.progress.setRange(0, 100)
        self.progress.setValue(0)
        self.progress.setTextVisible(False)
        self.progress.setStyleSheet("""
            QProgressBar {
                background-color: #2a2b2e;
                border: 1px solid #444;
                border-radius: 10px;
            }
            QProgressBar::chunk {
                background-color: #80bfff;
                border-radius: 10px;
            }
        """)

        # Etichetta caricamento
        self.loading_label = QLabel(self)
        self.loading_label.setGeometry(100, 430, 300, 20)
        self.loading_label.setFont(self.font_loading)
        self.loading_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.loading_label.setStyleSheet("color: #aaaaaa; background: transparent;")
        self.loading_label.setText(self.loading_text)

        # Effetto fade-in
        self.opacity_effect = QGraphicsOpacityEffect(self)
        self.setGraphicsEffect(self.opacity_effect)

        self.fade_anim = QPropertyAnimation(self.opacity_effect, b"opacity")
        self.fade_anim.setDuration(700)
        self.fade_anim.setStartValue(0.0)
        self.fade_anim.setEndValue(1.0)
        self.fade_anim.setEasingCurve(QEasingCurve.Type.InOutQuad)

    def updateStatusLine(self):
        if self.current_status_index < len(self.status_lines):
            self.status_label.setText(self.status_lines[self.current_status_index])
            self.current_status_index += 1
        else:
            self.status_timer.stop()

    def start(self):
        self.show()
        self.centerOnScreen()
        self.fade_anim.start()
        self.fade_anim.finished.connect(self.simulateProgress)
        self.status_timer.start(550)  # un messaggio ogni 0.7 secondi

    def centerOnScreen(self):
        screen_geometry = self.screen().availableGeometry()
        x = (screen_geometry.width() - self.width()) // 2
        y = (screen_geometry.height() - self.height()) // 2
        self.move(x, y)

    def simulateProgress(self):
        for i in range(1, 101):
            QTimer.singleShot(i * 33, lambda v=i: self.progress.setValue(v))

    def drawTextWithShadow(self, painter: QPainter, text: str, pos: QPoint, font: QFont):
        painter.setFont(font)
        painter.setPen(QColor(0, 0, 0, 160))
        painter.drawText(pos + QPoint(2, 2), text)
        painter.setPen(QColor("#80bfff"))
        painter.drawText(pos, text)

    def paintEvent(self, event):
        painter = QPainter(self)

        # Sfondo gradiente
        gradient = QLinearGradient(0, 0, 0, self.height())
        gradient.setColorAt(0.0, QColor("#1a1a1d"))
        gradient.setColorAt(0.5, QColor("#232429"))
        gradient.setColorAt(1.0, QColor("#2f3035"))
        painter.fillRect(self.rect(), QBrush(gradient))

        # Centro per logo
        logo_x = (self.width() - self.logo.width()) // 2
        logo_y = 130

        # Cerchio glow centrato dietro il logo
        center = QPoint(self.width() // 2, logo_y + self.logo.height() // 2)
        painter.setBrush(QColor(255, 255, 255, 25))
        painter.setPen(Qt.PenStyle.NoPen)
        painter.drawEllipse(center, 120, 120)

        # Disegna logo PNG
        painter.drawPixmap(logo_x, logo_y, self.logo)

        # Testo titolo sotto il logo, centrato dinamicamente
        painter.setFont(self.font_title)
        fm = painter.fontMetrics()
        text_width = fm.horizontalAdvance(self.title)

        title_x = (self.width() - text_width) // 2
        title_y = 85  # abbassare o alzare questo valore se serve

        self.drawTextWithShadow(painter, self.title, QPoint(title_x, title_y), self.font_title)
