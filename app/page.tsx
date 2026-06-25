"use client";
import { useState, useEffect, FormEvent, useRef } from "react";

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
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
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
  const [isSuccess, setIsSuccess] = useState(false);
  
  const [toast, setToast] = useState({ show: false, msg: "" });

  const [formValor, setFormValor] = useState(5);
  const [formDias, setFormDias] = useState(30);
  const [formMethod, setFormMethod] = useState("pix");
  const [customAmountVisible, setCustomAmountVisible] = useState(false);
  const [customAmount, setCustomAmount] = useState<number | "">("");

  const formNomeRef = useRef<HTMLInputElement>(null);
  const formMsgRef = useRef<HTMLTextAreaElement>(null);
  const formCompradorRef = useRef<HTMLInputElement>(null);
  const formEmailRef = useRef<HTMLInputElement>(null);

  // Stats refs
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
  }, []);

  useEffect(() => {
    setStatCount(candles.length);
    setStatTotal(candles.reduce((acc, c) => acc + c.valor, 0));
    if (candles.length > 0) setStatLast(candles[0].nome);
  }, [candles]);

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
    setIsSuccess(false);
    setFormValor(5);
    setFormDias(30);
    setCustomAmountVisible(false);
    setCustomAmount("");
    setTimeout(() => formNomeRef.current?.focus(), 300);
  };
  
  const closeForm = () => setIsFormOpen(false);

  const openDetail = (c: Candle) => {
    setActiveCandle(c);
    setIsDetailOpen(true);
  };
  const closeDetail = () => setIsDetailOpen(false);

  const handleCandleOptClick = (valor: number, dias: number) => {
    setFormValor(valor);
    setFormDias(dias);
    setCustomAmountVisible(false);
    setCustomAmount("");
  };

  const handleCustomInput = (val: string) => {
    const v = parseFloat(val);
    setCustomAmount(val === "" ? "" : v);
    if (!isNaN(v) && v > 0) {
      setFormValor(v);
      setFormDias(Math.min(365, Math.max(15, Math.round(v * 18))));
    }
  };

  const submitPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    const nome = formNomeRef.current?.value || "";
    const mensagem = formMsgRef.current?.value || "";
    const comprador = formCompradorRef.current?.value || "";
    const email = formEmailRef.current?.value || "";

    try {
      // Salva a vela no banco como PENDENTE
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, mensagem, comprador, email, dias: formDias }),
      });
      const data = await res.json();
      
      if (data.success) {
        // Redireciona para o checkout da Hotmart correspondente
        let hotmartUrl = "";
        if (formDias === 30) {
          hotmartUrl = "https://go.hotmart.com/E106403870K";
        } else if (formDias === 15) {
          hotmartUrl = "https://pay.hotmart.com/J106475954M";
        } else {
          // Fallback para 5 dias ou caso não exista
          alert("O link para a vela de 5 dias estará disponível em breve!");
          setIsProcessing(false);
          return;
        }

        // Adiciona o email e nome na URL para preencher automaticamente na Hotmart
        const finalUrl = new URL(hotmartUrl);
        finalUrl.searchParams.append("email", email);
        finalUrl.searchParams.append("name", comprador);

        window.location.href = finalUrl.toString();
      } else {
        alert("Ocorreu um erro ao iniciar o pagamento. Tente novamente.");
        setIsProcessing(false);
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao conectar com o servidor.");
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
            <a href="#sobre">Sobre</a>
            <a href="#contagem">Como funciona</a>
          </div>
          <div className="nav-cta">
            <a href="#mural" className="btn btn-ghost">Ver Mural</a>
            <button className="btn btn-solid" onClick={openForm}>Acender uma Vela</button>
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
          <p className="eyebrow hero-eyebrow">Um memorial digital de fé</p>
          <h1>Acenda uma luz de fé para <em>quem você ama</em></h1>
          <p className="sub">Cada vela representa uma oração, uma lembrança e uma homenagem eterna.</p>
          <div className="hero-actions">
            <button className="btn btn-solid btn-lg" onClick={openForm}>Acender uma Vela</button>
            <a href="#mural" className="btn btn-ghost btn-lg">Ver Mural de Velas</a>
          </div>
        </section>

        <section className="stats">
          <div className="stats-inner">
            <div className="stat">
              <span className="num">{statCount}</span>
              <span className="label">Velas acesas</span>
            </div>
            <div className="stat">
              <span className="num">R$ {statTotal.toLocaleString("pt-BR")}</span>
              <span className="label">Arrecadado em homenagens</span>
            </div>
            <div className="stat">
              <span className="num">{statLast}</span>
              <span className="label">Última homenagem</span>
            </div>
          </div>
        </section>

        <section className="section" id="mural">
          <div className="container">
            <div className="section-head">
              <div className="divider-flame"></div>
              <p className="eyebrow">O Mural da Fé</p>
              <h2>Cada luz, uma história</h2>
              <p>Centenas de velas acesas por quem buscou conforto, gratidão e esperança. Toque em uma vela para ler a homenagem completa.</p>
            </div>

            <div className="mural-toolbar">
              <div className="search-box">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="7" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="Buscar por nome..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="filters">
                <button className={`chip ${activeFilter === "all" ? "active" : ""}`} onClick={() => setActiveFilter("all")}>Todas as datas</button>
                <button className={`chip ${activeFilter === "today" ? "active" : ""}`} onClick={() => setActiveFilter("today")}>Hoje</button>
                <button className={`chip ${activeFilter === "week" ? "active" : ""}`} onClick={() => setActiveFilter("week")}>Esta semana</button>
                <button className={`chip ${activeFilter === "month" ? "active" : ""}`} onClick={() => setActiveFilter("month")}>Este mês</button>
              </div>
            </div>

            <div className="mural-frame">
              <div className="mural-grid">
                {visibleCandles.map((c, i) => (
                  <button key={c.id} className="candle" style={{ animationDelay: `${i * 0.03}s` }} onClick={() => openDetail(c)}>
                    <div className="flame-wrap">
                      <div className="glow"></div>
                      <div className="flame"></div>
                      <div className="wick"></div>
                      <div className="wax" style={{ height: `${alturaAtual(c)}px` }}></div>
                    </div>
                    <span className="candle-name">{c.nome}</span>
                    <span className="candle-days">{diasRestantes(c)} dias restantes</span>
                  </button>
                ))}
              </div>
              {filteredCandles.length === 0 && (
                <p className="mural-empty">Nenhuma vela encontrada com esse nome ou período.</p>
              )}
            </div>

            {filteredCandles.length > visibleCount && (
              <div className="mural-more">
                <button className="btn btn-ghost" onClick={() => setVisibleCount((v) => v + 12)}>Ver mais velas</button>
              </div>
            )}
          </div>
        </section>

        <section className="section" id="contagem" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="section-head">
              <div className="divider-flame"></div>
              <p className="eyebrow">Como funciona</p>
              <h2>O tamanho da vela define o tempo da luz</h2>
              <p>Cada homenagem escolhe quanto tempo a chama permanecerá acesa no mural — assim como uma vela real, ela arde aos poucos até se apagar.</p>
            </div>
            <div className="candle-options" style={{ maxWidth: 680, margin: "0 auto" }}>
              <div className="candle-opt">
                <div className="mini-wax" style={{ width: 18, height: 26 }}></div>
                <span className="price">R$ 5</span>
                <span className="days">5 dias acesa</span>
              </div>
              <div className="candle-opt">
                <div className="mini-wax" style={{ width: 22, height: 40 }}></div>
                <span className="price">R$ 10</span>
                <span className="days">15 dias acesa</span>
              </div>
              <div className="candle-opt">
                <div className="mini-wax" style={{ width: 26, height: 54 }}></div>
                <span className="price">R$ 20</span>
                <span className="days">30 dias acesa</span>
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
              <p className="eyebrow">Sobre o projeto</p>
              <h2>Um espaço para a luz que a distância não alcança</h2>
              <p>La Voz de la Cruz nasceu como uma extensão do nosso canal de fé — um lugar para transformar oração em algo visível. Aqui, cada vela acesa carrega um nome, uma saudade, um pedido ou um agradecimento.</p>
              <p className="quote">"A luz física nem sempre alcança quem amamos. A luz digital pode atravessar qualquer distância e continuar ardendo por eles."</p>
              <p>Acreditamos que homenagear é um ato de fé contínuo. Por isso, cada vela permanece acesa pelo tempo escolhido — mantendo viva a memória de quem ela representa.</p>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="container footer-inner">
          <a href="#top" className="logo"><span className="mark" aria-hidden="true"></span>La Voz de la Cruz</a>
          <div className="footer-links">
            <a href="#top">Início</a>
            <a href="#mural">Mural</a>
            <a href="#sobre">Sobre</a>
          </div>
          <p className="footer-credit">Feito com fé. © 2026 La Voz de la Cruz.</p>
        </div>
      </footer>

      {/* FORM MODAL */}
      {isFormOpen && (
        <div className="modal-overlay open show" onClick={(e) => { if (e.target === e.currentTarget) closeForm(); }}>
          <div className="modal">
            <button className="modal-close" onClick={closeForm}>✕</button>
            
            {isProcessing && !isSuccess && (
              <div className="processing">
                <div className="flame-wrap" style={{ height: 90 }}>
                  <div className="glow"></div>
                  <div className="flame"></div>
                  <div className="wick"></div>
                  <div className="wax" style={{ height: 50, width: 30 }}></div>
                </div>
                <h3 style={{ fontSize: "1.15rem" }}>Preparando Checkout...</h3>
                <p style={{ color: "var(--ash)", fontSize: ".88rem" }}>Redirecionando para pagamento seguro. Isso leva apenas alguns segundos.</p>
              </div>
            )}

            {!isProcessing && !isSuccess && (
              <div>
                <h3>Acenda sua vela</h3>
                <p className="modal-sub">Uma luz para guardar uma memória, um pedido ou uma gratidão.</p>

                <form onSubmit={submitPurchase}>
                  <div className="field">
                    <label>Para quem é esta vela?</label>
                    <input type="text" ref={formNomeRef} placeholder="Nome da pessoa homenageada" required />
                  </div>
                  <div className="field">
                    <label>Mensagem (opcional)</label>
                    <textarea ref={formMsgRef} placeholder="Escreva uma oração, lembrança ou agradecimento..."></textarea>
                  </div>
                  <div className="field-row">
                    <div className="field">
                      <label>Seu nome</label>
                      <input type="text" ref={formCompradorRef} placeholder="Quem está acendendo" required />
                    </div>
                    <div className="field">
                      <label>E-mail (para receber o recibo da Hotmart)</label>
                      <input type="email" ref={formEmailRef} placeholder="seu@email.com" required />
                    </div>
                  </div>

                  <div className="field">
                    <label>Tamanho da vela</label>
                    <div className="candle-options">
                      <button type="button" className={`candle-opt ${formDias === 5 && !customAmount ? "selected" : ""}`} onClick={() => handleCandleOptClick(5, 5)}>
                        <div className="mini-wax" style={{ width: 18, height: 26 }}></div>
                        <span className="price">R$ 5</span><span className="days">5 dias</span>
                      </button>
                      <button type="button" className={`candle-opt ${formDias === 15 && !customAmount ? "selected" : ""}`} onClick={() => handleCandleOptClick(10, 15)}>
                        <div className="mini-wax" style={{ width: 22, height: 40 }}></div>
                        <span className="price">R$ 10</span><span className="days">15 dias</span>
                      </button>
                      <button type="button" className={`candle-opt ${formDias === 30 && !customAmount ? "selected" : ""}`} onClick={() => handleCandleOptClick(20, 30)}>
                        <div className="mini-wax" style={{ width: 26, height: 54 }}></div>
                        <span className="price">R$ 20</span><span className="days">30 dias</span>
                      </button>
                    </div>
                    <button type="button" className="chip" onClick={() => setCustomAmountVisible(!customAmountVisible)} style={{ marginBottom: ".4rem" }}>Valor personalizado</button>
                    {customAmountVisible && (
                      <div className="custom-amount show">
                        <input type="number" min="1" step="1" placeholder="Valor em R$" value={customAmount} onChange={(e) => handleCustomInput(e.target.value)} />
                      </div>
                    )}
                  </div>

                  <button type="submit" className="btn btn-solid btn-lg btn-block" style={{ marginTop: "1rem" }}>
                    Finalizar na Hotmart (Seguro)
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
              <div className="glow"></div>
              <div className="flame"></div>
              <div className="wick"></div>
              <div className="wax" style={{ height: 46, width: 30 }}></div>
            </div>
            <h3 className="detail-name">{activeCandle.nome}</h3>
            <p className="detail-date">Acesa em {formatDate(activeCandle.criadoEm)} · {diasRestantes(activeCandle)} dias restantes</p>
            <p className="detail-msg">{activeCandle.mensagem || "Uma luz acesa em silêncio, com fé e gratidão."}</p>
            <p className="detail-buyer">Homenagem de: {activeCandle.comprador}</p>
            <div className="share-row">
              <a className="share-btn" href={`https://wa.me/?text=${encodeURIComponent(`Acendi uma vela em homenagem a ${activeCandle.nome} no La Voz de la Cruz 🕯️`)}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
              <button className="share-btn" onClick={() => { navigator.clipboard?.writeText(window.location.href); showToast("Link copiado!"); }}>Copiar link</button>
            </div>
          </div>
        </div>
      )}

      {toast.show && (
        <div className="toast show">{toast.msg}</div>
      )}
    </>
  );
}
