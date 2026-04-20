import { CheckCircle, AlertCircle, Info, XCircle, X } from 'lucide-react';
import { useState } from 'react';

const types = {
  succes: { icone: CheckCircle, classe: 'bg-green-50 border-green-200 text-green-800' },
  erreur: { icone: XCircle,     classe: 'bg-red-50 border-red-200 text-red-800' },
  alerte: { icone: AlertCircle, classe: 'bg-yellow-50 border-yellow-200 text-yellow-800' },
  info:   { icone: Info,        classe: 'bg-blue-50 border-blue-200 text-blue-800' },
};

const Alert = ({ type = 'info', message, fermable = false }) => {
  const [visible, setVisible] = useState(true);
  if (!visible || !message) return null;

  const { icone: Icone, classe } = types[type];

  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-bouton border ${classe}`}>
      <Icone size={18} className="mt-0.5 flex-shrink-0" />
      <p className="flex-1 text-sm">{message}</p>
      {fermable && (
        <button onClick={() => setVisible(false)} className="flex-shrink-0 opacity-60 hover:opacity-100">
          <X size={16} />
        </button>
      )}
    </div>
  );
};

export default Alert;
