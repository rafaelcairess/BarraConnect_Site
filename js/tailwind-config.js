tailwind.config = {
    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
            colors: {
                brand: {
                    dark: '#0b1224',
                    primary: '#2563eb',
                    light: '#e0f2fe',
                    accent: '#ef4444',
                    disabled: '#94a3b8',
                },
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            },
        },
    },
};
