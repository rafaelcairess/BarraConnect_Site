const loadPartials = async () => {
    const cacheBuster = 'v=2';
    const placeholders = document.querySelectorAll('[data-include]');
    const requests = Array.from(placeholders).map(async (placeholder) => {
        const path = placeholder.dataset.include;
        if (!path) {
            return;
        }

        try {
            const url = path.includes('?') ? `${path}&${cacheBuster}` : `${path}?${cacheBuster}`;
            const response = await fetch(url, { cache: 'no-store' });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const buffer = await response.arrayBuffer();
            const decoder = new TextDecoder('utf-8');
            const html = decoder.decode(buffer);
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

    const selection = {
        profile: 'residencial',
        plan: null,
        router: 'Sem roteador',
    };

    const profileLabels = {
        residencial: 'Residencial',
        comercial: 'Comercial',
    };

    const updateSummary = () => {};

    const normalizeName = (value) => {
        if (!value) {
            return [];
        }
        const particles = new Set(['de', 'da', 'do', 'dos', 'das', 'e']);
        return value
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .split(/\s+/)
            .map((part) => part.replace(/[^a-z]/g, ''))
            .filter((part) => part.length > 0 && !particles.has(part));
    };

    const generatePppoeUser = (fullName) => {
        const parts = normalizeName(fullName);
        if (parts.length === 0) {
            return '';
        }
        const first = parts[0];
        if (parts.length === 1) {
            return first;
        }
        if (parts.length === 2) {
            return `${first}${parts[1][0]}`;
        }
        const penultimate = parts[parts.length - 2];
        const last = parts[parts.length - 1];
        return `${first}${penultimate[0]}${last[0]}`;
    };

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

        selection.profile = variant;
        updateSummary();
    };

    const initialVariant = document.querySelector('[data-variant-toggle].active-tab')?.dataset.variantToggle || 'residencial';
    setVariant(initialVariant);

    variantButtons.forEach((button) => {
        button.addEventListener('click', () => {
            setVariant(button.dataset.variantToggle);
        });
    });

    const planButtons = document.querySelectorAll('[data-plan-select]');
    planButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const plan = button.dataset.planSelect;
            if (plan) {
                selection.plan = plan;
                updateSummary();
            }

            planButtons.forEach((btn) => {
                btn.classList.remove('ring-2', 'ring-brand-primary');
            });
            button.classList.add('ring-2', 'ring-brand-primary');

            if (selection.profile === 'comercial') {
                const mikrotikCard = document.getElementById('mikrotik-card');
                mikrotikCard?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
                const solutionsSection = document.getElementById('solucao');
                solutionsSection?.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    const routerButtons = document.querySelectorAll('[data-router-select]');
    routerButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const router = button.dataset.routerSelect;
            if (!router) {
                return;
            }

            if (selection.router === router) {
                selection.router = 'Sem roteador';
                routerButtons.forEach((btn) => {
                    btn.classList.remove('ring-2', 'ring-brand-primary');
                });
                updateSummary();
                return;
            }

            selection.router = router;
            updateSummary();

            routerButtons.forEach((btn) => {
                btn.classList.remove('ring-2', 'ring-brand-primary');
            });
            button.classList.add('ring-2', 'ring-brand-primary');

            const contactSection = document.getElementById('contato');
            contactSection?.scrollIntoView({ behavior: 'smooth' });
        });
    });

    const whatsappButtons = document.querySelectorAll('[data-whatsapp-send]');
    whatsappButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const profileText = profileLabels[selection.profile] || 'Residencial';
            const planText = selection.plan || 'Não informado';
            const routerText = selection.router || 'Sem roteador';
            const message = [
                'Olá! Gostaria de falar com o escritório.',
                '',
                '📌 *Resumo do pedido*',
                `• Perfil: ${profileText}`,
                `• Plano: ${planText}`,
                `• Roteador: ${routerText}`,
            ].join('\n');
            const url = `https://wa.me/557799390980?text=${encodeURIComponent(message)}`;
            window.open(url, '_blank', 'noopener');
        });
    });

    const cadastroForm = document.getElementById('cadastro-form');
    if (cadastroForm) {
        const nameInput = document.getElementById('cadastro-nome');
        const cpfInput = document.getElementById('cadastro-cpf');
        const planSelect = document.getElementById('cadastro-plano');
        const dueSelect = document.getElementById('cadastro-vencimento');
        const routerSelect = document.getElementById('cadastro-roteador');
        const consentInput = document.getElementById('cadastro-consent');

        const sanitizeCpf = () => {
            if (!cpfInput) {
                return;
            }
            const digits = cpfInput.value.replace(/\D/g, '').slice(0, 11);
            cpfInput.value = digits;
        };

        const updateConsentValidity = () => {
            if (!consentInput) {
                return;
            }
            consentInput.setCustomValidity(consentInput.checked ? '' : 'Confirme o consentimento para enviar.');
        };

        cpfInput?.addEventListener('input', sanitizeCpf);
        consentInput?.addEventListener('change', updateConsentValidity);
        updateConsentValidity();

        if (selection.plan && planSelect) {
            planSelect.value = selection.plan;
        }
        if (selection.router && routerSelect) {
            routerSelect.value = selection.router;
        }

        cadastroForm.addEventListener('submit', (event) => {
            event.preventDefault();
            updateConsentValidity();
            sanitizeCpf();

            if (!cadastroForm.checkValidity()) {
                cadastroForm.reportValidity();
                return;
            }

            const fullName = nameInput?.value.trim() || '';
            const cpfRaw = cpfInput?.value.trim() || '';
            const plan = planSelect?.value || 'Não informado';
            const due = dueSelect?.value || 'Não informado';
            const router = routerSelect?.value || 'Sem roteador';
            const pppoeUser = generatePppoeUser(fullName);

            const message = [
                'Novo cadastro (site)',
                `Nome: ${fullName}`,
                `CPF: ${cpfRaw}`,
                `Plano: ${plan}`,
                `Vencimento: dia ${due}`,
                `Roteador: ${router}`,
                `PPPoE usuário: ${pppoeUser || 'Não informado'}`,
            ].join('\n');

            const url = `https://wa.me/557799390980?text=${encodeURIComponent(message)}`;
            window.open(url, '_blank', 'noopener');
        });
    }

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

    updateSummary();
};

document.addEventListener('DOMContentLoaded', async () => {
    await loadPartials();
    initUI();
});
