"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

type Candle = {
  id: string;
  nome: string;
  mensagem: string | null;
  comprador: string;
  valor: number;
  dias: number;
  maxAltura: number;
  criadoEm: string;
};

// El audio ahora se lee desde tu propio servidor para evitar bloqueos o error de formato en Safari/iOS.
// Para poner la música definitiva, guarda un archivo MP3 llamado "ambient.mp3" dentro de la carpeta "public" del proyecto.
const AUDIO_URL = "/ambient.mp3";

function diasRestantes(criadoEm: string, dias: number) {
  const elapsed = (Date.now() - new Date(criadoEm).getTime()) / 86400000;
  return Math.max(0, Math.round(dias - elapsed));
}

function alturaAtual(criadoEm: string, dias: number, maxAltura: number) {
  const restante = diasRestantes(criadoEm, dias) / dias;
  return Math.max(6, Math.round(maxAltura * restante));
}

export default function NocheDeOracionPage() {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [viewers, setViewers] = useState(42);
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Simulación de espectadores (14 a 148)
  useEffect(() => {
    setViewers(Math.floor(Math.random() * (148 - 14 + 1)) + 14);
    
    const viewerInterval = setInterval(() => {
      setViewers(prev => {
        const change = Math.floor(Math.random() * 7) - 3; // -3 to +3
        let next = prev + change;
        if (next < 14) next = 14;
        if (next > 148) next = 148;
        return next;
      });
    }, 5000);

    return () => clearInterval(viewerInterval);
  }, []);

  // Cargar velas y hacer polling
  useEffect(() => {
    const fetchCandles = () => {
      fetch("/api/candles")
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) {
            // Solo velas no expiradas
            const active = data.filter(c => diasRestantes(c.criadoEm, c.dias) > 0);
            setCandles(active);
          }
        })
        .catch(console.error);
    };

    fetchCandles();
    const pollInterval = setInterval(fetchCandles, 10000);
    return () => clearInterval(pollInterval);
  }, []);

  // Manejo de audio
  const toggleAudio = () => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.play().catch(console.error);
      } else {
        audioRef.current.pause();
      }
      setIsMuted(!isMuted);
    }
  };

  // Manejo de pantalla completa
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error al intentar activar pantalla completa: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Generar posiciones fijas para las velas basadas en porcentaje
  // Como usan porcentaje y están dentro de prayer-wall-container, se ajustan automáticamente al redimensionar.
  const [candlePositions, setCandlePositions] = useState<{ [id: string]: { left: number, top: number, scale: number, zIndex: number } }>({});
  
  useEffect(() => {
    setCandlePositions(prev => {
      const newPos = { ...prev };
      let changed = false;
      candles.forEach(c => {
        if (!newPos[c.id]) {
          changed = true;
          newPos[c.id] = {
            left: 5 + Math.random() * 90, // 5% a 95% do prayer-wall-container
            top: 10 + Math.random() * 85, // 10% a 95% do prayer-wall-container
            scale: 0.5 + Math.random() * 0.7, // 0.5 a 1.2
            zIndex: Math.floor(Math.random() * 100)
          };
        }
      });
      return changed ? newPos : prev;
    });
  }, [candles]);

  // Fondo con luces Bokeh
  const [bokehs, setBokehs] = useState<{ id: number, left: number, top: number, size: number, delay: number, duration: number }[]>([]);
  useEffect(() => {
    const b = Array.from({ length: 150 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: 2 + Math.random() * 8,
      delay: Math.random() * 5,
      duration: 3 + Math.random() * 4
    }));
    setBokehs(b);
  }, []);

  return (
    <div className={`noche-wrapper ${isFullscreen ? 'is-fullscreen' : ''}`}>
      <audio ref={audioRef} src={AUDIO_URL} loop />
      
      {/* Ambiente de fondo aislado del flujo flex */}
      <div className="noche-bg"></div>

      {/* ENCABEZADO: Botón volver y Personas conectadas */}
      <header className="noche-header">
        <Link href="/#mural" className="btn btn-ghost" style={{ padding: "0.5rem 1rem", border: "1px solid rgba(255,255,255,0.2)" }}>← Volver</Link>
        <div className="viewers">
          <span className="live-dot"></span>
          {viewers} en oración
        </div>
      </header>

      {/* CENTRO: Prayer Wall Container (Área segura y restringida) */}
      <main className="prayer-wall-container">

        {/* Luces lejanas (Bokeh) */}
        <div className="bokeh-container">
          {bokehs.map(b => (
            <div 
              key={b.id} 
              className="bokeh-light" 
              style={{
                left: `${b.left}%`,
                top: `${b.top}%`,
                width: `${b.size}px`,
                height: `${b.size}px`,
                animationDelay: `${b.delay}s`,
                animationDuration: `${b.duration}s`
              }}
            ></div>
          ))}
        </div>

        {/* Velas reales (primer plano) */}
        <div className="candles-container">
          {candles.map(c => {
            const pos = candlePositions[c.id];
            if (!pos) return null;
            return (
              <div 
                key={c.id} 
                className="noche-candle"
                style={{
                  left: `${pos.left}%`,
                  top: `${pos.top}%`,
                  transform: `translate(-50%, -100%) scale(${pos.scale})`, /* Fix origin to bottom-center of coordinates */
                  zIndex: pos.zIndex
                }}
              >
                <div className="flame-wrap">
                  <div className="glow" style={{ animationDuration: `${2.5 + Math.random()}s` }}></div>
                  <div className="flame" style={{ animationDuration: `${2.3 + Math.random()}s` }}></div>
                  <div className="wick"></div>
                  <div className="wax" style={{ height: `${alturaAtual(c.criadoEm, c.dias, c.maxAltura)}px` }}></div>
                </div>
                <div className="candle-label">
                  {c.nome}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* PIE: Logo y Controles (Audio/Pantalla completa) */}
      <footer className="noche-footer">
        <div className="footer-left">
          <div className="logo"><span className="mark"></span> La Voz de la Cruz</div>
          <p>Memorial Digital - Noche de Oración</p>
        </div>

        <div className="noche-controls">
          <button onClick={toggleAudio} className="ctrl-btn" title={isMuted ? "Activar Audio" : "Desactivar Audio"}>
            {isMuted ? "🔇" : "🔊"}
          </button>
          <button onClick={toggleFullscreen} className="ctrl-btn" title="Pantalla completa">
            ⛶
          </button>
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{__html: `
        .noche-wrapper {
          position: fixed;
          inset: 0;
          background: #020101;
          display: flex;
          flex-direction: column;
          font-family: var(--sans);
          color: var(--white);
        }
        
        .noche-bg {
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at bottom, rgba(212,175,55,0.08) 0%, transparent 60%);
          z-index: 1;
          pointer-events: none;
        }

        /* Oculta encabezado/pie en pantalla completa y oculta el mouse si está quieto (opcional, foco en visual limpio) */
        .noche-wrapper.is-fullscreen .noche-header,
        .noche-wrapper.is-fullscreen .noche-footer {
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.5s ease;
        }

        .noche-wrapper.is-fullscreen:hover .noche-header,
        .noche-wrapper.is-fullscreen:hover .noche-footer {
          opacity: 1;
          pointer-events: auto;
        }

        /* HEADER */
        .noche-header {
          position: relative;
          z-index: 10;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem 2rem;
          background: linear-gradient(to bottom, rgba(0,0,0,0.8), transparent);
          transition: opacity 0.3s ease;
        }

        .viewers {
          background: rgba(0,0,0,0.5);
          border: 1px solid rgba(255,255,255,0.1);
          padding: 0.6rem 1.2rem;
          border-radius: 20px;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          backdrop-filter: blur(4px);
        }

        .live-dot {
          width: 8px;
          height: 8px;
          background: #ff3b3b;
          border-radius: 50%;
          animation: blink 1.5s infinite alternate;
        }

        @keyframes blink {
          0% { opacity: 0.4; }
          100% { opacity: 1; box-shadow: 0 0 8px #ff3b3b; }
        }

        /* PRAYER WALL (CONTAINER CENTRAL RESTRINGIDO) */
        .prayer-wall-container {
          position: relative;
          flex: 1;
          z-index: 5;
          margin: 0 20px; /* Margen extra de seguridad horizontal */
          overflow: hidden; /* Corta cualquier elemento (luz o llama) que intente salir del container */
          /* El padding interno no retiene la vela posicionada de forma absoluta si tiene un % left muy cerca del borde,
             por eso el translate y el bound en JS mantienen todo dentro del overflow. */
        }

        .bokeh-container, .candles-container {
          position: absolute;
          inset: 0;
        }
        
        .bokeh-container {
          pointer-events: none;
        }

        .bokeh-light {
          position: absolute;
          border-radius: 50%;
          background: rgba(255, 215, 0, 0.4);
          box-shadow: 0 0 10px rgba(255, 215, 0, 0.8), 0 0 20px rgba(255, 140, 0, 0.6);
          filter: blur(2px);
          animation: pulseBokeh infinite alternate ease-in-out;
        }

        @keyframes pulseBokeh {
          0% { opacity: 0.2; transform: scale(0.8); }
          100% { opacity: 0.8; transform: scale(1.2); }
        }

        .noche-candle {
          position: absolute;
          display: flex;
          flex-direction: column;
          align-items: center;
          transition: left 1s ease, top 1s ease;
        }

        .candle-label {
          margin-top: 5px;
          font-size: 0.75rem;
          color: rgba(255,255,255,0.6);
          text-shadow: 0 1px 3px rgba(0,0,0,0.8);
          white-space: nowrap;
          opacity: 0;
          transition: opacity 0.5s ease;
        }
        
        .noche-candle:hover .candle-label {
          opacity: 1;
        }

        /* FOOTER */
        .noche-footer {
          position: relative;
          z-index: 10;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          padding: 1.5rem 2rem;
          background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
          transition: opacity 0.3s ease;
        }

        .footer-left {
          opacity: 0.6;
        }

        .footer-left .logo {
          font-family: var(--serif);
          font-size: 1.2rem;
          margin-bottom: 0.2rem;
        }

        .footer-left p {
          font-size: 0.85rem;
        }

        .noche-controls {
          display: flex;
          gap: 1rem;
        }

        .ctrl-btn {
          width: 45px;
          height: 45px;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.2);
          background: rgba(0,0,0,0.5);
          color: white;
          font-size: 1.2rem;
          cursor: pointer;
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .ctrl-btn:hover {
          background: rgba(255,255,255,0.1);
          border-color: var(--gold);
        }

        /* Ajustes responsivos para móvil */
        @media (max-width: 768px) {
          .noche-header {
            padding: 1rem;
            flex-direction: column;
            gap: 1rem;
          }
          .noche-footer {
            padding: 1rem;
            flex-direction: column;
            align-items: center;
            gap: 1rem;
            text-align: center;
          }
          .prayer-wall-container {
            margin: 0 10px;
          }
        }
      `}} />
    </div>
  );
}
