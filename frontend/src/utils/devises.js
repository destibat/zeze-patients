export const DEVISES = [
  { code: 'XOF', nom: 'Franc CFA',        symbole: 'FCFA',  drapeau: '🇨🇮' },
  { code: 'EUR', nom: 'Euro',              symbole: '€',     drapeau: '🇪🇺' },
  { code: 'USD', nom: 'Dollar US',         symbole: '$',     drapeau: '🇺🇸' },
  { code: 'CAD', nom: 'Dollar Canadien',   symbole: 'CA$',   drapeau: '🇨🇦' },
  { code: 'GBP', nom: 'Livre Sterling',    symbole: '£',     drapeau: '🇬🇧' },
];

const CONFIGS = {
  XOF: { locale: 'fr-FR', decimales: 0,  position: 'apres',  symbole: 'FCFA' },
  EUR: { locale: 'fr-FR', decimales: 2,  position: 'apres',  symbole: '€'    },
  USD: { locale: 'en-US', decimales: 2,  position: 'avant',  symbole: '$'    },
  CAD: { locale: 'fr-CA', decimales: 2,  position: 'avant',  symbole: 'CA$'  },
  GBP: { locale: 'en-GB', decimales: 2,  position: 'avant',  symbole: '£'    },
};

export const creerFormateur = (devise = 'XOF') => {
  const cfg = CONFIGS[devise] || CONFIGS.XOF;

  const formaterNombre = (n) =>
    new Intl.NumberFormat(cfg.locale, {
      minimumFractionDigits: cfg.decimales,
      maximumFractionDigits: cfg.decimales,
    }).format(Math.round((n || 0) * (cfg.decimales === 0 ? 1 : 100)) / (cfg.decimales === 0 ? 1 : 100));

  const formaterMontant = (n) =>
    cfg.position === 'avant'
      ? `${cfg.symbole}${formaterNombre(n)}`
      : `${formaterNombre(n)} ${cfg.symbole}`;

  const formaterMontantCompact = (n) => {
    const v = n || 0;
    const sep = cfg.locale.startsWith('fr') ? ' ' : ',';
    if (v >= 1_000_000) {
      const m = new Intl.NumberFormat(cfg.locale, { maximumFractionDigits: 1 }).format(v / 1_000_000);
      return cfg.position === 'avant' ? `${cfg.symbole}${m}M` : `${m}M ${cfg.symbole}`;
    }
    if (v >= 1_000) {
      const k = new Intl.NumberFormat(cfg.locale, { maximumFractionDigits: 0 }).format(v / 1_000);
      return cfg.position === 'avant' ? `${cfg.symbole}${k}k` : `${k}k ${cfg.symbole}`;
    }
    return formaterMontant(v);
  };

  return { formatMontant: formaterMontant, formatMontantCompact: formaterMontantCompact };
};
