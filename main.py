from PyQt6.QtWidgets import QApplication
from PyQt6.QtCore import QTimer, QEventLoop
from PyQt6.QtGui import QIcon
import sys
from ui.loading_screen import ModernSplashScreenPNG
from ui.main_window import OWASPChecklistApp, resource_path


if __name__ == "__main__":
    app = QApplication(sys.argv)
    app.setWindowIcon(QIcon(resource_path("public/icon/logo_app.png")))

    # loading screen
    splash = ModernSplashScreenPNG(resource_path("public/icon/logo_app.png"))
    splash.start()
    
    loop = QEventLoop()
    QTimer.singleShot(4000, loop.quit)
    loop.exec()

    # Finestra principale
    window = OWASPChecklistApp()
    window.show()
    splash.finish(window)

    sys.exit(app.exec())