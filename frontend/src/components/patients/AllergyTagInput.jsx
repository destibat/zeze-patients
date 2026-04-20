import { useState } from 'react';
import { X, Plus } from 'lucide-react';

const AllergyTagInput = ({ value = [], onChange }) => {
  const [saisie, setSaisie] = useState('');

  const ajouter = () => {
    const tag = saisie.trim();
    if (tag && !value.includes(tag)) {
      onChange([...value, tag]);
    }
    setSaisie('');
  };

  const supprimer = (tag) => onChange(value.filter((t) => t !== tag));

  const gererTouche = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      ajouter();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={saisie}
          onChange={(e) => setSaisie(e.target.value)}
          onKeyDown={gererTouche}
          placeholder="Ajouter une allergie (Entrée pour valider)"
          className="champ-input flex-1"
        />
        <button
          type="button"
          onClick={ajouter}
          className="px-3 py-2 bg-zeze-vert text-white rounded-bouton hover:bg-zeze-vert-fonce"
        >
          <Plus size={16} />
        </button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((tag) => (
            <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
              {tag}
              <button type="button" onClick={() => supprimer(tag)} className="hover:text-orange-900">
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default AllergyTagInput;
