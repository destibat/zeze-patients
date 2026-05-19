export const MODES_PAIEMENT = [
  { value: 'orange_money',  label: 'Orange Money' },
  { value: 'momo_mtn',      label: 'MOMO MTN' },
  { value: 'wave',          label: 'Wave' },
  { value: 'moov',          label: 'MOOV' },
  { value: 'western_union', label: 'Western Union' },
  { value: 'moneygram',     label: 'MoneyGram' },
  { value: 'ria',           label: 'RIA' },
  { value: 'virement',      label: 'Virement' },
  { value: 'cheque',        label: 'Chèque' },
  { value: 'especes',       label: 'Espèces' },
  { value: 'autre',         label: 'Autres' },
];

// Dictionnaire value → label (inclut mobile_money pour affichage des anciens enregistrements)
export const LABELS_MODES_PAIEMENT = {
  ...Object.fromEntries(MODES_PAIEMENT.map((m) => [m.value, m.label])),
  mobile_money: 'Mobile Money',
};
