const loadPartials = async () => {
    const placeholders = document.querySelectorAll('[data-include]');
    const requests = Array.from(placeholders).map(async (placeholder) => {
        const path = placeholder.dataset.include;
        if (!path) {
            return;
        }

        try {
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const html = await response.text();
            placeholder.innerHTML = html;
        } catch (error) {
            console.error(`Failed to load partial: ${path}`, error);
        }
    });

    await Promise.all(requests);
};

const initUI = () => {
    if (window.lucide?.createIcons) {
        lucide.createIcons();
    }

    const root = document.documentElement;
    const themeButtons = document.querySelectorAll('[data-theme-toggle]');
    const menuToggle = document.querySelector('[data-menu-toggle]');
    const menuTargetId = menuToggle?.dataset.menuTarget;
    const menu = menuTargetId ? document.getElementById(menuTargetId) : null;

    const updateThemeButtons = () => {
        const isDark = root.classList.contains('dark');
        themeButtons.forEach((button) => {
            button.setAttribute('aria-pressed', String(isDark));
        });
    };

    const setTheme = (mode) => {
        if (mode === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        localStorage.theme = mode;
        updateThemeButtons();
    };

    const getPreferredTheme = () => {
        if (localStorage.theme === 'dark' || localStorage.theme === 'light') {
            return localStorage.theme;
        }
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    };

    setTheme(getPreferredTheme());

    themeButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const nextTheme = root.classList.contains('dark') ? 'light' : 'dark';
            setTheme(nextTheme);
        });
    });

    if (menuToggle && menu) {
        menuToggle.addEventListener('click', () => {
            const isHidden = menu.classList.contains('hidden');
            menu.classList.toggle('hidden');
            menuToggle.setAttribute('aria-expanded', String(isHidden));
        });

        menu.querySelectorAll('a[href^="#"]').forEach((link) => {
            link.addEventListener('click', () => {
                if (!menu.classList.contains('hidden')) {
                    menu.classList.add('hidden');
                    menuToggle.setAttribute('aria-expanded', 'false');
                }
            });
        });
    }

    const variantButtons = document.querySelectorAll('[data-variant-toggle]');
    const variantSections = document.querySelectorAll('[data-variant]');

    const setVariant = (variant) => {
        variantButtons.forEach((button) => {
            const isActive = button.dataset.variantToggle === variant;
            button.classList.toggle('active-tab', isActive);
            button.classList.toggle('inactive-tab', !isActive);
            button.setAttribute('aria-pressed', String(isActive));
        });

        variantSections.forEach((section) => {
            const isActive = section.dataset.variant === variant;
            section.classList.toggle('hidden', !isActive);
            section.setAttribute('aria-hidden', String(!isActive));
        });
    };

    const initialVariant = document.querySelector('[data-variant-toggle].active-tab')?.dataset.variantToggle || 'residencial';
    setVariant(initialVariant);

    variantButtons.forEach((button) => {
        button.addEventListener('click', () => {
            setVariant(button.dataset.variantToggle);
        });
    });

    const collapseButtons = document.querySelectorAll('[data-collapse-toggle]');
    collapseButtons.forEach((button) => {
        const targetId = button.dataset.collapseToggle;
        const arrowId = button.dataset.collapseArrow;
        const section = targetId ? document.getElementById(targetId) : null;
        const arrow = arrowId ? document.getElementById(arrowId) : null;

        if (!section) {
            return;
        }

        button.addEventListener('click', () => {
            const isHidden = section.classList.contains('hidden');
            section.classList.toggle('hidden');
            section.classList.toggle('fade-in', isHidden);
            arrow?.classList.toggle('rotate-180', isHidden);
            button.setAttribute('aria-expanded', String(isHidden));
        });
    });
};

document.addEventListener('DOMContentLoaded', async () => {
    await loadPartials();
    initUI();
});
