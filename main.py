from PyQt6.QtWidgets import QApplication
from PyQt6.QtCore import QTimer, QEventLoop
import sys
from ui.loading_screen import ModernSplashScreenPNG
from ui.main_window import OWASPChecklistApp


if __name__ == "__main__":
    app = QApplication(sys.argv)

    # loading screen
    splash = ModernSplashScreenPNG("public/asset/logo.png")
    splash.start()
    
    loop = QEventLoop()
    QTimer.singleShot(4000, loop.quit)
    loop.exec()

    # Finestra principale
    window = OWASPChecklistApp()
    window.show()
    splash.finish(window)

    sys.exit(app.exec())
