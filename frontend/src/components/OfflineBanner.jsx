import { WifiOff } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline  = () => setOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online',  goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online',  goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-[100] bg-amber-500 text-white text-sm font-medium py-2 px-4 flex items-center justify-center gap-2 shadow">
      <WifiOff className="w-4 h-4 flex-shrink-0" />
      <span>Pas de connexion — les données ne sont pas disponibles hors ligne.</span>
    </div>
  );
}
