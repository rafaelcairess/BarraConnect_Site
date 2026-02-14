/*
Passo a passo geral:
1) loadPartials() carrega os arquivos HTML marcados com data-include.
2) initUI() inicializa menus, selecoes e formularios.
3) Os formularios geram a mensagem e abrem o WhatsApp do escritorio.
4) No DOMContentLoaded, carregamos os parciais e ativamos a UI.
*/

// Carrega os parciais (header, sections, footer) usando fetch e injeta no DOM.
const loadPartials = async () => {
    const cacheBuster = 'v=2';
    const placeholders = document.querySelectorAll('[data-include]');
    const requests = Array.from(placeholders).map(async (placeholder) => {
        const path = placeholder.dataset.include;
        if (!path) {
            return;
        }

        try {
            // Evita cache para atualizar sempre que o arquivo mudar.
            const url = path.includes('?') ? `${path}&${cacheBuster}` : `${path}?${cacheBuster}`;
            const response = await fetch(url, { cache: 'no-store' });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            // Garante leitura em UTF-8 para nao quebrar acentuacao.
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

// Inicializa interacoes e formularios depois que os parciais entram no DOM.
const initUI = () => {
    // 1) Ativa os icones do Lucide.
    if (window.lucide?.createIcons) {
        lucide.createIcons();
    }

    // 2) Menu mobile (abre/fecha).
    const root = document.documentElement;
    const menuToggle = document.querySelector('[data-menu-toggle]');
    const menuTargetId = menuToggle?.dataset.menuTarget;
    const menu = menuTargetId ? document.getElementById(menuTargetId) : null;


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

    // 3) Tabs/variantes (Residencial/Comercial) e estado das escolhas.
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

    // 4) Formatacao de data/hora para a mensagem do WhatsApp.
    const formatVisitDate = (value) => {
        if (!value) {
            return 'Não informado';
        }
        const [year, month, day] = value.split('-').map(Number);
        if (!year || !month || !day) {
            return value;
        }
        const date = new Date(year, month - 1, day);
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
        });
    };

    const formatVisitTime = (value) => {
        if (!value) {
            return 'Não informado';
        }
        const [hourRaw, minuteRaw] = value.split(':');
        const hour = Number(hourRaw);
        const minute = minuteRaw ?? '00';
        const normalizedHour = Number.isNaN(hour) ? hourRaw : String(hour).padStart(2, '0');
        let period = 'da tarde';
        if (hour < 12) {
            period = 'da manhã';
        } else if (hour >= 18) {
            period = 'da noite';
        }
        return `${normalizedHour}:${minute} ${period}`;
    };

    // Limita horarios conforme regra do suporte/tecnico.
    const isTimeAllowed = (value) => {
        if (!value) {
            return false;
        }
        return (value >= '08:30' && value <= '11:30') || (value >= '14:00' && value <= '18:00');
    };

    // 5) Alterna abas de perfil.
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

    // 6) Clique nos planos.
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

    // 7) Clique nos roteadores.
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

    // 8) Botao rapido de WhatsApp (resumo rapido).
    const whatsappButtons = document.querySelectorAll('[data-whatsapp-send]');
    whatsappButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const profileText = profileLabels[selection.profile] || 'Residencial';
            const planText = selection.plan || 'Não informado';
            const routerText = selection.router || 'Sem roteador';
            const message = [
                '👋 Olá! Preciso de suporte.',
                '',
                '📌 *Resumo do pedido*',
                `👤 Perfil: ${profileText}`,
                `📶 Plano: ${planText}`,
                `📡 Roteador: ${routerText}`,
            ].join('\n');
            const url = `https://wa.me/557799390980?text=${encodeURIComponent(message)}`;
            window.open(url, '_blank', 'noopener');
        });
    });

    // 9) Formulario de cadastro (envia dados para o WhatsApp).
    const cadastroForm = document.getElementById('cadastro-form');
    if (cadastroForm) {
        const nameInput = document.getElementById('cadastro-nome');
        const cpfInput = document.getElementById('cadastro-cpf');
        const planSelect = document.getElementById('cadastro-plano');
        const dueSelect = document.getElementById('cadastro-vencimento');
        const routerSelect = document.getElementById('cadastro-roteador');
        const routerInputs = Array.from(document.querySelectorAll('input[name="roteador"]'));
        const consentInput = document.getElementById('cadastro-consent');
        const streetInput = document.getElementById('cadastro-rua');
        const neighborhoodInput = document.getElementById('cadastro-bairro');
        const localitySelect = document.getElementById('cadastro-localidade');
        const referenceInput = document.getElementById('cadastro-referencia');
        const visitInput = document.getElementById('cadastro-visita');
        const timeInput = document.getElementById('cadastro-horario');

        const setRequiredMessage = (input, message) => {
            if (!input) {
                return;
            }
            input.setCustomValidity(input.value ? '' : message);
        };

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

        const updateTimeValidity = () => {
            if (!timeInput) {
                return;
            }
            if (!timeInput.value) {
            timeInput.setCustomValidity('Selecione o horário da visita.');
                return;
            }
            timeInput.setCustomValidity(
                isTimeAllowed(timeInput.value)
                    ? ''
                    : 'Horários disponíveis para técnico e suporte: 08:30–11:30 e 14:00–18:00.'
            );
        };

        const updateRouterValidity = () => {
            if (routerInputs.length === 0) {
                setRequiredMessage(routerSelect, 'Selecione o roteador.');
                return;
            }

            const firstRadio = routerInputs[0];
            const isChecked = routerInputs.some((input) => input.checked);
            if (firstRadio) {
                firstRadio.setCustomValidity(isChecked ? '' : 'Selecione o roteador.');
            }
        };

        const updateRequiredValidity = () => {
            setRequiredMessage(nameInput, 'Informe o nome completo.');
            setRequiredMessage(cpfInput, 'Informe o CPF.');
            setRequiredMessage(planSelect, 'Selecione um plano.');
            setRequiredMessage(dueSelect, 'Selecione o vencimento.');
            updateRouterValidity();
            setRequiredMessage(streetInput, 'Informe a rua.');
            setRequiredMessage(visitInput, 'Selecione a data da visita.');
            setRequiredMessage(timeInput, 'Selecione o horário da visita.');
        };

        // Eventos de validacao em tempo real.
        cpfInput?.addEventListener('input', () => {
            sanitizeCpf();
            setRequiredMessage(cpfInput, 'Informe o CPF.');
        });
        nameInput?.addEventListener('input', () => setRequiredMessage(nameInput, 'Informe o nome completo.'));
        planSelect?.addEventListener('change', () => setRequiredMessage(planSelect, 'Selecione um plano.'));
        dueSelect?.addEventListener('change', () => setRequiredMessage(dueSelect, 'Selecione o vencimento.'));
        routerSelect?.addEventListener('change', () => setRequiredMessage(routerSelect, 'Selecione o roteador.'));
        streetInput?.addEventListener('input', () => setRequiredMessage(streetInput, 'Informe a rua.'));
        visitInput?.addEventListener('change', () => setRequiredMessage(visitInput, 'Selecione a data da visita.'));
        timeInput?.addEventListener('change', updateTimeValidity);
        consentInput?.addEventListener('change', updateConsentValidity);

        routerInputs.forEach((input) => {
            input.addEventListener('change', () => {
                routerInputs.forEach((item) => {
                    item.closest('label')?.classList.remove('ring-2', 'ring-brand-primary');
                });
                input.closest('label')?.classList.add('ring-2', 'ring-brand-primary');
                updateRouterValidity();
            });
        });

        updateConsentValidity();

        if (selection.plan && planSelect) {
            const planOption = Array.from(planSelect.options).find((option) =>
                option.value.startsWith(selection.plan)
            );
            if (planOption) {
                planSelect.value = planOption.value;
            }
        }
        if (selection.router) {
            if (routerSelect) {
                const routerOption = Array.from(routerSelect.options).find((option) => option.value === selection.router);
                if (routerOption) {
                    routerSelect.value = routerOption.value;
                }
            }
            if (routerInputs.length) {
                const routerInput = routerInputs.find((input) => input.value === selection.router);
                if (routerInput) {
                    routerInput.checked = true;
                    routerInput.closest('label')?.classList.add('ring-2', 'ring-brand-primary');
                }
            }
        }

        // Envio: valida, monta mensagem e abre WhatsApp do escritorio.
        cadastroForm.addEventListener('submit', (event) => {
            event.preventDefault();
            sanitizeCpf();
            updateRequiredValidity();
            updateConsentValidity();
            updateTimeValidity();

            if (!cadastroForm.checkValidity()) {
                cadastroForm.reportValidity();
                return;
            }

            const fullName = nameInput?.value.trim() || 'Não informado';
            const cpfRaw = cpfInput?.value.trim() || 'Não informado';
            const plan = planSelect?.value || 'Não informado';
            const due = dueSelect?.value || 'Não informado';
            const routerValue =
                routerInputs.find((input) => input.checked)?.value || routerSelect?.value || 'Sem roteador';
            const street = streetInput?.value.trim() || 'Não informado';
            const neighborhood = neighborhoodInput?.value.trim() || 'Não informado';
            const locality = localitySelect?.value || 'Não informado';
            const reference = referenceInput?.value.trim() || 'Não informado';
            const visitDate = formatVisitDate(visitInput?.value || '');
            const visitTime = formatVisitTime(timeInput?.value || '');

            const message = [
                '🧾 *Novo cadastro (site)*',
                `👤 Nome: ${fullName}`,
                `🪪 CPF: ${cpfRaw}`,
                `📶 Plano: ${plan}`,
                `📅 Vencimento: dia ${due}`,
                `📡 Roteador: ${routerValue}`,
                `📍 Rua: ${street}`,
                `🏘️ Bairro: ${neighborhood}`,
                `🌆 Localidade: ${locality}`,
                `🧭 Referência: ${reference}`,
                `🗓️ Visita: ${visitDate} às ${visitTime}`,
            ].join('\n');

            const url = `https://wa.me/557799390980?text=${encodeURIComponent(message)}`;
            window.open(url, '_blank', 'noopener');
        });
    }

    // 10) Formulario de reclamacao (envia dados para o WhatsApp).
    const reclamacaoForm = document.getElementById('reclamacao-form');
    if (reclamacaoForm) {
        const nameInput = document.getElementById('reclamacao-nome');
        const phoneInput = document.getElementById('reclamacao-telefone');
        const streetInput = document.getElementById('reclamacao-rua');
        const neighborhoodInput = document.getElementById('reclamacao-bairro');
        const localitySelect = document.getElementById('reclamacao-localidade');
        const referenceInput = document.getElementById('reclamacao-referencia');
        const visitInput = document.getElementById('reclamacao-visita');
        const timeInput = document.getElementById('reclamacao-horario');
        const issueSelect = document.getElementById('reclamacao-tipo');
        const detailsInput = document.getElementById('reclamacao-detalhes');

        // Utilitarios de validacao e limpeza de dados.
        // Utilitarios de validacao e limpeza.
        const setRequiredMessage = (input, message) => {
            if (!input) {
                return;
            }
            input.setCustomValidity(input.value ? '' : message);
        };

        const sanitizePhone = () => {
            if (!phoneInput) {
                return;
            }
            const digits = phoneInput.value.replace(/\D/g, '').slice(0, 11);
            phoneInput.value = digits;
        };

        const updateTimeValidity = () => {
            if (!timeInput) {
                return;
            }
            if (!timeInput.value) {
                timeInput.setCustomValidity('Selecione o horário da visita.');
                return;
            }
            timeInput.setCustomValidity(
                isTimeAllowed(timeInput.value)
                    ? ''
                    : 'Horários disponíveis para técnico e suporte: 08:30–11:30 e 14:00–18:00.'
            );
        };

        const updateRequiredValidity = () => {
            setRequiredMessage(nameInput, 'Informe o nome completo.');
            setRequiredMessage(phoneInput, 'Informe o telefone para contato.');
            setRequiredMessage(streetInput, 'Informe a rua.');
            setRequiredMessage(localitySelect, 'Selecione a localidade.');
            setRequiredMessage(visitInput, 'Selecione a data da visita.');
            setRequiredMessage(timeInput, 'Selecione o horário da visita.');
            setRequiredMessage(issueSelect, 'Selecione o tipo de problema.');
            setRequiredMessage(detailsInput, 'Descreva o problema.');
        };

        // Eventos de validacao em tempo real.
        nameInput?.addEventListener('input', () => setRequiredMessage(nameInput, 'Informe o nome completo.'));
        phoneInput?.addEventListener('input', () => {
            sanitizePhone();
            setRequiredMessage(phoneInput, 'Informe o telefone para contato.');
        });
        streetInput?.addEventListener('input', () => setRequiredMessage(streetInput, 'Informe a rua.'));
        localitySelect?.addEventListener('change', () => setRequiredMessage(localitySelect, 'Selecione a localidade.'));
        visitInput?.addEventListener('change', () => setRequiredMessage(visitInput, 'Selecione a data da visita.'));
        timeInput?.addEventListener('change', updateTimeValidity);
        issueSelect?.addEventListener('change', () => setRequiredMessage(issueSelect, 'Selecione o tipo de problema.'));
        detailsInput?.addEventListener('input', () => setRequiredMessage(detailsInput, 'Descreva o problema.'));

        // Envio: valida, monta mensagem e abre WhatsApp do escritorio.
        reclamacaoForm.addEventListener('submit', (event) => {
            event.preventDefault();
            sanitizePhone();
            updateRequiredValidity();
            updateTimeValidity();

            if (!reclamacaoForm.checkValidity()) {
                reclamacaoForm.reportValidity();
                return;
            }

            const fullName = nameInput?.value.trim() || 'Não informado';
            const phone = phoneInput?.value.trim() || 'Não informado';
            const street = streetInput?.value.trim() || 'Não informado';
            const neighborhood = neighborhoodInput?.value.trim() || 'Não informado';
            const locality = localitySelect?.value || 'Não informado';
            const reference = referenceInput?.value.trim() || 'Não informado';
            const visitDate = formatVisitDate(visitInput?.value || '');
            const visitTime = formatVisitTime(timeInput?.value || '');
            const issueType = issueSelect?.value || 'Não informado';
            const details = detailsInput?.value.trim() || 'Não informado';

            const message = [
                '🛠️ *Reclamação de Internet (site)*',
                `👤 Nome: ${fullName}`,
                `📞 Telefone: ${phone}`,
                `📍 Rua: ${street}`,
                `🏘️ Bairro: ${neighborhood}`,
                `🌆 Localidade: ${locality}`,
                `🧭 Referência: ${reference}`,
                `🗓️ Visita: ${visitDate} às ${visitTime}`,
                `⚠️ Problema: ${issueType}`,
                `📝 Detalhes: ${details}`,
            ].join('\n');

            const url = `https://wa.me/557799390980?text=${encodeURIComponent(message)}`;
            window.open(url, '_blank', 'noopener');
        });
    }

    // 11) Expansao/retracao de blocos com toggle (ex.: FAQ).
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

// 12) Fluxo principal: carrega HTMLs e inicia UI.
document.addEventListener('DOMContentLoaded', async () => {
    await loadPartials();
    initUI();
});
