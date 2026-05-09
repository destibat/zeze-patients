export const formatNombre = (n) =>
  new Intl.NumberFormat('fr-FR').format(Math.round(n || 0));

export const formatMontant = (n) =>
  formatNombre(n) + ' FCFA';

// Réservé aux widgets compacts (tooltips, badges) où la place est limitée
export const formatMontantCompact = (n) => {
  const v = n || 0;
  if (v >= 1_000_000)
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(v / 1_000_000) + ' M FCFA';
  if (v >= 1_000)
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(v / 1_000) + ' k FCFA';
  return formatNombre(v) + ' FCFA';
};
