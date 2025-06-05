import sys
import traceback
from pathlib import Path

from PyQt6.QtCore import QTimer
from PyQt6.QtGui import QIcon
from PyQt6.QtWidgets import QApplication, QMessageBox

from ui.loading_screen import ModernSplashScreenPNG
from ui.owasp_screen import OWASPChecklistApp


def resource_path(*relative_parts):
    """
    Restituisce un path assoluto in modo compatibile con PyInstaller e sviluppo locale.
    Usa Pathlib e accetta path separati.
    """
    if hasattr(sys, '_MEIPASS'):
        base_path = Path(sys._MEIPASS)
    else:
        base_path = Path(__file__).resolve().parent    # directory `code/`

    return base_path.joinpath(*relative_parts)


LOGO_PNG = resource_path("public", "icon", "logo_app.png")


def main() -> None:
    """Funzione di avvio principale dell'applicazione."""
    try:
        app = QApplication(sys.argv)
        app.setApplicationName("OWASP Checklist")

        # Gestione globale delle eccezioni
        def handle_exception(exc_type, exc_value, exc_traceback):
            print("Eccezione non gestita:")
            print(''.join(traceback.format_exception(exc_type, exc_value, exc_traceback)))

        sys.excepthook = handle_exception

        # Imposta l'icona se disponibile
        if LOGO_PNG.exists():
            app.setWindowIcon(QIcon(str(LOGO_PNG)))
        else:
            print(f"Avviso: Logo non trovato in: {LOGO_PNG}")

        # Variabili di ciclo di vita
        splash = None
        main_window = None

        def create_splash():
            """Crea e avvia la splash screen."""
            nonlocal splash
            try:
                splash = ModernSplashScreenPNG(str(LOGO_PNG))
                splash.finished.connect(lambda: print("Splash screen terminata"))
                return splash
            except Exception as e:
                print(f"Errore nella creazione della splash screen: {e}")
                traceback.print_exc()
                return None

        def show_main():
            """Istanzia e mostra la finestra principale."""
            nonlocal main_window, splash
            try:
                main_window = OWASPChecklistApp()

                if splash:
                    splash.finish(main_window)

                main_window.show()

            except Exception as e:
                print(f"Errore nell'apertura della finestra principale: {e}")
                traceback.print_exc()

                # Messaggio di errore critico
                msg = QMessageBox()
                msg.setIcon(QMessageBox.Icon.Critical)
                msg.setWindowTitle("Errore critico")
                msg.setText("Errore nell'avvio dell'applicazione")
                msg.setDetailedText(str(e))
                msg.exec()

                if splash:
                    splash.close()
                app.quit()

        # Avvio splash screen
        splash = create_splash()
        if splash:
            splash.start()
            QTimer.singleShot(splash.total_duration_ms(), show_main)
        else:
            # Se la splash fallisce chiude
            print("Splash screen non disponibile")
            exit(1)

        # Event loop
        exit_code = app.exec()
        print(f"Applicazione terminata con codice: {exit_code}")
        sys.exit(exit_code)

    except Exception as e:
        print(f"Errore critico nell'avvio dell'applicazione: {e}")
        traceback.print_exc()
        sys.exit(-1)


if __name__ == "__main__":
    main()
