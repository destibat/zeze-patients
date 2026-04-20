/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // --- Couleurs principales ZEZEPAGNON ---
        zeze: {
          vert:        '#2E7D32', // Couleur dominante, boutons primaires, en-têtes
          'vert-fonce': '#1B5E20', // Textes importants, hover, navigation
          'vert-clair': '#81C784', // Accents, badges, survols
          or:           '#F9A825', // Accents chauds, CTA secondaires
          terre:        '#D84315', // Alertes douces, éléments de rappel
        },
        // --- Couleurs neutres ---
        fond: {
          principal:   '#FAFAF7', // Fond principal (blanc cassé)
          secondaire:  '#F5F1E8', // Fond secondaire, cartes (beige naturel)
        },
        texte: {
          principal:   '#263238', // Textes principaux (gris anthracite)
          secondaire:  '#607D8B', // Textes secondaires (gris moyen)
        },
        // --- Couleurs fonctionnelles médicales ---
        medical: {
          succes:      '#388E3C', // Valeurs normales, paiement réussi
          info:        '#0288D1', // Informations neutres
          alerte:      '#F57C00', // Valeurs limites, attention
          critique:    '#C62828', // Valeurs critiques, erreurs
        },
      },
      fontFamily: {
        titres: ['Poppins', 'sans-serif'],
        corps:  ['Inter', 'Open Sans', 'sans-serif'],
      },
      borderRadius: {
        carte: '10px',
        bouton: '8px',
      },
      boxShadow: {
        carte:  '0 2px 8px rgba(0, 0, 0, 0.08)',
        'carte-hover': '0 4px 16px rgba(0, 0, 0, 0.12)',
        modale: '0 8px 32px rgba(0, 0, 0, 0.16)',
      },
    },
  },
  plugins: [],
};
