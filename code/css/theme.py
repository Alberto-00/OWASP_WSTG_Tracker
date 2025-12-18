"""
Theme Configuration - Modern Dark Theme Design System
Colori, spacing, tipografia e configurazioni centralizzate per l'applicazione PyQt6
"""


class Theme:
    """Design System centralizzato per l'applicazione OWASP WSTG Tracker"""

    # ============================================
    # PALETTE COLORI PRINCIPALE
    # ============================================
    COLORS = {
        # === SOFT DARK GRAYS (JetBrains-like) ===
        'bg_primary': '#2B2D31',  # base window
        'bg_secondary': '#32343A',  # panels / inputs
        'bg_tertiary': '#3A3D44',  # hovers
        'bg_card': '#2F3136',  # cards
        'bg_input': '#32343A',  # Input background
        'bg_input_hover': '#3A3D44',  # Input hover
        'bg_input_focus': '#3F444A',  # Input focus
        'bg_elevated': '#3A3D44',  # Elementi elevati

        # === BORDI ===
        'border': '#3F444A',  # borders
        'border_light': '#5A616B',  # lighter borders
        'border_primary': '#3F444A',
        'border_secondary': '#3A3D44',
        'border_focus': '#6366f1',  # Focus state
        'border_hover': '#5A616B',

        # === TESTO ===
        'text_primary': '#E6E6E6',
        'text_secondary': '#B4B8BF',
        'text_muted': '#8A9099',
        'text_white': '#ffffff',
        'text_inverse': '#2B2D31',

        # === ACCENTS (Purple/Indigo) ===
        'accent_primary': '#6366f1',
        'accent_secondary': '#8b5cf6',
        'accent_glow': '#a78bfa',
        'info': '#6366f1',
        'purple': '#8b5cf6',
        'purple_light': '#a78bfa',
        'purple_dark': '#7c3aed',
        'indigo': '#6366f1',
        'indigo_light': '#818cf8',
        'indigo_dark': '#4f46e5',

        # === SEMANTIC COLORS ===
        'success': '#66BB6A',
        'success_dark': '#2E7D32',
        'success_light': '#A5D6A7',
        'warning': '#f59e0b',
        'error': '#ef4444',
        'danger': '#ef4444',

        'red_dark': '#dc2626',
        'orange_dark': '#ea580c',
        'green_dark': '#2E7D32',

        'blue_main': '#4FC3F7',
        'blue_dark': '#0277BD',
        'blue_light': '#B3E5FC',

        # === OVERLAY ===
        'overlay': 'rgba(43, 45, 49, 0.85)',
        'overlay_light': 'rgba(43, 45, 49, 0.6)',

        # === SELEZIONE ===
        'selection_bg': '#6366f1',
        'selection_bg_alpha': 0.25,
        'selection_border': '#818cf8',
        'hover_bg': '#4FC3F7',
        'hover_bg_alpha': 0.16,

        # === STATUS ITEM COLORS ===
        'status_done_bg': '#66BB6A',
        'status_done_alpha': 0.18,
        'status_progress_bg': '#8b5cf6',
        'status_progress_alpha': 0.18,
        'status_pending_bg': 'transparent',
    }

    # ============================================
    # SPACING SYSTEM (8px base)
    # ============================================
    SPACING = {
        'xs': 4,
        'sm': 8,
        'md': 16,
        'lg': 24,
        'xl': 32,
        'xxl': 48,
    }

    # ============================================
    # BORDER RADIUS
    # ============================================
    RADIUS = {
        'xs': 6,
        'sm': 8,
        'md': 10,
        'lg': 12,
        'xl': 16,
        'full': 9999,
    }

    # ============================================
    # TYPOGRAPHY
    # ============================================
    TYPOGRAPHY = {
        'font_family': "'Segoe UI', 'Inter', 'SF Pro Display', -apple-system, system-ui, sans-serif",
        'font_mono': "'Inconsolata', 'SF Mono', 'Consolas', 'Monaco', monospace",
        'font_size_xs': 10,
        'font_size_sm': 12,
        'font_size_md': 13,
        'font_size_lg': 15,
        'font_size_xl': 18,
        'font_size_xxl': 24,
        'font_weight_normal': 400,
        'font_weight_medium': 500,
        'font_weight_semibold': 600,
        'font_weight_bold': 700,
    }

    # ============================================
    # CONFIGURAZIONE MODAL
    # ============================================
    MODAL = {
        'container_radius': 16,
        'container_padding': 32,
        'container_width': 420,
        'fade_duration': 250,
        'scale_duration': 300,
    }

    # ============================================
    # ICONE PER TIPO MODAL
    # ============================================
    MODAL_ICONS = {
        'danger': {
            'bg_gradient': ('rgba(239, 68, 68, 0.2)', 'rgba(239, 68, 68, 0.05)'),
            'color': '#ef4444',
        },
        'warning': {
            'bg_gradient': ('rgba(245, 158, 11, 0.2)', 'rgba(245, 158, 11, 0.05)'),
            'color': '#f59e0b',
        },
        'success': {
            'bg_gradient': ('rgba(102, 187, 106, 0.2)', 'rgba(102, 187, 106, 0.05)'),
            'color': '#66BB6A',
        },
        'info': {
            'bg_gradient': ('rgba(99, 102, 241, 0.2)', 'rgba(99, 102, 241, 0.05)'),
            'color': '#6366f1',
        },
    }

    # ============================================
    # CONFIGURAZIONE STATUS TEST
    # ============================================
    STATUS_CONFIG = {
        'done': {'icon': '✅', 'color': COLORS['success'], 'alpha': 18},
        'in-progress': {'icon': '⏳', 'color': COLORS['purple'], 'alpha': 18},
        'pending': {'icon': '◻', 'color': 'transparent', 'alpha': 0},
    }

    # ============================================
    # LEVEL COLORS (severity)
    # ============================================
    LEVEL_COLORS = {
        'critico': '#ef4444',
        'alto': '#f59e0b',
        'medio': '#fbbf24',
        'basso': '#66BB6A',
    }

    # ============================================
    # TRANSIZIONI
    # ============================================
    TRANSITIONS = {
        'fast': 150,
        'normal': 250,
        'slow': 400,
    }

    # ============================================
    # HELPER METHODS
    # ============================================
    @classmethod
    def get_color(cls, name: str) -> str:
        """Ottiene un colore dal tema"""
        return cls.COLORS.get(name, cls.COLORS['text_primary'])

    @classmethod
    def rgba(cls, hex_color: str, alpha: float) -> str:
        """Converte colore hex in rgba"""
        hex_color = hex_color.lstrip('#')
        r = int(hex_color[0:2], 16)
        g = int(hex_color[2:4], 16)
        b = int(hex_color[4:6], 16)
        return f'rgba({r}, {g}, {b}, {alpha})'

    @classmethod
    def get_status_config(cls, status: str) -> dict:
        """Ottiene la configurazione per uno stato"""
        return cls.STATUS_CONFIG.get(status, cls.STATUS_CONFIG['pending'])

    @classmethod
    def get_modal_icon_config(cls, modal_type: str) -> dict:
        """Ottiene la configurazione icona per un tipo di modal"""
        return cls.MODAL_ICONS.get(modal_type, cls.MODAL_ICONS['info'])