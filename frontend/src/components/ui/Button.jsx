import { Loader2 } from 'lucide-react';

const variantes = {
  primaire: 'bg-zeze-vert text-white hover:bg-zeze-vert-fonce focus:ring-zeze-vert',
  secondaire: 'border border-zeze-vert text-zeze-vert hover:bg-zeze-vert hover:text-white focus:ring-zeze-vert',
  danger: 'bg-medical-critique text-white hover:bg-red-800 focus:ring-medical-critique',
  fantome: 'text-texte-secondaire hover:bg-fond-secondaire focus:ring-gray-400',
};

const tailles = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

const Button = ({
  children,
  variante = 'primaire',
  taille = 'md',
  chargement = false,
  icone: Icone,
  className = '',
  disabled,
  ...props
}) => {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2 font-medium rounded-bouton
        transition-colors duration-200
        focus:outline-none focus:ring-2 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantes[variante]}
        ${tailles[taille]}
        ${className}
      `}
      disabled={disabled || chargement}
      {...props}
    >
      {chargement ? (
        <Loader2 size={16} className="animate-spin" />
      ) : Icone ? (
        <Icone size={16} />
      ) : null}
      {children}
    </button>
  );
};

export default Button;
