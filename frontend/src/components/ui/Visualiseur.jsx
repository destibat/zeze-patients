import { useState, useRef, useEffect, useMemo } from 'react';
import { Worker, Viewer } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { X, RotateCcw, RotateCw, Download, Maximize2, Minimize2, AlertCircle } from 'lucide-react';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.js?url';

const TOOLBAR_H = 44;

const Visualiseur = ({ fichier, onFermer }) => {
  const [rotationImg, setRotationImg] = useState(0);
  const [pleinEcran, setPleinEcran] = useState(false);
  const [erreurChargement, setErreurChargement] = useState(false);
  const conteneurRef = useRef(null);
  const defaultLayoutPluginInstance = useMemo(() => defaultLayoutPlugin(), []);

  const estImage = fichier.type_mime?.startsWith('image/');
  const url = `/uploads/${fichier.nom_stocke}`;

  const basculerPleinEcran = () => {
    if (!document.fullscreenElement) {
      conteneurRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const onChange = () => setPleinEcran(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !document.fullscreenElement) onFermer();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onFermer]);

  const contentH = `calc(100vh - ${TOOLBAR_H}px)`;

  return (
    <div
      ref={conteneurRef}
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', background: '#111827' }}
    >
      {/* Barre d'outils */}
      <div
        style={{ height: TOOLBAR_H, minHeight: TOOLBAR_H, flexShrink: 0 }}
        className="flex items-center justify-between px-4 bg-gray-900 text-white border-b border-white/10"
      >
        <p className="text-sm font-medium text-gray-200 truncate min-w-0 mr-4">{fichier.nom_original}</p>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {estImage && (
            <>
              <button
                onClick={() => setRotationImg((r) => (r - 90 + 360) % 360)}
                className="p-2 rounded hover:bg-white/10 transition-colors"
                title="Rotation gauche"
              >
                <RotateCcw size={15} />
              </button>
              <button
                onClick={() => setRotationImg((r) => (r + 90) % 360)}
                className="p-2 rounded hover:bg-white/10 transition-colors"
                title="Rotation droite"
              >
                <RotateCw size={15} />
              </button>
            </>
          )}
          <a
            href={url}
            download={fichier.nom_original}
            className="p-2 rounded hover:bg-white/10 transition-colors text-white"
            title="Télécharger"
          >
            <Download size={15} />
          </a>
          <button
            onClick={basculerPleinEcran}
            className="p-2 rounded hover:bg-white/10 transition-colors"
            title={pleinEcran ? 'Quitter plein écran' : 'Plein écran'}
          >
            {pleinEcran ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
          <button
            onClick={onFermer}
            className="p-2 rounded hover:bg-white/10 transition-colors"
            title="Fermer (Échap)"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Zone de visualisation */}
      <div style={{ height: contentH, overflow: 'hidden', position: 'relative' }}>
        {erreurChargement ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
            <AlertCircle size={40} />
            <p className="text-sm">Impossible de charger le fichier</p>
            <a href={url} download={fichier.nom_original} className="text-sm underline text-blue-400 hover:text-blue-300">
              Télécharger à la place
            </a>
          </div>
        ) : estImage ? (
          <TransformWrapper initialScale={1} minScale={0.2} maxScale={8} centerOnInit>
            <TransformComponent
              wrapperStyle={{ width: '100%', height: contentH }}
              contentStyle={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src={url}
                alt={fichier.nom_original}
                draggable={false}
                onError={() => setErreurChargement(true)}
                style={{
                  transform: `rotate(${rotationImg}deg)`,
                  transition: 'transform 0.2s ease',
                  maxWidth: '90vw',
                  maxHeight: `calc(90vh - ${TOOLBAR_H}px)`,
                  objectFit: 'contain',
                  userSelect: 'none',
                  display: 'block',
                }}
              />
            </TransformComponent>
          </TransformWrapper>
        ) : (
          <Worker workerUrl={workerUrl}>
            <div style={{ height: '100%' }}>
              <Viewer
                fileUrl={url}
                plugins={[defaultLayoutPluginInstance]}
                renderError={() => (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
                    <AlertCircle size={40} />
                    <p className="text-sm">Impossible d'afficher ce PDF</p>
                    <a href={url} download={fichier.nom_original} className="text-sm underline text-blue-400">
                      Télécharger à la place
                    </a>
                  </div>
                )}
              />
            </div>
          </Worker>
        )}
      </div>
    </div>
  );
};

export default Visualiseur;
