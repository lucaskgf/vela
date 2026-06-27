"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";

type SupportMessage = {
  id: string;
  nome: string;
  mensagem: string;
  criadoEm: string;
};

type CandleDetail = {
  id: string;
  nome: string;
  mensagem: string | null;
  comprador: string;
  valor: number;
  dias: number;
  maxAltura: number;
  criadoEm: string;
  oracoes: number;
  amens: number;
  rosas: number;
  mensagens: SupportMessage[];
};

function diasRestantes(criadoEm: string, dias: number) {
  const elapsed = (Date.now() - new Date(criadoEm).getTime()) / 86400000;
  return Math.max(0, Math.round(dias - elapsed));
}

function alturaAtual(criadoEm: string, dias: number, maxAltura: number) {
  const restante = diasRestantes(criadoEm, dias) / dias;
  return Math.max(6, Math.round(maxAltura * restante));
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });
}

export default function VelaMemorialPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;

  const [candle, setCandle] = useState<CandleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Interações otimistas
  const [oracoes, setOracoes] = useState(0);
  const [amens, setAmens] = useState(0);
  const [rosas, setRosas] = useState(0);

  // Mensagens
  const [mensagens, setMensagens] = useState<SupportMessage[]>([]);
  const [nomeMsg, setNomeMsg] = useState("");
  const [textoMsg, setTextoMsg] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const [toast, setToast] = useState({ show: false, msg: "" });

  useEffect(() => {
    fetch(`/api/candles/${id}`)
      .then(res => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then(data => {
        setCandle(data);
        setOracoes(data.oracoes || 0);
        setAmens(data.amens || 0);
        setRosas(data.rosas || 0);
        setMensagens(data.mensagens || []);
        setLoading(false);
      })
      .catch(() => {
        notFound();
      });
  }, [id]);

  const showToast = (msg: string) => {
    setToast({ show: true, msg });
    setTimeout(() => setToast({ show: false, msg: "" }), 3000);
  };

  const handleInteract = async (type: "oracao" | "amen" | "rosa") => {
    // Atualização otimista
    if (type === "oracao") setOracoes(o => o + 1);
    if (type === "amen") setAmens(a => a + 1);
    if (type === "rosa") setRosas(r => r + 1);

    try {
      await fetch(`/api/candles/${id}/interact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type })
      });
    } catch (err) {
      console.error(err);
    }
  };

  const submitMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeMsg.trim() || !textoMsg.trim()) return;

    setSendingMsg(true);
    try {
      const res = await fetch(`/api/candles/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: nomeMsg, mensagem: textoMsg })
      });
      const data = await res.json();
      if (data.success) {
        setMensagens([data.message, ...mensagens]);
        setNomeMsg("");
        setTextoMsg("");
        showToast("Mensaje enviado con amor ❤️");
      }
    } catch (err) {
      console.error(err);
      alert("Error al enviar el mensaje.");
    } finally {
      setSendingMsg(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--ash)" }}>Buscando la luz de esta vela...</p>
      </div>
    );
  }

  if (!candle) return null;

  const currentHeight = alturaAtual(candle.criadoEm, candle.dias, candle.maxAltura);
  const isExpired = diasRestantes(candle.criadoEm, candle.dias) === 0;

  return (
    <>
      <header style={{ borderBottom: "1px solid var(--line)", background: "rgba(0,0,0,0.5)", padding: "1rem" }}>
        <div className="container" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link href="/#mural" className="btn btn-ghost" style={{ padding: "0.5rem 1rem" }}>← Volver al Mural</Link>
          <div className="logo" style={{ marginLeft: "auto" }}>
            <span className="mark"></span> La Voz de la Cruz
          </div>
        </div>
      </header>

      <main className="container section" style={{ padding: "3rem 1.5rem" }}>
        <div className="memorial-grid">
          
          <div className="memorial-candle-col">
            <div className="candle-showcase">
              <div className="flame-wrap" style={{ transform: "scale(1.4)", transformOrigin: "bottom center", margin: "0 auto 2rem" }}>
                {!isExpired && (
                  <>
                    <div className="glow"></div>
                    <div className="flame"></div>
                  </>
                )}
                <div className="wick"></div>
                <div className="wax" style={{ height: `${currentHeight}px`, width: 28 }}></div>
              </div>
              <div className="share-row" style={{ justifyContent: "center", marginTop: "4rem" }}>
                <a className="share-btn" href={`https://wa.me/?text=${encodeURIComponent(`Encendí una vela en homenaje a ${candle.nome} en La Voz de la Cruz. Visita el memorial: ${window.location.href}`)}`} target="_blank" rel="noopener noreferrer">Compartir en WhatsApp</a>
                <button className="share-btn" onClick={() => { navigator.clipboard?.writeText(window.location.href); showToast("¡Link copiado!"); }}>Copiar Link</button>
              </div>
            </div>

            <div className="interactions">
              <button className="interact-btn" onClick={() => handleInteract("oracao")}>
                <span className="icon">🙏</span>
                <span className="label">Orar</span>
                <span className="count">{oracoes}</span>
              </button>
              <button className="interact-btn" onClick={() => handleInteract("amen")}>
                <span className="icon">❤️</span>
                <span className="label">Amén</span>
                <span className="count">{amens}</span>
              </button>
              <button className="interact-btn" onClick={() => handleInteract("rosa")}>
                <span className="icon">🌹</span>
                <span className="label">Rosa</span>
                <span className="count">{rosas}</span>
              </button>
            </div>
          </div>

          <div className="memorial-details-col">
            <div className="memorial-header">
              <p className="eyebrow" style={{ color: "var(--gold)" }}>Memorial Digital</p>
              <h1 style={{ fontSize: "2.4rem", marginBottom: "0.5rem", color: "var(--white)", wordBreak: "break-word", overflowWrap: "break-word" }}>{candle.nome}</h1>
              <div style={{ display: "flex", gap: "1rem", color: "var(--ash)", fontSize: "0.9rem", flexWrap: "wrap", marginBottom: "2rem" }}>
                <span>Encendida el {formatDate(candle.criadoEm)}</span>
                <span>•</span>
                <span>{diasRestantes(candle.criadoEm, candle.dias)} días restantes</span>
                <span>•</span>
                <span>Por {candle.comprador}</span>
              </div>
            </div>

            {candle.mensagem && (
              <div className="memorial-message">
                <p className="quote" style={{ borderLeft: "2px solid var(--gold)", paddingLeft: "1.2rem", fontStyle: "italic", color: "var(--white)", fontSize: "1.1rem", marginBottom: "3rem", wordBreak: "break-word", overflowWrap: "break-word" }}>
                  &ldquo;{candle.mensagem}&rdquo;
                </p>
              </div>
            )}

            <div className="support-board">
              <h3 style={{ fontSize: "1.4rem", marginBottom: "1.5rem", borderBottom: "1px solid var(--line)", paddingBottom: "0.8rem" }}>Deja un mensaje de apoyo</h3>

              <form onSubmit={submitMessage} className="support-form" style={{ marginBottom: "2.5rem", background: "rgba(255,255,255,0.02)", padding: "1.5rem", borderRadius: "12px", border: "1px solid var(--line)" }}>
                <div className="field">
                  <input type="text" placeholder="Tu nombre" value={nomeMsg} onChange={e => setNomeMsg(e.target.value)} required />
                </div>
                <div className="field">
                  <textarea placeholder="Escribe una palabra de consuelo..." value={textoMsg} onChange={e => setTextoMsg(e.target.value)} required style={{ minHeight: "80px" }}></textarea>
                </div>
                <button type="submit" className="btn btn-solid" disabled={sendingMsg}>
                  {sendingMsg ? "Enviando..." : "Enviar Mensaje"}
                </button>
              </form>

              <div className="messages-list" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {mensagens.length === 0 ? (
                  <p style={{ color: "var(--ash)", fontStyle: "italic" }}>Todavía no hay mensajes. Sé el primero en dejar una palabra de apoyo.</p>
                ) : (
                  mensagens.map(msg => (
                    <div key={msg.id} className="message-card" style={{ padding: "1.2rem", border: "1px solid var(--line)", borderRadius: "12px", background: "rgba(0,0,0,0.2)" }}>
                      <p style={{ color: "var(--white)", marginBottom: "0.5rem", wordBreak: "break-word", overflowWrap: "break-word" }}>{msg.mensagem}</p>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8rem", color: "var(--ash)", wordBreak: "break-word" }}>
                        <span style={{ color: "var(--gold)" }}>{msg.nome}</span>
                        <span>{formatDate(msg.criadoEm)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      </main>

      <style dangerouslySetInnerHTML={{__html: `
        .memorial-grid {
          display: grid;
          grid-template-columns: 1fr 2fr;
          gap: 4rem;
          max-width: 1080px;
          margin: 0 auto;
        }
        .memorial-candle-col {
          display: flex;
          flex-direction: column;
          align-items: center;
          background: radial-gradient(ellipse at top, rgba(245,176,65,0.08), transparent 70%), linear-gradient(180deg, #100e0b, #070605);
          border: 1px solid var(--line);
          border-radius: 18px;
          padding: 4rem 2rem 2rem;
          position: sticky;
          top: 2rem;
        }
        .interactions {
          display: flex;
          gap: 1rem;
          margin-top: 2rem;
          width: 100%;
          justify-content: center;
        }
        .interact-btn {
          background: rgba(255,255,255,0.03);
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 0.8rem 1rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.4rem;
          color: var(--ash);
          transition: all 0.2s;
          cursor: pointer;
          flex: 1;
        }
        .interact-btn:hover {
          background: rgba(255,255,255,0.06);
          border-color: var(--gold);
          color: var(--white);
          transform: translateY(-2px);
        }
        .interact-btn .icon { font-size: 1.4rem; }
        .interact-btn .count { font-family: var(--serif); color: var(--gold); font-size: 1.1rem; }
        
        @media (max-width: 768px) {
          .memorial-grid { grid-template-columns: 1fr; gap: 2rem; }
          .memorial-candle-col { position: relative; top: 0; padding: 3rem 1.5rem 1.5rem; }
        }
      `}} />

      {toast.show && (
        <div className="toast show">{toast.msg}</div>
      )}
    </>
  );
}
