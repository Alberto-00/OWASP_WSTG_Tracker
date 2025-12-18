"""
Custom Message Box - Modal dialogs per PyQt6
"""

from PyQt6.QtCore import Qt, QPropertyAnimation, QEasingCurve, QRectF, QTimer, pyqtProperty
from PyQt6.QtGui import QFont, QPixmap, QPainter, QColor, QLinearGradient
from PyQt6.QtWidgets import (
    QDialog, QVBoxLayout, QHBoxLayout, QLabel, QPushButton,
    QGraphicsOpacityEffect, QWidget, QApplication, QFrame
)
from PyQt6.QtSvg import QSvgRenderer

from css.theme import Theme

COLORS = Theme.COLORS


class BlurredOverlay(QWidget):
    def __init__(self, parent_window, parent=None):
        super().__init__(parent)
        self._opacity = 0.0
        self._blur_pixmap = None
        if parent_window:
            self._capture_blur(parent_window)

    def _capture_blur(self, window):
        try:
            screen = window.screen()
            if screen:
                pix = screen.grabWindow(window.winId(), 0, 0, window.width(), window.height())
                w, h = pix.width(), pix.height()
                if w > 0 and h > 0:
                    self._blur_pixmap = pix.scaled(
                        max(w // 10, 1), max(h // 10, 1),
                        Qt.AspectRatioMode.IgnoreAspectRatio,
                        Qt.TransformationMode.SmoothTransformation
                    ).scaled(w, h, Qt.AspectRatioMode.IgnoreAspectRatio,
                             Qt.TransformationMode.SmoothTransformation)
        except:
            pass

    def set_opacity(self, v):
        self._opacity = max(0.0, min(1.0, v))
        self.update()

    def get_opacity(self):
        return self._opacity

    opacity = pyqtProperty(float, get_opacity, set_opacity)

    def paintEvent(self, e):
        p = QPainter(self)
        if self._blur_pixmap and self._opacity > 0:
            p.setOpacity(self._opacity)
            p.drawPixmap(0, 0, self._blur_pixmap)
        p.setOpacity(1.0)
        p.fillRect(self.rect(), QColor(0, 0, 0, int(180 * self._opacity)))
        p.end()


class CustomMessageBox(QDialog):
    ICONS = {
        'danger': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        'warning': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        'success': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        'info': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    }

    def __init__(self, parent=None, modal_type='info', title='', message='',
                 confirm_text='OK', cancel_text='Annulla', show_cancel=True,
                 on_confirm=None, on_cancel=None):
        main_win = parent.window() if parent else None
        super().__init__(main_win)

        self.modal_type = modal_type
        self.on_confirm_callback = on_confirm
        self.on_cancel_callback = on_cancel
        self.result_confirmed = False
        self._parent_window = main_win

        self.setModal(True)
        self.setWindowFlags(Qt.WindowType.FramelessWindowHint | Qt.WindowType.Dialog)
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)

        self._build_ui(title, message, confirm_text, cancel_text, show_cancel)
        self._setup_anims()

    def _build_ui(self, title, message, confirm_text, cancel_text, show_cancel):
        if self._parent_window:
            self.setFixedSize(self._parent_window.size())
        else:
            scr = QApplication.primaryScreen()
            if scr:
                self.setFixedSize(scr.availableGeometry().size())

        self.overlay = BlurredOverlay(self._parent_window, self)
        self.overlay.setGeometry(0, 0, self.width(), self.height())

        self.container = QFrame(self)
        self.container.setObjectName("modalContainer")
        self.container.setFixedWidth(400)
        self.container.setStyleSheet(f"""
            QFrame#modalContainer {{
                background: qlineargradient(x1:0, y1:0, x2:1, y2:1,
                    stop:0 {COLORS['bg_secondary']}, stop:1 {COLORS['bg_tertiary']});
                border: 1px solid {COLORS['border_primary']};
                border-radius: 16px;
            }}
        """)

        lay = QVBoxLayout(self.container)
        lay.setContentsMargins(32, 24, 32, 24)
        lay.setSpacing(14)

        # Icona
        self.icon_lbl = QLabel()
        self.icon_lbl.setFixedSize(52, 52)
        self.icon_lbl.setStyleSheet("background:transparent; border:none;")
        self._draw_icon()
        lay.addWidget(self.icon_lbl, 0, Qt.AlignmentFlag.AlignCenter)

        # Titolo
        t_lbl = QLabel(title)
        t_lbl.setFont(QFont('Segoe UI', 15, QFont.Weight.Bold))
        t_lbl.setAlignment(Qt.AlignmentFlag.AlignCenter)
        t_lbl.setStyleSheet(f"color:{COLORS['text_white']}; background:transparent; border:none;")
        lay.addWidget(t_lbl)

        # Messaggio
        m_lbl = QLabel(message)
        m_lbl.setFont(QFont('Segoe UI', 10))
        m_lbl.setAlignment(Qt.AlignmentFlag.AlignCenter)
        m_lbl.setWordWrap(True)
        m_lbl.setStyleSheet(f"color:{COLORS['text_secondary']}; background:transparent; border:none;")
        lay.addWidget(m_lbl)

        lay.addSpacing(10)

        # BOTTONI
        btn_lay = QHBoxLayout()
        btn_lay.setContentsMargins(0, 0, 0, 0)
        btn_lay.setSpacing(16)
        btn_lay.addStretch()

        if show_cancel:
            self.cancel_btn = QPushButton(cancel_text)
            self.cancel_btn.setFixedSize(120, 36)
            self.cancel_btn.setCursor(Qt.CursorShape.PointingHandCursor)
            self.cancel_btn.setStyleSheet(f"""
                QPushButton {{
                    background-color: {COLORS['bg_tertiary']};
                    color: {COLORS['text_primary']};
                    border: 1px solid {COLORS['border_primary']};
                    border-radius: 8px;
                    font-size: 12px;
                    font-weight: 600;
                }}
                QPushButton:hover {{
                    background-color: {COLORS['bg_card']};
                    color: {COLORS['text_white']};
                }}
            """)
            self.cancel_btn.clicked.connect(self._cancel)
            btn_lay.addWidget(self.cancel_btn)

        # Mappa tipo -> colore
        type_colors = {
            'danger': (COLORS['danger'], COLORS['red_dark']),
            'warning': (COLORS['warning'], COLORS['orange_dark']),
            'success': (COLORS['success'], COLORS['green_dark']),
            'info': (COLORS['info'], COLORS['blue_dark']),
        }
        color, color_dark = type_colors.get(self.modal_type, (COLORS['info'], COLORS['blue_dark']))

        self.confirm_btn = QPushButton(confirm_text)
        self.confirm_btn.setFixedSize(120, 36)
        self.confirm_btn.setCursor(Qt.CursorShape.PointingHandCursor)
        self.confirm_btn.setStyleSheet(f"""
            QPushButton {{
                background-color: {color};
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 12px;
                font-weight: 600;
            }}
            QPushButton:hover {{
                background-color: {color_dark};
            }}
        """)
        self.confirm_btn.clicked.connect(self._confirm)
        btn_lay.addWidget(self.confirm_btn)

        btn_lay.addStretch()
        lay.addLayout(btn_lay)

        self.container.adjustSize()
        self._center()

    def _draw_icon(self):
        sz = 52
        pix = QPixmap(sz, sz)
        pix.fill(Qt.GlobalColor.transparent)
        p = QPainter(pix)
        p.setRenderHint(QPainter.RenderHint.Antialiasing)

        color = QColor(COLORS.get(self.modal_type, COLORS['info']))
        grad = QLinearGradient(0, 0, sz, sz)
        c1, c2 = QColor(color), QColor(color)
        c1.setAlpha(50)
        c2.setAlpha(12)
        grad.setColorAt(0, c1)
        grad.setColorAt(1, c2)
        p.setBrush(grad)
        p.setPen(Qt.PenStyle.NoPen)
        p.drawEllipse(0, 0, sz, sz)

        svg = self.ICONS.get(self.modal_type, self.ICONS['info'])
        svg = svg.replace('stroke="currentColor"', f'stroke="{color.name()}"')
        rend = QSvgRenderer(svg.encode())
        rend.render(p, QRectF(12, 12, 28, 28))
        p.end()
        self.icon_lbl.setPixmap(pix)

    def _setup_anims(self):
        self.ov_anim = QPropertyAnimation(self.overlay, b"opacity")
        self.ov_anim.setDuration(250)
        self.ov_anim.setEasingCurve(QEasingCurve.Type.OutCubic)

        self.c_eff = QGraphicsOpacityEffect(self.container)
        self.container.setGraphicsEffect(self.c_eff)
        self.c_eff.setOpacity(0)

        self.c_anim = QPropertyAnimation(self.c_eff, b"opacity")
        self.c_anim.setDuration(250)
        self.c_anim.setEasingCurve(QEasingCurve.Type.OutCubic)

    def showEvent(self, e):
        super().showEvent(e)
        if self._parent_window:
            self.setGeometry(self._parent_window.geometry())
            self.setFixedSize(self._parent_window.size())
            self.overlay.setGeometry(0, 0, self.width(), self.height())
        self._center()
        self.ov_anim.setStartValue(0.0)
        self.ov_anim.setEndValue(1.0)
        self.ov_anim.start()
        self.c_anim.setStartValue(0.0)
        self.c_anim.setEndValue(1.0)
        self.c_anim.start()

    def _center(self):
        self.container.move(
            (self.width() - self.container.width()) // 2,
            (self.height() - self.container.height()) // 2
        )

    def resizeEvent(self, e):
        super().resizeEvent(e)
        self.overlay.setGeometry(0, 0, self.width(), self.height())
        self._center()

    def _confirm(self):
        self.result_confirmed = True
        if self.on_confirm_callback:
            self.on_confirm_callback()
        self._close_anim()

    def _cancel(self):
        self.result_confirmed = False
        if self.on_cancel_callback:
            self.on_cancel_callback()
        self._close_anim()

    def _close_anim(self):
        self.ov_anim.setStartValue(1.0)
        self.ov_anim.setEndValue(0.0)
        self.ov_anim.start()
        self.c_anim.setStartValue(1.0)
        self.c_anim.setEndValue(0.0)
        self.c_anim.start()
        QTimer.singleShot(250, lambda: self.accept() if self.result_confirmed else self.reject())

    def keyPressEvent(self, e):
        if e.key() == Qt.Key.Key_Escape:
            self._cancel()
        else:
            super().keyPressEvent(e)

    def mousePressEvent(self, e):
        if not self.container.geometry().contains(e.pos()):
            self._cancel()

    @staticmethod
    def danger(parent, title, message, confirm_text='Elimina', on_confirm=None):
        d = CustomMessageBox(parent, 'danger', title, message, confirm_text, 'Annulla', True, on_confirm)
        d.exec()
        return d.result_confirmed

    @staticmethod
    def warning(parent, title, message, confirm_text='Continua', on_confirm=None):
        d = CustomMessageBox(parent, 'warning', title, message, confirm_text, 'Annulla', True, on_confirm)
        d.exec()
        return d.result_confirmed

    @staticmethod
    def success(parent, title, message, confirm_text='OK', on_confirm=None):
        d = CustomMessageBox(parent, 'success', title, message, confirm_text, '', False, on_confirm)
        d.exec()
        return d.result_confirmed

    @staticmethod
    def info(parent, title, message, confirm_text='OK', on_confirm=None):
        d = CustomMessageBox(parent, 'info', title, message, confirm_text, '', False, on_confirm)
        d.exec()
        return d.result_confirmed
