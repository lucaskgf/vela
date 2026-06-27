"use client";
import { useState, useEffect, FormEvent, useRef } from "react";
import Link from "next/link";

// Types
type Candle = {
  id: string;
  nome: string;
  mensagem: string | null;
  comprador: string;
  valor: number;
  dias: number;
  maxAltura: number;
  criadoEm: Date;
};

function stripAccents(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function diasRestantes(c: Candle) {
  const elapsed = (Date.now() - new Date(c.criadoEm).getTime()) / 86400000;
  return Math.max(0, Math.round(c.dias - elapsed));
}

function alturaAtual(c: Candle) {
  const restante = diasRestantes(c) / c.dias;
  return Math.max(6, Math.round(c.maxAltura * restante));
}

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });
}

export default function Home() {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [visibleCount, setVisibleCount] = useState(12);
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [activeCandle, setActiveCandle] = useState<Candle | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [toast, setToast] = useState({ show: false, msg: "" });

  const [formDias, setFormDias] = useState(30);

  const formNomeRef = useRef<HTMLInputElement>(null);
  const formMsgRef = useRef<HTMLTextAreaElement>(null);
  const formCompradorRef = useRef<HTMLInputElement>(null);
  const formEmailRef = useRef<HTMLInputElement>(null);

  // Stats: provienen de la ruta de agregación (cuenta/suma sobre TODAS las velas activas, no solo las 150 cargadas).
  const [statCount, setStatCount] = useState(0);
  const [statTotal, setStatTotal] = useState(0);
  const [statLast, setStatLast] = useState("—");

  useEffect(() => {
    fetch("/api/candles")
      .then((r) => r.json())
      .then((data) => {
        if (data && Array.isArray(data)) {
          setCandles(data);
        }
      })
      .catch((err) => {
        console.error(err);
      });

    fetch("/api/stats")
      .then((r) => r.json())
      .then((data) => {
        if (data && typeof data.count === "number") {
          setStatCount(data.count);
          setStatTotal(data.total ?? 0);
          setStatLast(data.last ?? "—");
        }
      })
      .catch((err) => {
        console.error(err);
      });
  }, []);

  const showToast = (msg: string) => {
    setToast({ show: true, msg });
    setTimeout(() => setToast({ show: false, msg: "" }), 3200);
  };

  const getFilteredCandles = () => {
    const q = stripAccents(searchQuery.trim());
    const now = Date.now();
    return candles.filter((c) => {
      if (q && !stripAccents(c.nome).includes(q)) return false;
      const ageDays = (now - new Date(c.criadoEm).getTime()) / 86400000;
      if (activeFilter === "today" && ageDays > 1) return false;
      if (activeFilter === "week" && ageDays > 7) return false;
      if (activeFilter === "month" && ageDays > 30) return false;
      return true;
    });
  };

  const filteredCandles = getFilteredCandles();
  const visibleCandles = filteredCandles.slice(0, visibleCount);

  const openForm = () => {
    setIsFormOpen(true);
    setIsProcessing(false);
    setFormDias(30);
    setTimeout(() => formNomeRef.current?.focus(), 300);
  };

  const closeForm = () => setIsFormOpen(false);

  const openDetail = (c: Candle) => {
    setActiveCandle(c);
    setIsDetailOpen(true);
  };
  const closeDetail = () => setIsDetailOpen(false);

  const handleCandleOptClick = (dias: number) => {
    setFormDias(dias);
  };

  const submitPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    const nome = formNomeRef.current?.value || "";
    const mensagem = formMsgRef.current?.value || "";
    const comprador = formCompradorRef.current?.value || "";
    const email = formEmailRef.current?.value || "";

    try {
      // Guarda la vela en la base de datos como PENDIENTE. El backend valida el plan y devuelve
      // el checkoutUrl desde la fuente centralizada — así el cliente nunca necesita conocer las
      // URLs de Hotmart (elimina inconsistencia checkout↔webhook).
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, mensagem, comprador, email, dias: formDias }),
      });
      const data = await res.json();

      if (res.ok && data.success && data.checkoutUrl) {
        // Agrega email y nombre en la URL para autocompletar en Hotmart
        const finalUrl = new URL(data.checkoutUrl);
        finalUrl.searchParams.append("email", email);
        finalUrl.searchParams.append("name", comprador);

        window.location.href = finalUrl.toString();
      } else if (res.status === 409) {
        // Plan sin link de checkout todavía (ej: 365 días) — el backend NO creó la vela,
        // así que no hay huérfana en la base. Avisamos al usuario con claridad.
        showToast("Este plan aún no está disponible. ¡Pronto!");
        setIsProcessing(false);
      } else {
        showToast(data.error || "Ocurrió un error al iniciar el pago. Inténtalo de nuevo.");
        setIsProcessing(false);
      }
    } catch (err) {
      console.error(err);
      showToast("Error al conectar con el servidor.");
      setIsProcessing(false);
    }
  };

  // Ambient embers generator
  const [embers, setEmbers] = useState<number[]>([]);
  useEffect(() => {
    setEmbers(Array.from({ length: 36 }).map((_, i) => i));
  }, []);

  return (
    <>
      <div className="ambient" aria-hidden="true">
        <div className="rays"></div>
        <div className="embers">
          {embers.map((i) => (
            <div
              key={i}
              className="ember"
              style={{
                left: `${Math.random() * 100}%`,
                animationDuration: `${10 + Math.random() * 14}s`,
                animationDelay: `${Math.random() * 14}s`,
                opacity: 0.3 + Math.random() * 0.5,
              }}
            ></div>
          ))}
        </div>
        <div className="vignette"></div>
      </div>

      <header>
        <nav className="nav">
          <a href="#top" className="logo">
            <span className="mark" aria-hidden="true"></span>La Voz de la Cruz
          </a>
          <div className="navlinks">
            <a href="#mural">Mural</a>
            <a href="#sobre">Nosotros</a>
            <a href="#contagem">Cómo funciona</a>
          </div>
          <div className="nav-cta">
            <a href="#mural" className="btn btn-ghost">Ver Mural</a>
            <button className="btn btn-solid" onClick={openForm}>Encender una Vela</button>
          </div>
        </nav>
      </header>

      <main id="top">
        <section className="hero">
          <div className="cross-glow" aria-hidden="true">
            <div className="beam"></div>
            <svg viewBox="0 0 84 120" fill="none">
              <defs>
                <linearGradient id="crossGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F8F0D8" />
                  <stop offset="100%" stopColor="#D4AF37" />
                </linearGradient>
              </defs>
              <rect x="37" y="0" width="10" height="120" rx="3" fill="url(#crossGrad)" />
              <rect x="10" y="30" width="64" height="10" rx="3" fill="url(#crossGrad)" />
            </svg>
          </div>
          <p className="eyebrow hero-eyebrow">Un memorial digital de fe</p>
          <h1>Enciende una luz de fe para <em>quien amas</em></h1>
          <p className="sub">Cada vela representa una oración, un recuerdo y un homenaje eterno.</p>
          <div className="hero-actions">
            <button className="btn btn-solid btn-lg" onClick={openForm}>Encender una Vela</button>
            <a href="#mural" className="btn btn-ghost btn-lg">Ver Mural de Velas</a>
          </div>
        </section>

        <section className="stats">
          <div className="stats-inner">
            <div className="stat">
              <span className="num">{statCount}</span>
              <span className="label">Velas encendidas</span>
            </div>
            <div className="stat">
              <span className="num">R$ {statTotal.toLocaleString("es-ES")}</span>
              <span className="label">Recaudado en homenajes</span>
            </div>
            <div className="stat">
              <span className="num">{statLast}</span>
              <span className="label">Último homenaje</span>
            </div>
          </div>
        </section>

        <section className="section" id="mural">
          <div className="container">
            <div className="section-head">
              <div className="divider-flame"></div>
              <p className="eyebrow">El Mural de la Fe</p>
              <h2>Cada luz, una historia</h2>
              <p>Cientos de velas encendidas por quienes buscaron consuelo, gratitud y esperanza. Toca una vela para leer el homenaje completo.</p>
            </div>

            <div className="mural-toolbar">
              <div className="search-box">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="7" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="Buscar por nombre..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="filters">
                <button className={`chip ${activeFilter === "all" ? "active" : ""}`} onClick={() => setActiveFilter("all")}>Todas las fechas</button>
                <button className={`chip ${activeFilter === "today" ? "active" : ""}`} onClick={() => setActiveFilter("today")}>Hoy</button>
                <button className={`chip ${activeFilter === "week" ? "active" : ""}`} onClick={() => setActiveFilter("week")}>Esta semana</button>
                <button className={`chip ${activeFilter === "month" ? "active" : ""}`} onClick={() => setActiveFilter("month")}>Este mes</button>
              </div>
            </div>

            <div className="mural-frame">
              <div className="mural-grid">
                {visibleCandles.map((c, i) => (
                  <button key={c.id} className="candle" style={{ animationDelay: `${i * 0.03}s` }} onClick={() => openDetail(c)}>
                    <div className="flame-wrap">
                      {diasRestantes(c) > 0 && (
                        <>
                          <div className="glow"></div>
                          <div className="flame"></div>
                        </>
                      )}
                      <div className="wick"></div>
                      <div className="wax" style={{ height: `${alturaAtual(c)}px` }}></div>
                    </div>
                    <span className="candle-name">{c.nome}</span>
                    <span className="candle-days">{diasRestantes(c)} días restantes</span>
                  </button>
                ))}
              </div>
              {filteredCandles.length === 0 && (
                <p className="mural-empty">No se encontró ninguna vela con ese nombre o período.</p>
              )}
            </div>

            {filteredCandles.length > visibleCount && (
              <div className="mural-more">
                <button className="btn btn-ghost" onClick={() => setVisibleCount((v) => v + 12)}>Ver más velas</button>
              </div>
            )}
          </div>
        </section>

        <section className="section" id="contagem" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="section-head">
              <div className="divider-flame"></div>
              <p className="eyebrow">Cómo funciona</p>
              <h2>El tamaño de la vela define el tiempo de la luz</h2>
              <p>Cada homenaje elige cuánto tiempo permanecerá encendida la llama en el mural — al igual que una vela real, se consume poco a poco hasta apagarse.</p>
            </div>
            <div className="candle-options" style={{ maxWidth: 680, margin: "0 auto" }}>
              <div className="candle-opt">
                <div style={{ height: 80, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                  <div className="flame-wrap" style={{ transform: "scale(0.7)", transformOrigin: "bottom center" }}>
                    <div className="glow"></div><div className="flame"></div><div className="wick"></div>
                    <div className="wax" style={{ height: 26 }}></div>
                  </div>
                </div>
                <span className="days">30 días encendida</span>
              </div>
              <div className="candle-opt">
                <div style={{ height: 80, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                  <div className="flame-wrap" style={{ transform: "scale(0.85)", transformOrigin: "bottom center" }}>
                    <div className="glow"></div><div className="flame"></div><div className="wick"></div>
                    <div className="wax" style={{ height: 40 }}></div>
                  </div>
                </div>
                <span className="days">90 días encendida</span>
              </div>
              <div className="candle-opt">
                <div style={{ height: 80, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                  <div className="flame-wrap" style={{ transform: "scale(1)", transformOrigin: "bottom center" }}>
                    <div className="glow"></div><div className="flame"></div><div className="wick"></div>
                    <div className="wax" style={{ height: 54 }}></div>
                  </div>
                </div>
                <span className="days">365 días encendida</span>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="sobre">
          <div className="container about">
            <div className="about-visual">
              <div className="cross-glow">
                <div className="beam"></div>
                <svg viewBox="0 0 84 120" fill="none">
                  <rect x="37" y="0" width="10" height="120" rx="3" fill="#D4AF37" />
                  <rect x="10" y="30" width="64" height="10" rx="3" fill="#D4AF37" />
                </svg>
              </div>
            </div>
            <div className="about-text">
              <p className="eyebrow">Sobre el proyecto</p>
              <h2>Un espacio para la luz que la distancia no alcanza</h2>
              <p>La Voz de la Cruz nació como una extensión de nuestro canal de fe — un lugar para transformar la oración en algo visible. Aquí, cada vela encendida lleva un nombre, una nostalgia, un pedido o un agradecimiento.</p>
              <p className="quote">"La luz física no siempre alcanza a quienes amamos. La luz digital puede atravesar cualquier distancia y seguir ardiendo por ellos."</p>
              <p>Creemos que homenajear es un acto de fe continuo. Por eso, cada vela permanece encendida por el tiempo elegido — manteniendo viva la memoria de quien representa.</p>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="container footer-inner">
          <a href="#top" className="logo"><span className="mark" aria-hidden="true"></span>La Voz de la Cruz</a>
          <div className="footer-links">
            <a href="#top">Inicio</a>
            <a href="#mural">Mural</a>
            <a href="#sobre">Nosotros</a>
          </div>
          <p className="footer-credit">Hecho con fe. © 2026 La Voz de la Cruz.</p>
        </div>
      </footer>

      {/* FORM MODAL */}
      {isFormOpen && (
        <div className="modal-overlay open show" onClick={(e) => { if (e.target === e.currentTarget) closeForm(); }}>
          <div className="modal">
            <button className="modal-close" onClick={closeForm}>✕</button>
            
            {isProcessing && (
              <div className="processing">
                <div className="flame-wrap" style={{ height: 90 }}>
                  <div className="glow"></div>
                  <div className="flame"></div>
                  <div className="wick"></div>
                  <div className="wax" style={{ height: 50, width: 30 }}></div>
                </div>
                <h3 style={{ fontSize: "1.15rem" }}>Preparando el pago...</h3>
                <p style={{ color: "var(--ash)", fontSize: ".88rem" }}>Redirigiendo a un pago seguro. Esto tarda solo unos segundos.</p>
              </div>
            )}

            {!isProcessing && (
              <div>
                <h3>Enciende tu vela</h3>
                <p className="modal-sub">Una luz para guardar un recuerdo, un pedido o un agradecimiento.</p>

                <form onSubmit={submitPurchase}>
                  <div className="field">
                    <label>¿Para quién es esta vela?</label>
                    <input type="text" ref={formNomeRef} placeholder="Nombre de la persona homenajeada" required />
                  </div>
                  <div className="field">
                    <label>Mensaje (opcional)</label>
                    <textarea ref={formMsgRef} placeholder="Escribe una oración, recuerdo o agradecimiento..."></textarea>
                  </div>
                  <div className="field-row">
                    <div className="field">
                      <label>Tu nombre</label>
                      <input type="text" ref={formCompradorRef} placeholder="Quién la enciende" required />
                    </div>
                    <div className="field">
                      <label>Correo electrónico (para recibir el recibo de Hotmart)</label>
                      <input type="email" ref={formEmailRef} placeholder="tu@email.com" required />
                    </div>
                  </div>

                  <div className="field">
                    <label>Tamaño de la vela</label>
                    <div className="candle-options">
                      <button type="button" className={`candle-opt ${formDias === 30 ? "selected" : ""}`} onClick={() => handleCandleOptClick(30)}>
                        <div style={{ height: 80, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                          <div className="flame-wrap" style={{ transform: "scale(0.7)", transformOrigin: "bottom center", pointerEvents: "none" }}>
                            <div className="glow"></div><div className="flame"></div><div className="wick"></div>
                            <div className="wax" style={{ height: 26 }}></div>
                          </div>
                        </div>
                        <span className="days">30 dias</span>
                      </button>
                      <button type="button" className={`candle-opt ${formDias === 90 ? "selected" : ""}`} onClick={() => handleCandleOptClick(90)}>
                        <div style={{ height: 80, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                          <div className="flame-wrap" style={{ transform: "scale(0.85)", transformOrigin: "bottom center", pointerEvents: "none" }}>
                            <div className="glow"></div><div className="flame"></div><div className="wick"></div>
                            <div className="wax" style={{ height: 40 }}></div>
                          </div>
                        </div>
                        <span className="days">90 dias</span>
                      </button>
                      <button type="button" className="candle-opt candle-opt-disabled" disabled title="Disponible pronto" onClick={() => showToast("¡La vela de 365 días estará disponible pronto!")}>
                        <div style={{ height: 80, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                          <div className="flame-wrap" style={{ transform: "scale(1)", transformOrigin: "bottom center", pointerEvents: "none", opacity: 0.4 }}>
                            <div className="glow"></div><div className="flame"></div><div className="wick"></div>
                            <div className="wax" style={{ height: 54 }}></div>
                          </div>
                        </div>
                        <span className="days">365 días · pronto</span>
                      </button>
                    </div>
                  </div>

                  <button type="submit" className="btn btn-solid btn-lg btn-block" style={{ marginTop: "1rem" }}>
                    Finalizar en Hotmart (Seguro)
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {isDetailOpen && activeCandle && (
        <div className="modal-overlay open show" onClick={(e) => { if (e.target === e.currentTarget) closeDetail(); }}>
          <div className="modal detail-modal">
            <button className="modal-close" onClick={closeDetail}>✕</button>
            <div className="flame-wrap" style={{ margin: "0 auto 1rem" }}>
              {diasRestantes(activeCandle) > 0 && (
                <>
                  <div className="glow"></div>
                  <div className="flame"></div>
                </>
              )}
              <div className="wick"></div>
              <div className="wax" style={{ height: `${alturaAtual(activeCandle)}px`, width: 30 }}></div>
            </div>
            <h3 className="detail-name">{activeCandle.nome}</h3>
            <p className="detail-date">Encendida el {formatDate(activeCandle.criadoEm)} · {diasRestantes(activeCandle)} días restantes</p>
            <p className="detail-msg">{activeCandle.mensagem || "Una luz encendida en silencio, con fe y gratitud."}</p>
            <p className="detail-buyer">Homenaje de: {activeCandle.comprador}</p>

            <Link href={`/vela/${activeCandle.id}`} className="btn btn-solid btn-block" style={{ marginTop: "1rem", textAlign: "center", textDecoration: "none" }}>
              Ver Memorial Completo
            </Link>
          </div>
        </div>
      )}

      {toast.show && (
        <div className="toast show">{toast.msg}</div>
      )}
    </>
  );
}
