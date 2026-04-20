const couleurs = {
  vert:    'bg-green-100 text-green-800',
  rouge:   'bg-red-100 text-red-800',
  bleu:    'bg-blue-100 text-blue-800',
  jaune:   'bg-yellow-100 text-yellow-800',
  gris:    'bg-gray-100 text-gray-700',
  violet:  'bg-purple-100 text-purple-800',
  orange:  'bg-orange-100 text-orange-800',
};

const Badge = ({ children, couleur = 'gris', className = '' }) => (
  <span
    className={`
      inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
      ${couleurs[couleur]} ${className}
    `}
  >
    {children}
  </span>
);

export default Badge;
