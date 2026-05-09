import { useState } from 'react';
import { useMonBilan } from '../hooks/useStockDelegue';
import { useAuth } from '../contexts/AuthContext';
import { formatMontant } from '../utils/formatMontant';
import { Printer, TrendingUp, ShoppingCart, ShoppingBag, ChevronDown, ChevronUp } from 'lucide-react';

const aujourdhui = () => new Date().toISOString().split('T')[0];
const debutMoisCourant = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
};
const debutMoisPrecedent = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() - 1, 1).toISOString().split('T')[0];
};
const finMoisPrecedent = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 0).toISOString().split('T')[0];
};

const PERIODES = [
  { label: 'Ce mois', debut: debutMoisCourant, fin: aujourdhui },
  { label: 'Mois dernier', debut: debutMoisPrecedent, fin: finMoisPrecedent },
  { label: 'Personnalisé', debut: null, fin: null },
];

const StatCard = ({ titre, valeur, icone: Icone, couleur }) => (
  <div className="carte flex items-center gap-4">
    <div className={`w-12 h-12 rounded-carte flex items-center justify-center flex-shrink-0 ${couleur}`}>
      <Icone size={20} className="text-white" />
    </div>
    <div>
      <p className="text-xs text-texte-secondaire">{titre}</p>
      <p className="text-xl font-bold font-mono text-texte-principal">{valeur}</p>
    </div>
  </div>
);

const SectionCollapsible = ({ titre, count, children, defaultOpen = true }) => {
  const [ouvert, setOuvert] = useState(defaultOpen);
  return (
    <div className="carte p-0 overflow-hidden print:shadow-none print:border print:border-gray-300">
      <button
        type="button"
        onClick={() => setOuvert(!ouvert)}
        className="w-full flex items-center justify-between px-4 py-3 bg-fond-secondaire/60 border-b border-bordure print:cursor-default"
      >
        <h3 className="text-sm font-semibold text-texte-principal">
          {titre} <span className="text-texte-secondaire font-normal">({count})</span>
        </h3>
        <span className="print:hidden">
          {ouvert ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>
      {ouvert && children}
    </div>
  );
};

const MonBilanPage = () => {
  const { utilisateur } = useAuth();
  const [periodeIdx, setPeriodeIdx] = useState(0);
  const [debutCustom, setDebutCustom] = useState(debutMoisCourant());
  const [finCustom, setFinCustom] = useState(aujourdhui());

  const periodeActive = PERIODES[periodeIdx];
  const debut = periodeIdx === 2 ? debutCustom : periodeActive.debut?.();
  const fin   = periodeIdx === 2 ? finCustom   : periodeActive.fin?.();

  const { data, isLoading } = useMonBilan({ debut, fin });

  const fmt = (v) => formatMontant(v ?? 0);
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const totaux = data?.totaux ?? {};
  const commandesAppro = data?.commandes_appro ?? [];
  const facturesOrd    = data?.factures_ordonnances ?? [];
  const ventesDir      = data?.ventes_directes ?? [];

  return (
    <div className="max-w-4xl space-y-6 print:max-w-none print:space-y-4">
      {/* En-tête */}
      <div className="flex items-start justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-titres font-bold text-texte-principal">Mon bilan</h1>
          <p className="text-texte-secondaire text-sm mt-0.5">{utilisateur?.prenom} {utilisateur?.nom}</p>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 rounded-bouton border border-zeze-vert text-zeze-vert hover:bg-zeze-vert/10 text-sm font-medium transition-colors"
        >
          <Printer size={16} /> Imprimer
        </button>
      </div>

      {/* En-tête version print */}
      <div className="hidden print:block">
        <h1 className="text-2xl font-bold">Bilan — {utilisateur?.prenom} {utilisateur?.nom}</h1>
        <p className="text-sm text-gray-600">
          Période : {fmtDate(debut)} au {fmtDate(fin)}
        </p>
      </div>

      {/* Sélecteur de période */}
      <div className="flex flex-wrap gap-2 items-center print:hidden">
        {PERIODES.map((p, i) => (
          <button
            key={i}
            onClick={() => setPeriodeIdx(i)}
            className={`px-3 py-1.5 rounded-bouton text-sm font-medium border transition-colors ${
              periodeIdx === i
                ? 'bg-zeze-vert text-white border-zeze-vert'
                : 'border-bordure text-texte-secondaire hover:border-zeze-vert hover:text-zeze-vert'
            }`}
          >
            {p.label}
          </button>
        ))}
        {periodeIdx === 2 && (
          <div className="flex items-center gap-2">
            <input type="date" value={debutCustom} max={finCustom}
              onChange={(e) => setDebutCustom(e.target.value)}
              className="champ-input text-sm py-1 w-36" />
            <span className="text-texte-secondaire text-sm">→</span>
            <input type="date" value={finCustom} min={debutCustom} max={aujourdhui()}
              onChange={(e) => setFinCustom(e.target.value)}
              className="champ-input text-sm py-1 w-36" />
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-zeze-vert border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Résumé */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard titre="Total ventes" valeur={fmt(totaux.ventes)} icone={ShoppingBag} couleur="bg-zeze-vert" />
            <StatCard titre="Total approvisionnements" valeur={fmt(totaux.achats)} icone={ShoppingCart} couleur="bg-blue-600" />
            <StatCard titre="Ma commission" valeur={fmt(totaux.gains)} icone={TrendingUp} couleur="bg-zeze-or" />
          </div>

          {/* Sous-détail ventes */}
          {(totaux.ventes_ordonnances > 0 || totaux.ventes_directes > 0) && (
            <div className="flex flex-wrap gap-4 text-sm px-1 print:hidden">
              <div className="text-texte-secondaire">
                Ordonnances : <span className="font-semibold text-texte-principal">{fmt(totaux.ventes_ordonnances)}</span>
              </div>
              <div className="text-texte-secondaire">
                Directes stock : <span className="font-semibold text-texte-principal">{fmt(totaux.ventes_directes)}</span>
              </div>
            </div>
          )}

          {/* Table : Approvisionnements */}
          <SectionCollapsible titre="Approvisionnements" count={commandesAppro.length}>
            {commandesAppro.length === 0 ? (
              <p className="px-4 py-6 text-sm text-texte-secondaire italic text-center">Aucun approvisionnement sur cette période</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-fond-secondaire border-b border-bordure">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-texte-secondaire">Date</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-texte-secondaire">Stockiste</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-texte-secondaire">Produits</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-texte-secondaire">Montant</th>
                      <th className="px-4 py-2 text-center text-xs font-semibold text-texte-secondaire">Paiement</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {commandesAppro.map((c) => {
                      const lignes = Array.isArray(c.lignes) ? c.lignes : [];
                      return (
                        <tr key={c.id} className="hover:bg-fond-secondaire/30">
                          <td className="px-4 py-2.5 text-xs font-mono whitespace-nowrap">{fmtDate(c.date_validation)}</td>
                          <td className="px-4 py-2.5 text-xs text-texte-secondaire">
                            {c.stockiste ? `${c.stockiste.prenom} ${c.stockiste.nom}` : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-texte-secondaire">
                            {lignes.map((l) => `${l.nom_produit} ×${l.quantite}`).join(', ') || '—'}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-xs font-semibold text-texte-principal">{fmt(c.montant_total)}</td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              c.facture?.statut_paiement === 'paye'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {c.facture?.statut_paiement === 'paye' ? 'Payé' : 'En attente'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="border-t-2 border-gray-300 bg-fond-secondaire">
                    <tr>
                      <td colSpan={3} className="px-4 py-2 text-xs font-semibold text-texte-secondaire">Total</td>
                      <td className="px-4 py-2 text-right font-mono text-sm font-bold text-texte-principal">{fmt(totaux.achats)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </SectionCollapsible>

          {/* Table : Ventes via ordonnances */}
          <SectionCollapsible titre="Ventes via ordonnances" count={facturesOrd.length}>
            {facturesOrd.length === 0 ? (
              <p className="px-4 py-6 text-sm text-texte-secondaire italic text-center">Aucune vente via ordonnance sur cette période</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-fond-secondaire border-b border-bordure">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-texte-secondaire">Date</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-texte-secondaire">Numéro</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-texte-secondaire">Patient</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-texte-secondaire">Montant</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-texte-secondaire">Encaissé</th>
                      <th className="px-4 py-2 text-center text-xs font-semibold text-texte-secondaire">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {facturesOrd.map((f) => (
                      <tr key={f.id} className="hover:bg-fond-secondaire/30">
                        <td className="px-4 py-2.5 text-xs font-mono whitespace-nowrap">{fmtDate(f.date_facture)}</td>
                        <td className="px-4 py-2.5 text-xs font-mono text-zeze-vert">{f.numero}</td>
                        <td className="px-4 py-2.5 text-xs text-texte-secondaire">
                          {f.patient ? `${f.patient.prenom} ${f.patient.nom}` : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs font-semibold text-texte-principal">{fmt(f.montant_total)}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs text-zeze-vert">{fmt(f.montant_paye)}</td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            f.statut === 'payee'            ? 'bg-green-100 text-green-700' :
                            f.statut === 'partiellement_payee' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {f.statut === 'payee' ? 'Payée' : f.statut === 'partiellement_payee' ? 'Partiel' : 'En attente'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-gray-300 bg-fond-secondaire">
                    <tr>
                      <td colSpan={3} className="px-4 py-2 text-xs font-semibold text-texte-secondaire">Total</td>
                      <td className="px-4 py-2 text-right font-mono text-sm font-bold text-texte-principal">{fmt(totaux.ventes_ordonnances)}</td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </SectionCollapsible>

          {/* Table : Ventes directes */}
          <SectionCollapsible titre="Ventes directes stock" count={ventesDir.length} defaultOpen={ventesDir.length > 0}>
            {ventesDir.length === 0 ? (
              <p className="px-4 py-6 text-sm text-texte-secondaire italic text-center">Aucune vente directe sur cette période</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-fond-secondaire border-b border-bordure">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-texte-secondaire">Date</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-texte-secondaire">Client</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-texte-secondaire">Produits</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-texte-secondaire">Montant</th>
                      <th className="px-4 py-2 text-center text-xs font-semibold text-texte-secondaire">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {ventesDir.map((v) => {
                      const lignes = Array.isArray(v.lignes) ? v.lignes : [];
                      return (
                        <tr key={v.id} className="hover:bg-fond-secondaire/30">
                          <td className="px-4 py-2.5 text-xs font-mono whitespace-nowrap">{fmtDate(v.date_mouvement)}</td>
                          <td className="px-4 py-2.5 text-xs text-texte-secondaire">{v.client_nom || '—'}</td>
                          <td className="px-4 py-2.5 text-xs text-texte-secondaire">
                            {lignes.map((l) => `${l.nom_produit} ×${l.quantite}`).join(', ') || '—'}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-xs font-semibold text-texte-principal">{fmt(v.montant_total)}</td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              v.statut === 'valide' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {v.statut === 'valide' ? 'Validé' : 'En attente'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="border-t-2 border-gray-300 bg-fond-secondaire">
                    <tr>
                      <td colSpan={3} className="px-4 py-2 text-xs font-semibold text-texte-secondaire">Total</td>
                      <td className="px-4 py-2 text-right font-mono text-sm font-bold text-texte-principal">{fmt(totaux.ventes_directes)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </SectionCollapsible>

          {/* Récapitulatif de commission */}
          <div className="carte bg-zeze-or/5 border-zeze-or/30 print:border print:border-gray-400">
            <h3 className="text-sm font-semibold text-texte-principal mb-3">Récapitulatif de commission</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-xs text-texte-secondaire">Approvisionnements</p>
                <p className="font-bold text-texte-principal font-mono">{fmt(totaux.achats)}</p>
              </div>
              <div>
                <p className="text-xs text-texte-secondaire">Total ventes</p>
                <p className="font-bold text-texte-principal font-mono">{fmt(totaux.ventes)}</p>
              </div>
              <div>
                <p className="text-xs text-texte-secondaire">Commission due</p>
                <p className="font-bold text-zeze-or font-mono text-lg">{fmt(totaux.gains)}</p>
              </div>
              <div>
                <p className="text-xs text-texte-secondaire">Période</p>
                <p className="font-medium text-texte-principal text-xs">
                  {fmtDate(data?.periode?.debut)} — {fmtDate(data?.periode?.fin)}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MonBilanPage;
