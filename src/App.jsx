import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine, Area, AreaChart,
} from "recharts";
import {
  Flame, Dumbbell, Apple, TrendingDown, Trophy, NotebookPen, Settings,
  Droplets, Footprints, Beef, Scale, Plus, Minus, Check, ChevronLeft,
  ChevronRight, Sparkles, Heart, Moon, Zap, Target, X, Ruler, Quote,
  Star, ScanLine,
} from "lucide-react";

/* ────────────────────────────────────────────────────────────
   MikelFit · seguimiento personal — Objetivo 75 kg
   Datos persistidos con localStorage (sobreviven sesiones)
──────────────────────────────────────────────────────────── */

const C = {
  bg: "#F6F2E9",
  bg2: "#EFE9DC",
  card: "#FFFFFF",
  ink: "#241F18",
  ink2: "#5A5147",
  muted: "#8C8275",
  line: "#E7DECF",
  green: "#3C6E5B",
  greenSoft: "#E0EDE7",
  greenDeep: "#2C5546",
  amber: "#D9743B",
  amberSoft: "#FaE9DC",
  gold: "#C29230",
  red: "#C0563E",
  blue: "#4E7CA8",
  blueSoft: "#E2ECF3",
};

const KEY = "mikelfit_v1";

/* ── progresión semanal (del plan) ── */
const PROG = {
  1: { flex: 30, abs: 40, sent: 50, cardio: "20–30 min", remo: "3×12", plancha: "3×30 s", fl: "30", al: "40", sl: "50" },
  2: { flex: 40, abs: 50, sent: 60, cardio: "30 min", remo: "4×12", plancha: "3×35–40 s", fl: "40", al: "50", sl: "60" },
  3: { flex: 50, abs: 60, sent: 70, cardio: "35–40 min", remo: "4×15", plancha: "3×40–45 s", fl: "50", al: "60", sl: "70" },
  4: { flex: 60, abs: 70, sent: 80, cardio: "40 min", remo: "4×15", plancha: "3×45–60 s", fl: "60", al: "70", sl: "80" },
  5: { flex: 75, abs: 85, sent: 95, cardio: "40–45 min", remo: "5×12–15", plancha: "3×60 s", fl: "70–80", al: "80–90", sl: "90–100" },
};
const progFor = (w) => PROG[Math.min(Math.max(w, 1), 5)];

const DIAS_ES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES_ES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

const MOTIV = [
  "Hoy no buscas perfección. Buscas no romper la cadena.",
  "Te estás convirtiendo en alguien que aparece, llueva o truene.",
  "La constancia gana a la épica. Un día más, sin drama.",
  "Proteína, pasos y déficit. Lo demás es ruido.",
  "No tienes que tener ganas. Solo tienes que empezar.",
  "Bajar 0,8 kg por semana es invisible un día y enorme en ocho.",
  "El paseo de hoy también cuenta. Suma, no resta.",
  "Descansar bien también es entrenar. Cuida el sueño.",
  "Cada comida medida es una promesa que te cumples.",
  "Fuerte hasta 75, no roto. Escucha al cuerpo.",
  "Tu yo de agosto te está mirando. Dale un buen día.",
  "Las semanas limpias pesan más que los días perfectos.",
];
const RECOVERY = [
  "Ayer no salió redondo. Hoy se resetea. Empieza por el agua y lo demás cae solo.",
  "Saltarse un día no borra tres semanas. Retomas sin culpa, ahora.",
  "No has perdido el plan: solo te toca el siguiente día limpio.",
];

/* ── fechas ── */
const pad = (n) => String(n).padStart(2, "0");
const toKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromKey = (k) => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); };
const addDays = (k, n) => { const d = fromKey(k); d.setDate(d.getDate() + n); return toKey(d); };
const todayKey = () => toKey(new Date());
const diffDays = (a, b) => Math.round((fromKey(a) - fromKey(b)) / 86400000);
const weekOf = (k, inicio) => Math.floor(diffDays(k, inicio) / 7) + 1;
const fmtLong = (k) => { const d = fromKey(k); return `${DIAS_ES[d.getDay()]} ${d.getDate()} de ${MESES_ES[d.getMonth()]}`; };
const fmtShort = (k) => { const d = fromKey(k); return `${d.getDate()}/${pad(d.getMonth() + 1)}`; };

/* ── tipo de día ── */
const dayType = (k) => {
  const wd = fromKey(k).getDay();
  if (wd === 0) return "descanso";
  if (wd === 3) return "core";
  return "circuito";
};
const DAY_LABEL = { circuito: "Circuito completo", core: "Core suave + movilidad", descanso: "Descanso activo" };

/* ── estado por defecto ── */
const defaultConfig = {
  nombre: "Mikel",
  fechaInicio: "2026-05-22",
  pesoInicial: 82,
  objetivo: 75,
  semanasTotal: 8,
  kcal: 1900,
  proteina: 160,
  grasaMin: 55,
  aguaL: 3,
  pasos: 10000,
  modoNutricion: "simple",
};
const emptyDay = () => ({
  peso: null, cintura: null,
  kcal: null, proteina: null, grasas: null, carbos: null,
  comidas: { desayuno: [], comida: [], cena: [], snack: [] },
  aguaVasos: 0,
  pasos: null,
  entreno: { hecho: false, ej: {}, esfuerzo: null, notas: "" },
  check: { kcal: false, proteina: false, pasos: false, agua: false, entreno: false, sueno: false, sinAlcohol: false },
  bienestar: { energia: null, sueno: null, animo: null, motivacion: null },
  antojos: "",
  notas: "",
});
const defaultState = () => ({ config: defaultConfig, dias: {}, revisiones: {}, hitosVistos: [], favoritos: [] });

/* ── milestones ── */
const HITOS = [
  { id: "p79", titulo: "Bajar a 79 kg", desc: "Primer gran tramo · Fase 1", tipo: "peso", meta: 79, icon: Scale },
  { id: "p78", titulo: "Llegar a 78 kg", desc: "Objetivo del 30 de junio", tipo: "peso", meta: 78, icon: Scale },
  { id: "p76", titulo: "Llegar a 76 kg", desc: "Ya casi · Fase 2", tipo: "peso", meta: 76, icon: Scale },
  { id: "p75", titulo: "¡Objetivo 75 kg!", desc: "La meta del plan", tipo: "peso", meta: 75, icon: Trophy },
  { id: "e10", titulo: "10 entrenamientos", desc: "Completados en total", tipo: "entrenosTotal", meta: 10, icon: Dumbbell },
  { id: "e25", titulo: "25 entrenamientos", desc: "Constancia de verdad", tipo: "entrenosTotal", meta: 25, icon: Dumbbell },
  { id: "sem5", titulo: "5 entrenos en una semana", desc: "Semana completa según plan", tipo: "entrenosSemana", meta: 5, icon: Flame },
  { id: "agua5", titulo: "Agua 5 días seguidos", desc: "Objetivo de hidratación", tipo: "rachaAgua", meta: 5, icon: Droplets },
  { id: "pasos12", titulo: "12.000 pasos en un día", desc: "El día redondo", tipo: "pasosDia", meta: 12000, icon: Footprints },
  { id: "kcal7", titulo: "7 días cumpliendo kcal", desc: "Déficit sostenido", tipo: "rachaKcal", meta: 7, icon: Apple },
  { id: "racha7", titulo: "Una semana sin rendirte", desc: "7 días cumplidos seguidos", tipo: "rachaDia", meta: 7, icon: Sparkles },
  { id: "racha14", titulo: "14 días de constancia", desc: "Esto ya es identidad", tipo: "rachaDia", meta: 14, icon: Heart },
];

/* ── helpers de cálculo ── */
function dayCompletion(d, k) {
  if (!d) return { done: 0, total: dayType(k) === "descanso" ? 6 : 7, pct: 0 };
  const c = d.check;
  const items = ["kcal", "proteina", "pasos", "agua", "sueno", "sinAlcohol"];
  if (dayType(k) !== "descanso") items.push("entreno");
  const done = items.filter((i) => c[i]).length;
  return { done, total: items.length, pct: Math.round((done / items.length) * 100) };
}
function isDayMet(d, k) {
  // forgiving: día cumplido = al menos 5 de los aplicables (constancia, no perfección)
  const { done, total } = dayCompletion(d, k);
  return done >= Math.max(total - 2, 1);
}

/* ── almacenamiento (en el propio dispositivo) ── */
function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...defaultState(), ...JSON.parse(raw) };
  } catch (e) { /* sin datos previos */ }
  return defaultState();
}
function saveState(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
}

/* ════════ COMPONENTES UI ════════ */
const card = (extra = {}) => ({
  background: C.card, border: `1px solid ${C.line}`, borderRadius: 18,
  boxShadow: "0 1px 2px rgba(60,45,25,.04), 0 8px 24px rgba(60,45,25,.04)", ...extra,
});

function Ring({ pct, size = 92, stroke = 9, color = C.green, track = C.greenSoft, children }) {
  const r = (size - stroke) / 2, circ = 2 * Math.PI * r;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={circ}
          strokeDashoffset={circ - (Math.min(pct, 100) / 100) * circ}
          style={{ transition: "stroke-dashoffset .6s cubic-bezier(.4,0,.2,1)" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>{children}</div>
    </div>
  );
}

function Bar({ pct, color = C.green, track = C.bg2, h = 8 }) {
  return (
    <div style={{ background: track, borderRadius: 99, height: h, overflow: "hidden", width: "100%" }}>
      <div style={{ width: `${Math.min(pct, 100)}%`, height: "100%", background: color, borderRadius: 99, transition: "width .5s ease" }} />
    </div>
  );
}

function Stepper({ value, onChange, step = 1, suffix = "", min = 0, color = C.green }) {
  const btn = { width: 34, height: 34, borderRadius: 10, border: `1px solid ${C.line}`, background: C.card, color: C.ink, fontSize: 18, cursor: "pointer", display: "grid", placeItems: "center" };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <button style={btn} onClick={() => onChange(Math.max(min, +(value - step).toFixed(2)))}><Minus size={16} /></button>
      <div style={{ minWidth: 64, textAlign: "center", fontWeight: 700, fontFamily: "Fraunces, serif", fontSize: 19, color }}>{value}{suffix}</div>
      <button style={{ ...btn, borderColor: color, color }} onClick={() => onChange(+(value + step).toFixed(2))}><Plus size={16} /></button>
    </div>
  );
}

function NumField({ value, onChange, placeholder, suffix }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, background: C.bg, border: `1px solid ${C.line}`, borderRadius: 12, padding: "8px 12px" }}>
      <input type="number" inputMode="decimal" value={value ?? ""} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value === "" ? null : parseFloat(e.target.value))}
        style={{ border: "none", background: "transparent", width: "100%", fontSize: 16, color: C.ink, outline: "none", fontWeight: 600, fontFamily: "Hanken Grotesk, sans-serif" }} />
      {suffix && <span style={{ color: C.muted, fontSize: 13, fontWeight: 600 }}>{suffix}</span>}
    </div>
  );
}

function Toggle({ on, onClick, label, icon: Icon, color = C.green }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 11, width: "100%", textAlign: "left",
      padding: "13px 14px", borderRadius: 14, cursor: "pointer",
      border: `1.5px solid ${on ? color : C.line}`, background: on ? (color === C.green ? C.greenSoft : C.amberSoft) : C.card,
      transition: "all .18s ease",
    }}>
      <span style={{ width: 26, height: 26, borderRadius: 8, display: "grid", placeItems: "center", flexShrink: 0, background: on ? color : C.bg2, color: on ? "#fff" : C.muted, transition: "all .18s" }}>
        {on ? <Check size={16} strokeWidth={3} /> : (Icon && <Icon size={15} />)}
      </span>
      <span style={{ fontSize: 14.5, fontWeight: 600, color: on ? C.ink : C.ink2 }}>{label}</span>
    </button>
  );
}

function Pill({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding: "9px 15px", borderRadius: 99, whiteSpace: "nowrap", cursor: "pointer", fontSize: 13.5, fontWeight: 700,
      border: `1px solid ${active ? C.green : C.line}`, background: active ? C.green : C.card, color: active ? "#fff" : C.ink2,
      transition: "all .15s", fontFamily: "Hanken Grotesk, sans-serif",
    }}>{children}</button>
  );
}

function Section({ title, sub, children, right }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 11 }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: "Fraunces, serif", fontSize: 21, fontWeight: 600, color: C.ink, letterSpacing: "-.01em" }}>{title}</h2>
          {sub && <p style={{ margin: "2px 0 0", fontSize: 12.5, color: C.muted }}>{sub}</p>}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

/* ════════ APP ════════ */
export default function App() {
  const [state, setState] = useState(() => loadState());
  const [tab, setTab] = useState("hoy");
  const [sel, setSel] = useState(todayKey());
  const [celebra, setCelebra] = useState(null);
  const saveTimer = useRef(null);

  useEffect(() => { /* estado cargado de forma síncrona; fuentes en index.html */ }, []);

  useEffect(() => {
    if (!state) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveState(state), 350);
  }, [state]);

  const cfg = state?.config;
  const aguaVasosObj = cfg ? Math.round(cfg.aguaL * 4) : 12;

  /* derivados */
  const allDays = useMemo(() => {
    if (!state) return [];
    return Object.keys(state.dias).sort().map((k) => ({ k, ...state.dias[k] }));
  }, [state]);

  const hitoProgreso = useMemo(() => {
    if (!state) return {};
    const dias = state.dias;
    const keys = Object.keys(dias).sort();
    const pesos = keys.map((k) => dias[k].peso).filter((p) => p != null);
    const minPeso = pesos.length ? Math.min(...pesos) : cfg.pesoInicial;
    const entrenosTotal = keys.filter((k) => dias[k].entreno?.hecho).length;
    const pasosMax = keys.reduce((m, k) => Math.max(m, dias[k].pasos || 0), 0);
    // rachas
    const consec = (pred) => {
      let max = 0, run = 0;
      for (const k of keys) { if (pred(dias[k], k)) { run++; max = Math.max(max, run); } else run = 0; }
      return max;
    };
    const rachaAgua = consec((d) => (d.aguaVasos || 0) >= aguaVasosObj);
    const rachaKcal = consec((d) => d.check?.kcal);
    const rachaDia = consec((d, k) => isDayMet(d, k));
    // entrenos por semana
    const semanaCount = {};
    keys.forEach((k) => { if (dias[k].entreno?.hecho) { const w = weekOf(k, cfg.fechaInicio); semanaCount[w] = (semanaCount[w] || 0) + 1; } });
    const entrenosSemana = Object.values(semanaCount).reduce((m, v) => Math.max(m, v), 0);

    const res = {};
    HITOS.forEach((h) => {
      let cur = 0, pct = 0, done = false;
      if (h.tipo === "peso") {
        const ganado = cfg.pesoInicial - minPeso;
        const necesario = cfg.pesoInicial - h.meta;
        cur = minPeso; pct = necesario > 0 ? (ganado / necesario) * 100 : 0; done = minPeso <= h.meta;
      } else if (h.tipo === "entrenosTotal") { cur = entrenosTotal; pct = (cur / h.meta) * 100; done = cur >= h.meta; }
      else if (h.tipo === "entrenosSemana") { cur = entrenosSemana; pct = (cur / h.meta) * 100; done = cur >= h.meta; }
      else if (h.tipo === "rachaAgua") { cur = rachaAgua; pct = (cur / h.meta) * 100; done = cur >= h.meta; }
      else if (h.tipo === "rachaKcal") { cur = rachaKcal; pct = (cur / h.meta) * 100; done = cur >= h.meta; }
      else if (h.tipo === "rachaDia") { cur = rachaDia; pct = (cur / h.meta) * 100; done = cur >= h.meta; }
      else if (h.tipo === "pasosDia") { cur = pasosMax; pct = (cur / h.meta) * 100; done = cur >= h.meta; }
      res[h.id] = { cur, pct: Math.min(Math.max(pct, 0), 100), done };
    });
    return res;
  }, [state, cfg, aguaVasosObj]);

  // racha actual (hacia atrás desde hoy)
  const rachaActual = useMemo(() => {
    if (!state) return 0;
    let k = todayKey(), n = 0;
    while (true) {
      const d = state.dias[k];
      if (d && isDayMet(d, k)) { n++; k = addDays(k, -1); } else break;
      if (n > 400) break;
    }
    return n;
  }, [state]);

  // celebraciones de hitos nuevos
  useEffect(() => {
    if (!state || celebra) return;
    const nuevos = HITOS.filter((h) => hitoProgreso[h.id]?.done && !state.hitosVistos.includes(h.id));
    if (nuevos.length) setCelebra(nuevos[0]);
  }, [hitoProgreso, state, celebra]);

  if (!state) {
    return <div style={{ minHeight: 320, display: "grid", placeItems: "center", color: C.muted, fontFamily: "Hanken Grotesk, sans-serif" }}>Cargando tu plan…</div>;
  }

  /* mutadores */
  const setDay = (k, patch) => setState((s) => {
    const dias = { ...s.dias }; dias[k] = { ...emptyDay(), ...dias[k], ...patch }; return { ...s, dias };
  });
  const setSub = (k, sec, patch) => setState((s) => {
    const dias = { ...s.dias }; const cur = { ...emptyDay(), ...dias[k] };
    dias[k] = { ...cur, [sec]: { ...cur[sec], ...patch } }; return { ...s, dias };
  });
  const setConfig = (patch) => setState((s) => ({ ...s, config: { ...s.config, ...patch } }));
  const setRevision = (w, patch) => setState((s) => ({ ...s, revisiones: { ...s.revisiones, [w]: { ...s.revisiones[w], ...patch } } }));
  const verHito = (id) => setState((s) => ({ ...s, hitosVistos: [...new Set([...s.hitosVistos, id])] }));
  const addFav = (item) => setState((s) => {
    const favs = s.favoritos || [];
    const nom = (item.nombre || "").trim();
    if (!nom || favs.some((f) => f.nombre.toLowerCase() === nom.toLowerCase())) return s;
    const nuevo = { id: Date.now() + "_" + Math.random().toString(36).slice(2, 7), nombre: nom, kcal: +item.kcal || 0, prot: +item.prot || 0 };
    return { ...s, favoritos: [...favs, nuevo] };
  });
  const delFav = (id) => setState((s) => ({ ...s, favoritos: (s.favoritos || []).filter((f) => f.id !== id) }));

  const semanaActual = Math.min(Math.max(weekOf(todayKey(), cfg.fechaInicio), 1), cfg.semanasTotal);
  const tabs = [
    { id: "hoy", label: "Hoy", icon: Flame },
    { id: "entreno", label: "Entreno", icon: Dumbbell },
    { id: "comida", label: "Alimentación", icon: Apple },
    { id: "progreso", label: "Progreso", icon: TrendingDown },
    { id: "hitos", label: "Hitos", icon: Trophy },
    { id: "revision", label: "Revisión", icon: NotebookPen },
    { id: "ajustes", label: "Ajustes", icon: Settings },
  ];

  return (
    <div style={{
      fontFamily: "Hanken Grotesk, system-ui, sans-serif", background: C.bg, color: C.ink,
      minHeight: "100vh", WebkitFontSmoothing: "antialiased",
      backgroundImage: `radial-gradient(900px 380px at 110% -8%, ${C.greenSoft}66, transparent), radial-gradient(700px 320px at -10% 0%, ${C.amberSoft}88, transparent)`,
    }}>
      <style>{`
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        ::-webkit-scrollbar{ height:6px; width:6px;} ::-webkit-scrollbar-thumb{ background:${C.line}; border-radius:9px;}
        input[type=number]::-webkit-inner-spin-button{ -webkit-appearance:none; }
        @keyframes pop { 0%{transform:scale(.6);opacity:0} 60%{transform:scale(1.08)} 100%{transform:scale(1);opacity:1} }
        @keyframes fade { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        .fade{ animation: fade .4s ease both; }
      `}</style>

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "0 0 30px" }}>
        {/* Header */}
        <header style={{ padding: "22px 18px 6px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: C.green, letterSpacing: ".08em", textTransform: "uppercase" }}>Semana {semanaActual} de {cfg.semanasTotal}</div>
              <h1 style={{ margin: "1px 0 0", fontFamily: "Fraunces, serif", fontSize: 27, fontWeight: 600, letterSpacing: "-.02em" }}>Objetivo 75&nbsp;kg</h1>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: C.amberSoft, color: C.amber, padding: "6px 11px", borderRadius: 99, fontWeight: 800, fontSize: 14 }}>
                <Flame size={15} /> {rachaActual} {rachaActual === 1 ? "día" : "días"}
              </div>
            </div>
          </div>
        </header>

        {/* Nav */}
        <nav style={{ display: "flex", gap: 8, overflowX: "auto", padding: "10px 18px 14px" }}>
          {tabs.map((t) => <Pill key={t.id} active={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</Pill>)}
        </nav>

        <main style={{ padding: "0 18px" }} className="fade" key={tab}>
          {tab === "hoy" && <Hoy {...{ state, cfg, sel, setSel, setDay, setSub, aguaVasosObj, rachaActual }} />}
          {tab === "entreno" && <Entreno {...{ state, cfg, sel, setSel, setSub }} />}
          {tab === "comida" && <Comida {...{ state, cfg, sel, setSel, setDay, setSub, setConfig, aguaVasosObj, addFav, delFav }} />}
          {tab === "progreso" && <Progreso {...{ state, cfg, allDays }} />}
          {tab === "hitos" && <Hitos {...{ hitoProgreso, state, verHito }} />}
          {tab === "revision" && <Revision {...{ state, cfg, semanaActual, setRevision, hitoProgreso }} />}
          {tab === "ajustes" && <Ajustes {...{ cfg, setConfig, state, setState }} />}
        </main>
      </div>

      {/* Celebración */}
      {celebra && (
        <div onClick={() => { verHito(celebra.id); setCelebra(null); }} style={{ position: "fixed", inset: 0, background: "rgba(36,31,24,.55)", display: "grid", placeItems: "center", zIndex: 50, padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...card(), maxWidth: 340, width: "100%", padding: 28, textAlign: "center", animation: "pop .45s cubic-bezier(.34,1.56,.64,1) both" }}>
            <div style={{ width: 72, height: 72, margin: "0 auto 14px", borderRadius: 20, background: C.gold, display: "grid", placeItems: "center", color: "#fff", boxShadow: `0 10px 28px ${C.gold}66` }}>
              <celebra.icon size={34} />
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: C.gold, letterSpacing: ".1em", textTransform: "uppercase" }}>Hito desbloqueado</div>
            <h3 style={{ fontFamily: "Fraunces, serif", fontSize: 23, margin: "6px 0 4px", fontWeight: 600 }}>{celebra.titulo}</h3>
            <p style={{ color: C.ink2, fontSize: 14, margin: "0 0 18px" }}>{celebra.desc}. Pequeñas victorias, gran cambio.</p>
            <button onClick={() => { verHito(celebra.id); setCelebra(null); }} style={{ background: C.green, color: "#fff", border: "none", borderRadius: 12, padding: "12px 22px", fontWeight: 700, fontSize: 15, cursor: "pointer", width: "100%" }}>Seguir así 💪</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════ NAVEGADOR DE FECHA ════════ */
function DateNav({ sel, setSel }) {
  const hoy = todayKey();
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: "8px 10px", marginBottom: 16 }}>
      <button onClick={() => setSel(addDays(sel, -1))} style={navBtn}><ChevronLeft size={18} /></button>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontWeight: 700, fontSize: 14.5, textTransform: "capitalize" }}>{sel === hoy ? "Hoy" : fmtLong(sel)}</div>
        {sel !== hoy && <button onClick={() => setSel(hoy)} style={{ background: "none", border: "none", color: C.green, fontWeight: 700, fontSize: 12, cursor: "pointer", padding: 0 }}>Volver a hoy</button>}
      </div>
      <button onClick={() => sel < hoy && setSel(addDays(sel, 1))} disabled={sel >= hoy} style={{ ...navBtn, opacity: sel >= hoy ? .35 : 1 }}><ChevronRight size={18} /></button>
    </div>
  );
}
const navBtn = { width: 36, height: 36, borderRadius: 10, border: `1px solid ${C.line}`, background: C.bg, cursor: "pointer", display: "grid", placeItems: "center", color: C.ink };

/* ════════ HOY ════════ */
function Hoy({ state, cfg, sel, setSel, setDay, setSub, aguaVasosObj, rachaActual }) {
  const d = state.dias[sel] || emptyDay();
  const semana = Math.min(Math.max(weekOf(sel, cfg.fechaInicio), 1), cfg.semanasTotal);
  const p = progFor(semana);
  const tipo = dayType(sel);
  const comp = dayCompletion(d, sel);
  const msg = MOTIV[diffDays(sel, cfg.fechaInicio) % MOTIV.length] || MOTIV[0];
  const ayer = state.dias[addDays(sel, -1)];
  const mostrarRecovery = ayer && !isDayMet(ayer, addDays(sel, -1));
  const recMsg = RECOVERY[diffDays(sel, cfg.fechaInicio) % RECOVERY.length] || RECOVERY[0];

  const check = (key) => setSub(sel, "check", { [key]: !d.check[key] });

  const checks = [
    { k: "kcal", label: `${cfg.kcal} kcal cumplidas`, icon: Apple },
    { k: "proteina", label: `${cfg.proteina} g de proteína`, icon: Beef },
    { k: "pasos", label: `${cfg.pasos.toLocaleString("es-ES")} pasos mínimo`, icon: Footprints },
    { k: "agua", label: `${cfg.aguaL} L de agua`, icon: Droplets },
    ...(tipo !== "descanso" ? [{ k: "entreno", label: "Entrenamiento del día", icon: Dumbbell }] : []),
    { k: "sueno", label: "7 h de sueño", icon: Moon },
    { k: "sinAlcohol", label: "Sin alcohol ni picoteos ocultos", icon: Check },
  ];

  return (
    <>
      <DateNav sel={sel} setSel={setSel} />

      {/* resumen del día */}
      <div style={{ ...card(), padding: 18, marginBottom: 16, display: "flex", gap: 18, alignItems: "center" }}>
        <Ring pct={comp.pct} color={comp.pct >= 80 ? C.green : C.amber} track={comp.pct >= 80 ? C.greenSoft : C.amberSoft}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 24, fontWeight: 700, lineHeight: 1 }}>{comp.pct}%</div>
            <div style={{ fontSize: 10.5, color: C.muted, fontWeight: 600 }}>del día</div>
          </div>
        </Ring>
        <div style={{ flex: 1 }}>
          <div style={{ display: "inline-block", background: tipo === "circuito" ? C.greenSoft : tipo === "core" ? C.blueSoft : C.bg2, color: tipo === "circuito" ? C.greenDeep : tipo === "core" ? C.blue : C.ink2, padding: "4px 10px", borderRadius: 8, fontSize: 12, fontWeight: 700, marginBottom: 6 }}>{DAY_LABEL[tipo]}</div>
          <p style={{ margin: 0, fontSize: 14, color: C.ink2 }}>{comp.done} de {comp.total} hábitos completados hoy.</p>
        </div>
      </div>

      {/* motivación */}
      <div style={{ ...card({ background: mostrarRecovery ? C.amberSoft : C.greenSoft, border: "none" }), padding: 16, marginBottom: 16, display: "flex", gap: 12 }}>
        <Quote size={20} color={mostrarRecovery ? C.amber : C.green} style={{ flexShrink: 0, marginTop: 2 }} />
        <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: C.ink, fontStyle: "italic", lineHeight: 1.45 }}>{mostrarRecovery ? recMsg : msg}</p>
      </div>

      {/* registro rápido */}
      <Section title="Registro rápido" sub="Menos de 2 minutos">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <QuickField label="Peso" suffix="kg" icon={Scale} value={d.peso} onChange={(v) => setDay(sel, { peso: v })} color={C.green} />
          <QuickField label="Pasos" icon={Footprints} value={d.pasos} onChange={(v) => setDay(sel, { pasos: v })} color={C.blue} />
          <QuickField label="Calorías" suffix="kcal" icon={Apple} value={d.kcal} onChange={(v) => setDay(sel, { kcal: v })} color={C.amber} />
          <QuickField label="Proteína" suffix="g" icon={Beef} value={d.proteina} onChange={(v) => setDay(sel, { proteina: v })} color={C.red} />
        </div>
        {/* agua */}
        <div style={{ ...card(), padding: 14, marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Droplets size={18} color={C.blue} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Agua</div>
              <div style={{ fontSize: 12, color: C.muted }}>{((d.aguaVasos || 0) * 0.25).toFixed(2)} L / {cfg.aguaL} L</div>
            </div>
          </div>
          <Stepper value={d.aguaVasos || 0} onChange={(v) => setDay(sel, { aguaVasos: Math.max(0, Math.round(v)) })} suffix=" vasos" color={C.blue} />
        </div>
      </Section>

      {/* checklist diario */}
      <Section title="Checklist diario" sub="Constancia, no perfección">
        <div style={{ display: "grid", gap: 9 }}>
          {checks.map((c) => <Toggle key={c.k} on={d.check[c.k]} onClick={() => check(c.k)} label={c.label} icon={c.icon} />)}
        </div>
      </Section>

      {/* bienestar */}
      <Section title="¿Cómo te sientes?" sub="Opcional · 1 a 5">
        <div style={{ ...card(), padding: 14, display: "grid", gap: 12 }}>
          {[{ k: "energia", l: "Energía", ic: "⚡" }, { k: "sueno", l: "Sueño", ic: "😴" }, { k: "animo", l: "Ánimo", ic: "🙂" }].map((b) => (
            <div key={b.k} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13.5, fontWeight: 600 }}>{b.ic} {b.l}</span>
              <div style={{ display: "flex", gap: 6 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => setSub(sel, "bienestar", { [b.k]: d.bienestar[b.k] === n ? null : n })} style={{
                    width: 30, height: 30, borderRadius: 9, cursor: "pointer", fontWeight: 700, fontSize: 13,
                    border: `1.5px solid ${d.bienestar[b.k] >= n ? C.green : C.line}`,
                    background: d.bienestar[b.k] >= n ? C.greenSoft : C.card, color: d.bienestar[b.k] >= n ? C.greenDeep : C.muted,
                  }}>{n}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* entreno de hoy resumido */}
      {tipo === "circuito" && (
        <div style={{ ...card(), padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Dumbbell size={17} color={C.green} />
            <strong style={{ fontSize: 15 }}>Circuito de hoy · Semana {semana}</strong>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 13.5 }}>
            <Mini label="Flexiones" v={`${p.fl}`} />
            <Mini label="Abdominales" v={`${p.al}`} />
            <Mini label="Sentadillas" v={`${p.sl}`} />
            <Mini label="Remo mochila" v={p.remo} />
            <Mini label="Plancha" v={p.plancha} />
            <Mini label="Cardio" v={p.cardio} />
          </div>
        </div>
      )}
    </>
  );
}
function QuickField({ label, suffix, icon: Icon, value, onChange, color }) {
  return (
    <div style={{ ...card(), padding: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7, color: C.ink2 }}>
        <Icon size={15} color={color} /><span style={{ fontSize: 12.5, fontWeight: 700 }}>{label}</span>
      </div>
      <NumField value={value} onChange={onChange} placeholder="—" suffix={suffix} />
    </div>
  );
}
function Mini({ label, v }) {
  return (
    <div style={{ background: C.bg, borderRadius: 10, padding: "9px 11px" }}>
      <div style={{ fontSize: 11.5, color: C.muted, fontWeight: 600 }}>{label}</div>
      <div style={{ fontWeight: 700, fontFamily: "Fraunces, serif", fontSize: 16 }}>{v}</div>
    </div>
  );
}

/* ════════ ENTRENO ════════ */
function Entreno({ state, cfg, sel, setSel, setSub }) {
  const d = state.dias[sel] || emptyDay();
  const semana = Math.min(Math.max(weekOf(sel, cfg.fechaInicio), 1), cfg.semanasTotal);
  const p = progFor(semana);
  const tipo = dayType(sel);

  const ejercicios = tipo === "circuito"
    ? [
        { k: "calent", n: "Calentamiento", d: "5–7 min · movilidad de hombros, cadera y tobillos" },
        { k: "flex", n: "Flexiones", d: `${p.fl} totales · deja 1–2 reps en reserva` },
        { k: "abs", n: "Abdominales (crunch)", d: `${p.al} totales · sin tirar del cuello` },
        { k: "sent", n: "Sentadillas", d: `${p.sl} totales · rodillas alineadas` },
        { k: "remo", n: "Remo con mochila", d: `${p.remo} · espalda recta, controla la bajada` },
        { k: "plancha", n: "Plancha", d: `${p.plancha} · cuerpo recto, sin hundir lumbar` },
        { k: "cardio", n: "Cardio", d: `${p.cardio} · caminar rápido o bici` },
      ]
    : tipo === "core"
    ? [
        { k: "movil", n: "Movilidad", d: "Hombros, cadera, tobillos" },
        { k: "absSuave", n: "Core suave", d: "Crunch controlado y plancha ligera" },
        { k: "plancha", n: "Plancha", d: p.plancha },
        { k: "caminata", n: "Caminata larga o bici", d: "Recuperar sin parar del todo" },
      ]
    : [{ k: "paseo", n: "Descanso activo", d: "Paseo suave · recuperación física y mental" }];

  const ej = d.entreno.ej || {};
  const toggleEj = (k) => setSub(sel, "entreno", { ej: { ...ej, [k]: !ej[k] } });
  const setEntreno = (patch) => setSub(sel, "entreno", patch);

  return (
    <>
      <DateNav sel={sel} setSel={setSel} />
      <div style={{ ...card({ background: C.greenSoft, border: "none" }), padding: 16, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: C.greenDeep, textTransform: "uppercase", letterSpacing: ".05em" }}>Semana {semana}</div>
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 22, fontWeight: 600, color: C.ink }}>{DAY_LABEL[tipo]}</div>
        </div>
        <Dumbbell size={30} color={C.green} />
      </div>

      <Section title="Ejercicios" sub="Marca lo que completes">
        <div style={{ display: "grid", gap: 9 }}>
          {ejercicios.map((e) => (
            <button key={e.k} onClick={() => toggleEj(e.k)} style={{
              display: "flex", gap: 12, textAlign: "left", padding: 13, borderRadius: 14, cursor: "pointer",
              border: `1.5px solid ${ej[e.k] ? C.green : C.line}`, background: ej[e.k] ? C.greenSoft : C.card, alignItems: "flex-start",
            }}>
              <span style={{ width: 24, height: 24, borderRadius: 7, marginTop: 1, flexShrink: 0, display: "grid", placeItems: "center", background: ej[e.k] ? C.green : C.bg2, color: ej[e.k] ? "#fff" : C.muted }}>
                {ej[e.k] && <Check size={15} strokeWidth={3} />}
              </span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14.5 }}>{e.n}</div>
                <div style={{ fontSize: 12.5, color: C.ink2, marginTop: 1 }}>{e.d}</div>
              </div>
            </button>
          ))}
        </div>
      </Section>

      <Section title="¿Entrenamiento completado?">
        <button onClick={() => setEntreno({ hecho: !d.entreno.hecho })} style={{
          width: "100%", padding: 15, borderRadius: 14, cursor: "pointer", fontWeight: 800, fontSize: 16,
          border: "none", background: d.entreno.hecho ? C.green : C.card, color: d.entreno.hecho ? "#fff" : C.ink,
          boxShadow: d.entreno.hecho ? `0 8px 22px ${C.green}44` : `inset 0 0 0 1.5px ${C.line}`,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          {d.entreno.hecho ? <><Check size={20} strokeWidth={3} /> ¡Hecho! Bien ahí</> : "Marcar como completado"}
        </button>

        {d.entreno.hecho && (
          <div className="fade" style={{ marginTop: 14 }}>
            <label style={lbl}>Esfuerzo percibido · {d.entreno.esfuerzo || 5}/10</label>
            <input type="range" min={1} max={10} value={d.entreno.esfuerzo || 5} onChange={(e) => setEntreno({ esfuerzo: +e.target.value })} style={{ width: "100%", accentColor: C.green }} />
            <label style={{ ...lbl, marginTop: 12 }}>Notas post-entreno</label>
            <textarea value={d.entreno.notas} onChange={(e) => setEntreno({ notas: e.target.value })} placeholder="¿Cómo te has sentido? ¿Alguna molestia?"
              style={ta} rows={2} />
          </div>
        )}
      </Section>

      <div style={{ ...card({ background: C.amberSoft, border: "none" }), padding: 14, fontSize: 13, color: C.ink2, display: "flex", gap: 10 }}>
        <Zap size={17} color={C.amber} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>Si notas dolor punzante en hombro, muñeca, rodilla o lumbar, baja volumen o descansa. La constancia gana a la épica: el objetivo es llegar a 75 kg fuerte, no roto.</span>
      </div>
    </>
  );
}
const lbl = { display: "block", fontSize: 12.5, fontWeight: 700, color: C.ink2, marginBottom: 6 };
const ta = { width: "100%", border: `1px solid ${C.line}`, borderRadius: 12, padding: 11, fontSize: 14, fontFamily: "Hanken Grotesk, sans-serif", resize: "vertical", background: C.bg, color: C.ink, outline: "none" };

/* ════════ ALIMENTACIÓN ════════ */
function Comida({ state, cfg, sel, setSel, setDay, setSub, setConfig, aguaVasosObj, addFav, delFav }) {
  const d = state.dias[sel] || emptyDay();
  const modo = cfg.modoNutricion;
  const favs = state.favoritos || [];
  const [nuevo, setNuevo] = useState({ comida: "", nombre: "", kcal: "", prot: "" });
  const [scanMeal, setScanMeal] = useState(null);
  const [favEdit, setFavEdit] = useState(false);

  const totalKcal = ["desayuno", "comida", "cena", "snack"].reduce((s, m) => s + (d.comidas[m] || []).reduce((a, x) => a + (+x.kcal || 0), 0), 0);
  const totalProt = ["desayuno", "comida", "cena", "snack"].reduce((s, m) => s + (d.comidas[m] || []).reduce((a, x) => a + (+x.prot || 0), 0), 0);

  // añade un alimento a una comida y recalcula los totales del día desde cero
  const pushFood = (meal, item) => {
    const nom = (item.nombre || "").trim();
    if (!nom) return;
    const arr = [...(d.comidas[meal] || []), { nombre: nom, kcal: +item.kcal || 0, prot: +item.prot || 0 }];
    setSub(sel, "comidas", { [meal]: arr });
    const meals = ["desayuno", "comida", "cena", "snack"];
    const comidasNew = { ...d.comidas, [meal]: arr };
    const tK = meals.reduce((s, m) => s + (comidasNew[m] || []).reduce((a, x) => a + (+x.kcal || 0), 0), 0);
    const tP = meals.reduce((s, m) => s + (comidasNew[m] || []).reduce((a, x) => a + (+x.prot || 0), 0), 0);
    setDay(sel, { kcal: tK, proteina: tP });
  };

  const addComida = (meal) => {
    if (nuevo.comida !== meal) return;
    pushFood(meal, { nombre: nuevo.nombre, kcal: nuevo.kcal, prot: nuevo.prot });
    setNuevo({ comida: "", nombre: "", kcal: "", prot: "" });
  };
  const delComida = (meal, i) => {
    const arr = (d.comidas[meal] || []).filter((_, idx) => idx !== i);
    setSub(sel, "comidas", { [meal]: arr });
    const meals = ["desayuno", "comida", "cena", "snack"];
    const comidasNew = { ...d.comidas, [meal]: arr };
    const tK = meals.reduce((s, m) => s + (comidasNew[m] || []).reduce((a, x) => a + (+x.kcal || 0), 0), 0);
    const tP = meals.reduce((s, m) => s + (comidasNew[m] || []).reduce((a, x) => a + (+x.prot || 0), 0), 0);
    setDay(sel, { kcal: tK, proteina: tP });
  };

  return (
    <>
      <DateNav sel={sel} setSel={setSel} />

      {/* modo */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, background: C.bg2, padding: 4, borderRadius: 12 }}>
        {["simple", "detallado"].map((m) => (
          <button key={m} onClick={() => setConfig({ modoNutricion: m })} style={{
            flex: 1, padding: "9px 0", borderRadius: 9, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13.5,
            background: modo === m ? C.card : "transparent", color: modo === m ? C.ink : C.muted,
            boxShadow: modo === m ? "0 1px 3px rgba(0,0,0,.08)" : "none", textTransform: "capitalize",
          }}>{m === "simple" ? "Modo simple" : "Modo detallado"}</button>
        ))}
      </div>

      {/* objetivos */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
        <MacroCard label="Calorías" cur={modo === "detallado" ? totalKcal : (d.kcal || 0)} obj={cfg.kcal} suffix="kcal" color={C.amber} soft={C.amberSoft} invert />
        <MacroCard label="Proteína" cur={modo === "detallado" ? totalProt : (d.proteina || 0)} obj={cfg.proteina} suffix="g" color={C.red} soft={"#FBE6E0"} />
      </div>

      {modo === "simple" ? (
        <>
          <Section title="Registro" sub="Lo esencial del día">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <QuickField label="Calorías" suffix="kcal" icon={Apple} value={d.kcal} onChange={(v) => setDay(sel, { kcal: v })} color={C.amber} />
              <QuickField label="Proteína" suffix="g" icon={Beef} value={d.proteina} onChange={(v) => setDay(sel, { proteina: v })} color={C.red} />
            </div>
            <div style={{ ...card(), padding: 14, marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Droplets size={18} color={C.blue} />
                <div><div style={{ fontWeight: 700, fontSize: 14 }}>Agua</div><div style={{ fontSize: 12, color: C.muted }}>{((d.aguaVasos || 0) * 0.25).toFixed(2)} L / {cfg.aguaL} L</div></div>
              </div>
              <Stepper value={d.aguaVasos || 0} onChange={(v) => setDay(sel, { aguaVasos: Math.max(0, Math.round(v)) })} suffix=" v" color={C.blue} />
            </div>
          </Section>
          <Section title="Hábitos de hoy">
            <div style={{ display: "grid", gap: 9 }}>
              <Toggle on={d.check.kcal} onClick={() => setSub(sel, "check", { kcal: !d.check.kcal })} label="He cumplido las calorías" icon={Apple} />
              <Toggle on={d.check.proteina} onClick={() => setSub(sel, "check", { proteina: !d.check.proteina })} label="He llegado a la proteína" icon={Beef} />
              <Toggle on={d.check.sinAlcohol} onClick={() => setSub(sel, "check", { sinAlcohol: !d.check.sinAlcohol })} label="Sin alcohol ni picoteos ocultos" icon={Check} />
            </div>
          </Section>
          <Section title="Antojos / notas" sub="Sin culpa, solo conciencia">
            <textarea value={d.antojos} onChange={(e) => setDay(sel, { antojos: e.target.value })} placeholder="¿Algún antojo o disparador hoy? Anótalo sin juzgarte." style={ta} rows={2} />
          </Section>
        </>
      ) : (
        <>
          {["desayuno", "comida", "cena", "snack"].map((meal) => (
            <Section key={meal} title={meal[0].toUpperCase() + meal.slice(1)}>
              <div style={{ display: "grid", gap: 7 }}>
                {(d.comidas[meal] || []).map((x, i) => (
                  <div key={i} style={{ ...card(), padding: "10px 13px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div><div style={{ fontWeight: 600, fontSize: 14 }}>{x.nombre}</div><div style={{ fontSize: 12, color: C.muted }}>{x.kcal} kcal · {x.prot} g prot</div></div>
                    <button onClick={() => delComida(meal, i)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer" }}><X size={16} /></button>
                  </div>
                ))}
              </div>
              {nuevo.comida === meal ? (
                <div style={{ ...card(), padding: 12, marginTop: 8, display: "grid", gap: 10 }}>
                  {favs.length > 0 && (
                    <div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: C.ink2 }}>Tus favoritos</span>
                        <button onClick={() => setFavEdit((v) => !v)} style={{ background: "none", border: "none", color: C.muted, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>{favEdit ? "Listo" : "Editar"}</button>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                        {favs.map((f) => (
                          <span key={f.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.greenSoft, color: C.greenDeep, borderRadius: 99, padding: "7px 11px", fontSize: 13, fontWeight: 700 }}>
                            <button onClick={() => pushFood(meal, f)} style={{ background: "none", border: "none", color: "inherit", font: "inherit", cursor: "pointer", padding: 0 }}>{f.nombre} · {f.kcal} kcal</button>
                            {favEdit && <button onClick={() => delFav(f.id)} title="Quitar favorito" style={{ background: "none", border: "none", color: C.red, cursor: "pointer", padding: 0, lineHeight: 0, display: "flex" }}><X size={13} /></button>}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <input autoFocus value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} placeholder="¿Qué has comido?" style={inp} />
                  <div style={{ display: "flex", gap: 8 }}>
                    <input value={nuevo.kcal} onChange={(e) => setNuevo({ ...nuevo, kcal: e.target.value })} placeholder="kcal" inputMode="numeric" style={{ ...inp, flex: 1 }} />
                    <input value={nuevo.prot} onChange={(e) => setNuevo({ ...nuevo, prot: e.target.value })} placeholder="prot (g)" inputMode="numeric" style={{ ...inp, flex: 1 }} />
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => { if (nuevo.nombre.trim()) addFav({ nombre: nuevo.nombre, kcal: nuevo.kcal, prot: nuevo.prot }); }} title="Guardar como favorito" style={{ background: C.greenSoft, color: C.greenDeep, border: "none", borderRadius: 10, padding: "0 13px", fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}><Star size={15} /> Guardar</button>
                    <button onClick={() => addComida(meal)} style={{ flex: 1, background: C.green, color: "#fff", border: "none", borderRadius: 10, padding: "11px 16px", fontWeight: 700, cursor: "pointer" }}>Añadir</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button onClick={() => setNuevo({ comida: meal, nombre: "", kcal: "", prot: "" })} style={{ flex: 1, padding: 11, borderRadius: 12, border: `1.5px dashed ${C.line}`, background: "transparent", color: C.green, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Plus size={16} /> Añadir alimento</button>
                  <button onClick={() => setScanMeal(meal)} title="Escanear código de barras" style={{ width: 50, borderRadius: 12, border: `1.5px solid ${C.line}`, background: C.card, color: C.green, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><ScanLine size={18} /></button>
                </div>
              )}
            </Section>
          ))}
        </>
      )}

      {scanMeal && (
        <Scanner
          onClose={() => setScanMeal(null)}
          onResult={(item) => { pushFood(scanMeal, item); setScanMeal(null); }}
        />
      )}
    </>
  );
}
const inp = { border: `1px solid ${C.line}`, borderRadius: 10, padding: "10px 12px", fontSize: 14, fontFamily: "Hanken Grotesk, sans-serif", background: C.bg, color: C.ink, outline: "none", width: "100%" };

/* ════════ ESCÁNER DE CÓDIGO DE BARRAS ════════
   Cámara con BarcodeDetector nativo (Android/Chrome).
   En navegadores sin soporte (p. ej. iOS/Safari) cae al alta por código a mano.
   Macros desde Open Food Facts (gratis, sin clave). */
function Scanner({ onClose, onResult }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const supported = typeof window !== "undefined" && "BarcodeDetector" in window;
  const [phase, setPhase] = useState(supported ? "scan" : "manual"); // scan | manual | product
  const [ean, setEan] = useState("");
  const [manualEan, setManualEan] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [prod, setProd] = useState(null); // { nombre, kcal100, prot100 }
  const [gramos, setGramos] = useState("100");

  const stopCam = () => {
    const s = streamRef.current;
    if (s) { s.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
  };
  const close = () => { stopCam(); onClose(); };

  const lookup = async (code) => {
    stopCam();
    setEan(code); setBusy(true); setErr(""); setProd(null); setPhase("product");
    try {
      const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=product_name,product_name_es,brands,nutriments`);
      const j = await r.json();
      if (j.status !== 1 || !j.product) { setErr("No está en la base de datos. Añádelo a mano abajo."); setBusy(false); return; }
      const n = j.product.nutriments || {};
      let kcal100 = n["energy-kcal_100g"];
      if (kcal100 == null && n["energy_100g"] != null) kcal100 = n["energy_100g"] / 4.184; // kJ → kcal
      const prot100 = n["proteins_100g"];
      const nombre = j.product.product_name_es || j.product.product_name || "Producto";
      const marca = j.product.brands ? ` (${j.product.brands.split(",")[0].trim()})` : "";
      setProd({
        nombre: nombre + marca,
        kcal100: kcal100 != null ? Math.round(kcal100) : null,
        prot100: prot100 != null ? Math.round(prot100 * 10) / 10 : null,
      });
      setBusy(false);
    } catch (e) {
      setErr("No se pudo consultar la base de datos. Revisa la conexión o añade a mano.");
      setBusy(false);
    }
  };

  // ciclo de detección por cámara
  useEffect(() => {
    if (phase !== "scan" || !supported) return;
    let stop = false, timer, detector;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (stop) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; try { await videoRef.current.play(); } catch (e) {} }
        try { detector = new window.BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39"] }); }
        catch (e) { detector = new window.BarcodeDetector(); }
        timer = setInterval(async () => {
          if (stop || !videoRef.current || !detector) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes && codes.length) { clearInterval(timer); lookup(codes[0].rawValue); }
          } catch (e) { /* frame sin código */ }
        }, 450);
      } catch (e) {
        setErr("No se pudo abrir la cámara. Usa el alta manual por código.");
        setPhase("manual");
      }
    })();
    return () => { stop = true; clearInterval(timer); stopCam(); };
  }, [phase, supported]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => stopCam(), []); // por si se desmonta

  const confirmar = () => {
    if (!prod) return;
    const g = +gramos || 100;
    const kcal = prod.kcal100 != null ? Math.round(prod.kcal100 * g / 100) : 0;
    const prot = prod.prot100 != null ? Math.round(prod.prot100 * g / 100 * 10) / 10 : 0;
    onResult({ nombre: `${prod.nombre} · ${g} g`, kcal, prot });
    close();
  };

  const overlay = { position: "fixed", inset: 0, zIndex: 9999, background: "rgba(20,16,10,.55)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 0 };
  const sheet = { width: "100%", maxWidth: 600, background: C.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, maxHeight: "92vh", overflowY: "auto", animation: "fade .25s ease both" };
  const head = (title) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}><ScanLine size={18} color={C.green} /><span style={{ fontFamily: "Fraunces, serif", fontSize: 19, fontWeight: 600 }}>{title}</span></div>
      <button onClick={close} style={{ background: C.bg2, border: "none", borderRadius: 10, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: C.ink2 }}><X size={18} /></button>
    </div>
  );

  return (
    <div style={overlay} onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div style={sheet}>
        {head("Escanear alimento")}

        {phase === "scan" && (
          <>
            <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", background: "#000", aspectRatio: "4 / 3" }}>
              <video ref={videoRef} playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                <div style={{ width: "78%", height: "38%", border: `3px solid ${C.amber}`, borderRadius: 12, boxShadow: "0 0 0 9999px rgba(0,0,0,.25)" }} />
              </div>
            </div>
            <p style={{ fontSize: 13, color: C.muted, textAlign: "center", margin: "12px 0 10px" }}>Encuadra el código de barras dentro del recuadro.</p>
            <button onClick={() => { stopCam(); setPhase("manual"); }} style={{ ...btnSecScan }}>Escribir el código a mano</button>
          </>
        )}

        {phase === "manual" && (
          <>
            {!supported && <p style={{ fontSize: 13, color: C.muted, marginTop: 0 }}>Este navegador no permite escanear con la cámara. Escribe el código de barras (EAN) del producto:</p>}
            {supported && <p style={{ fontSize: 13, color: C.muted, marginTop: 0 }}>Escribe el código de barras (EAN) del producto:</p>}
            <div style={{ display: "flex", gap: 8 }}>
              <input value={manualEan} onChange={(e) => setManualEan(e.target.value.replace(/\D/g, ""))} placeholder="p. ej. 8410076472058" inputMode="numeric" style={{ ...inp, flex: 1 }} />
              <button onClick={() => manualEan && lookup(manualEan)} style={{ background: C.green, color: "#fff", border: "none", borderRadius: 10, padding: "0 18px", fontWeight: 700, cursor: "pointer" }}>Buscar</button>
            </div>
            {supported && <button onClick={() => { setErr(""); setPhase("scan"); }} style={{ ...btnSecScan, marginTop: 10 }}>Volver a la cámara</button>}
          </>
        )}

        {phase === "product" && (
          <>
            {busy && <div style={{ textAlign: "center", color: C.muted, padding: "22px 0" }}>Buscando en Open Food Facts…</div>}
            {!busy && prod && (
              <div style={{ display: "grid", gap: 14 }}>
                <div style={{ ...card(), padding: 14 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{prod.nombre}</div>
                  <div style={{ fontSize: 12.5, color: C.muted }}>Código {ean} · por 100 g: {prod.kcal100 != null ? `${prod.kcal100} kcal` : "kcal n/d"} · {prod.prot100 != null ? `${prod.prot100} g prot` : "prot n/d"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: C.ink2, marginBottom: 6 }}>¿Cuántos gramos?</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input value={gramos} onChange={(e) => setGramos(e.target.value.replace(/[^\d.]/g, ""))} inputMode="numeric" style={{ ...inp, width: 120 }} />
                    <span style={{ color: C.muted, fontSize: 13 }}>g</span>
                  </div>
                  <div style={{ fontSize: 13, color: C.ink2, marginTop: 10 }}>
                    Se añadirá: <b>{prod.kcal100 != null ? Math.round(prod.kcal100 * (+gramos || 0) / 100) : 0} kcal</b> · <b>{prod.prot100 != null ? Math.round(prod.prot100 * (+gramos || 0) / 100 * 10) / 10 : 0} g prot</b>
                  </div>
                </div>
                <button onClick={confirmar} style={{ background: C.green, color: "#fff", border: "none", borderRadius: 12, padding: "13px 16px", fontWeight: 700, cursor: "pointer" }}>Añadir a la comida</button>
                {supported && <button onClick={() => { setProd(null); setErr(""); setPhase("scan"); }} style={btnSecScan}>Escanear otro</button>}
              </div>
            )}
            {!busy && err && (
              <div style={{ marginTop: prod ? 0 : 4 }}>
                <p style={{ fontSize: 13.5, color: C.red, fontWeight: 600 }}>{err}</p>
                <button onClick={() => { setProd(null); setErr(""); setManualEan(ean || manualEan); setPhase("manual"); }} style={btnSecScan}>Probar con otro código</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
const btnSecScan = { width: "100%", padding: 12, borderRadius: 12, border: `1.5px solid ${C.line}`, background: C.card, color: C.green, fontWeight: 700, cursor: "pointer" };

function MacroCard({ label, cur, obj, suffix, color, soft, invert }) {
  const pct = obj ? (cur / obj) * 100 : 0;
  const ok = invert ? cur <= obj && cur > 0 : cur >= obj;
  return (
    <div style={{ ...card(), padding: 14 }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: C.ink2, marginBottom: 4 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 8 }}>
        <span style={{ fontFamily: "Fraunces, serif", fontSize: 25, fontWeight: 700, color }}>{Math.round(cur)}</span>
        <span style={{ fontSize: 12.5, color: C.muted, fontWeight: 600 }}>/ {obj} {suffix}</span>
      </div>
      <Bar pct={Math.min(pct, 100)} color={ok && invert ? C.green : color} track={soft} />
    </div>
  );
}

/* ════════ PROGRESO ════════ */
function Progreso({ state, cfg, allDays }) {
  const pesoData = allDays.filter((x) => x.peso != null).map((x) => ({ k: x.k, fecha: fmtShort(x.k), peso: x.peso }));
  const ultimoPeso = pesoData.length ? pesoData[pesoData.length - 1].peso : cfg.pesoInicial;
  const perdido = (cfg.pesoInicial - ultimoPeso).toFixed(1);
  const restante = (ultimoPeso - cfg.objetivo).toFixed(1);
  const pctTotal = ((cfg.pesoInicial - ultimoPeso) / (cfg.pesoInicial - cfg.objetivo)) * 100;

  // resumen semanal
  const semanas = [];
  for (let w = 1; w <= cfg.semanasTotal; w++) {
    const dias = allDays.filter((x) => weekOf(x.k, cfg.fechaInicio) === w);
    if (!dias.length) { semanas.push({ w, vacio: true }); continue; }
    const pesos = dias.map((x) => x.peso).filter((p) => p != null);
    const pasos = dias.map((x) => x.pasos).filter((p) => p != null);
    semanas.push({
      w,
      peso: pesos.length ? (pesos.reduce((a, b) => a + b, 0) / pesos.length).toFixed(1) : "—",
      pasos: pasos.length ? Math.round(pasos.reduce((a, b) => a + b, 0) / pasos.length).toLocaleString("es-ES") : "—",
      kcalDias: dias.filter((x) => x.check?.kcal).length,
      entrenos: dias.filter((x) => x.entreno?.hecho).length,
    });
  }

  return (
    <>
      <div style={{ ...card(), padding: 20, marginBottom: 18, background: `linear-gradient(135deg, ${C.greenDeep}, ${C.green})`, border: "none", color: "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div style={{ fontSize: 12.5, opacity: .85, fontWeight: 600 }}>Peso actual</div>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 44, fontWeight: 600, lineHeight: 1 }}>{ultimoPeso}<span style={{ fontSize: 20 }}> kg</span></div>
          </div>
          <div style={{ textAlign: "right", fontSize: 13 }}>
            <div style={{ opacity: .85 }}>De 82 a 75 kg</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginTop: 2 }}>−{perdido} kg · faltan {restante}</div>
          </div>
        </div>
        <div style={{ marginTop: 14 }}><Bar pct={Math.max(pctTotal, 0)} color="#fff" track="rgba(255,255,255,.25)" h={9} /></div>
      </div>

      <Section title="Evolución del peso">
        {pesoData.length >= 2 ? (
          <div style={{ ...card(), padding: "16px 8px 8px" }}>
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={pesoData} margin={{ top: 6, right: 12, left: -16, bottom: 0 }}>
                <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.green} stopOpacity={.25} /><stop offset="100%" stopColor={C.green} stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke={C.line} vertical={false} />
                <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: C.muted }} stroke={C.line} />
                <YAxis domain={[cfg.objetivo - 1, cfg.pesoInicial + 1]} tick={{ fontSize: 11, fill: C.muted }} stroke={C.line} />
                <Tooltip contentStyle={{ borderRadius: 10, border: `1px solid ${C.line}`, fontSize: 13 }} formatter={(v) => [`${v} kg`, "Peso"]} />
                <ReferenceLine y={cfg.objetivo} stroke={C.amber} strokeDasharray="5 4" label={{ value: "75 kg", fill: C.amber, fontSize: 11, position: "insideBottomRight" }} />
                <Area type="monotone" dataKey="peso" stroke={C.green} strokeWidth={2.5} fill="url(#g)" dot={{ r: 3, fill: C.green }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{ ...card(), padding: 28, textAlign: "center", color: C.muted, fontSize: 14 }}>
            <Scale size={26} style={{ opacity: .4, marginBottom: 8 }} /><br />
            Registra tu peso al menos 2 días para ver la tendencia. Pésate al levantarte y guíate por la media semanal.
          </div>
        )}
      </Section>

      <Section title="Resumen por semanas" sub="Decide siempre con la media, no con un día suelto">
        <div style={{ ...card(), overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: C.bg, color: C.ink2 }}>
                {["Sem.", "Peso medio", "Pasos", "Días kcal", "Entrenos"].map((h) => <th key={h} style={th}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {semanas.map((s) => (
                <tr key={s.w} style={{ borderTop: `1px solid ${C.line}`, opacity: s.vacio ? .45 : 1 }}>
                  <td style={{ ...td, fontWeight: 700 }}>{s.w}</td>
                  <td style={td}>{s.vacio ? "—" : `${s.peso} kg`}</td>
                  <td style={td}>{s.vacio ? "—" : s.pasos}</td>
                  <td style={td}>{s.vacio ? "—" : `${s.kcalDias}/7`}</td>
                  <td style={td}>{s.vacio ? "—" : `${s.entrenos}/5`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <BienestarMini state={state} allDays={allDays} />
    </>
  );
}
const th = { padding: "10px 8px", textAlign: "left", fontWeight: 700, fontSize: 12 };
const td = { padding: "10px 8px", color: C.ink2 };

function BienestarMini({ allDays }) {
  const recientes = allDays.slice(-5).filter((x) => x.bienestar && (x.bienestar.energia || x.bienestar.animo));
  if (!recientes.length) return null;
  return (
    <Section title="Cómo te sientes" sub="Últimos registros">
      <div style={{ display: "grid", gap: 8 }}>
        {recientes.map((x) => (
          <div key={x.k} style={{ ...card(), padding: 12, display: "flex", justifyContent: "space-between", fontSize: 13 }}>
            <span style={{ fontWeight: 700, textTransform: "capitalize" }}>{fmtShort(x.k)}</span>
            <span style={{ color: C.ink2 }}>⚡{x.bienestar.energia || "–"} · 😴{x.bienestar.sueno || "–"} · 🙂{x.bienestar.animo || "–"}</span>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ════════ HITOS ════════ */
function Hitos({ hitoProgreso }) {
  const completados = HITOS.filter((h) => hitoProgreso[h.id]?.done).length;
  return (
    <>
      <div style={{ ...card({ background: C.greenSoft, border: "none" }), padding: 18, marginBottom: 18, textAlign: "center" }}>
        <Trophy size={26} color={C.gold} />
        <div style={{ fontFamily: "Fraunces, serif", fontSize: 26, fontWeight: 600, marginTop: 4 }}>{completados} / {HITOS.length}</div>
        <div style={{ fontSize: 13, color: C.ink2 }}>hitos conseguidos. Las pequeñas victorias suman.</div>
      </div>
      <div style={{ display: "grid", gap: 11 }}>
        {HITOS.map((h) => {
          const pr = hitoProgreso[h.id] || { pct: 0, done: false, cur: 0 };
          const Icon = h.icon;
          const fmtCur = h.tipo === "pasosDia" ? pr.cur.toLocaleString("es-ES") : (h.tipo === "peso" ? `${pr.cur} kg` : pr.cur);
          return (
            <div key={h.id} style={{ ...card(), padding: 15, border: pr.done ? `1.5px solid ${C.gold}` : `1px solid ${C.line}`, background: pr.done ? "#FCF7EA" : C.card }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, display: "grid", placeItems: "center", background: pr.done ? C.gold : C.bg2, color: pr.done ? "#fff" : C.muted }}>
                  <Icon size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong style={{ fontSize: 14.5 }}>{h.titulo}</strong>
                    {pr.done && <Check size={18} color={C.gold} strokeWidth={3} />}
                  </div>
                  <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>{h.desc}</div>
                  <Bar pct={pr.pct} color={pr.done ? C.gold : C.green} />
                  {!pr.done && h.tipo !== "peso" && <div style={{ fontSize: 11.5, color: C.muted, marginTop: 5 }}>{fmtCur} / {h.tipo === "pasosDia" ? h.meta.toLocaleString("es-ES") : h.meta}</div>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ════════ REVISIÓN SEMANAL ════════ */
function Revision({ state, cfg, semanaActual, setRevision }) {
  const [w, setW] = useState(semanaActual);
  const r = state.revisiones[w] || {};
  const p = progFor(w);
  const dias = Object.keys(state.dias).filter((k) => weekOf(k, cfg.fechaInicio) === w).map((k) => state.dias[k]);
  const entrenos = dias.filter((x) => x.entreno?.hecho).length;
  const set = (patch) => setRevision(w, patch);

  const preguntas = [
    { k: "metaFitness", label: "Meta de entrenamiento de la semana", ph: "Ej: cerrar las 5 sesiones de circuito" },
    { k: "metaNutri", label: "Meta de nutrición", ph: "Ej: 1900 kcal reales, pesando aceite y salsas" },
    { k: "habito", label: "Hábito clave a cuidar", ph: "Ej: 10.000 pasos todos los días" },
    { k: "recompensa", label: "Recompensa / hito", ph: "Ej: ropa nueva al bajar de 79 kg" },
  ];
  const reflexion = [
    { k: "bien", label: "¿Qué fue bien?" },
    { k: "dificil", label: "¿Qué fue difícil?" },
    { k: "ajustar", label: "¿Qué ajusto la próxima semana?" },
    { k: "orgulloso", label: "¿De qué estoy orgulloso?" },
    { k: "victoria", label: "¿Cuál es mi próxima pequeña victoria?" },
  ];

  return (
    <>
      <div style={{ display: "flex", gap: 7, overflowX: "auto", marginBottom: 16, paddingBottom: 2 }}>
        {Array.from({ length: cfg.semanasTotal }, (_, i) => i + 1).map((n) => (
          <Pill key={n} active={w === n} onClick={() => setW(n)}>Sem {n}</Pill>
        ))}
      </div>

      <div style={{ ...card({ background: C.blueSoft, border: "none" }), padding: 15, marginBottom: 18 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: C.blue, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>Plan de la semana {w}</div>
        <div style={{ fontSize: 13.5, color: C.ink2, lineHeight: 1.6 }}>
          Circuito 5 días · Flexiones {p.fl} · Abdominales {p.al} · Sentadillas {p.sl} · Remo {p.remo} · Plancha {p.plancha} · Cardio {p.cardio}.
          <div style={{ marginTop: 6, fontWeight: 700, color: C.ink }}>Entrenamientos completados: {entrenos} / 5</div>
        </div>
      </div>

      <Section title="Plan de la semana">
        <div style={{ display: "grid", gap: 12 }}>
          {preguntas.map((q) => (
            <div key={q.k}>
              <label style={lbl}>{q.label}</label>
              <input value={r[q.k] || ""} onChange={(e) => set({ [q.k]: e.target.value })} placeholder={q.ph} style={inp} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Revisión" sub="Mejorar cada semana, no solo registrar días">
        <div style={{ display: "grid", gap: 12 }}>
          {reflexion.map((q) => (
            <div key={q.k}>
              <label style={lbl}>{q.label}</label>
              <textarea value={r[q.k] || ""} onChange={(e) => set({ [q.k]: e.target.value })} style={ta} rows={2} />
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

/* ════════ AJUSTES ════════ */
function Ajustes({ cfg, setConfig, state, setState }) {
  const [confirmReset, setConfirmReset] = useState(false);
  const [exportData, setExportData] = useState("");
  const [importText, setImportText] = useState("");
  const [importMsg, setImportMsg] = useState(null);

  const descargar = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `mikelfit-${todayKey()}.json`; a.click();
    URL.revokeObjectURL(url);
  };
  const importar = () => {
    try {
      const obj = JSON.parse(importText);
      if (!obj.config || !obj.dias) throw new Error();
      setState({ ...defaultState(), ...obj });
      setImportMsg({ ok: true, txt: "Datos restaurados correctamente." });
      setImportText("");
    } catch (e) { setImportMsg({ ok: false, txt: "No se pudo leer la copia. Revisa que el texto esté completo." }); }
  };

  const campos = [
    { k: "pesoInicial", label: "Peso inicial (kg)", step: 0.5 },
    { k: "objetivo", label: "Objetivo (kg)", step: 0.5 },
    { k: "kcal", label: "Calorías objetivo", step: 50 },
    { k: "proteina", label: "Proteína objetivo (g)", step: 5 },
    { k: "aguaL", label: "Agua objetivo (L)", step: 0.5 },
    { k: "pasos", label: "Pasos objetivo", step: 500 },
    { k: "semanasTotal", label: "Semanas del plan", step: 1 },
  ];

  return (
    <>
      <Section title="Tu plan">
        <div style={{ display: "grid", gap: 11 }}>
          <div>
            <label style={lbl}>Fecha de inicio</label>
            <input type="date" value={cfg.fechaInicio} onChange={(e) => setConfig({ fechaInicio: e.target.value })} style={inp} />
          </div>
          {campos.map((c) => (
            <div key={c.k} style={{ ...card(), padding: 13, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{c.label}</span>
              <Stepper value={cfg[c.k]} onChange={(v) => setConfig({ [c.k]: v })} step={c.step} />
            </div>
          ))}
        </div>
        {cfg.kcal < 1500 && (
          <div style={{ ...card({ background: C.amberSoft, border: "none" }), padding: 13, marginTop: 11, fontSize: 13, color: C.ink2 }}>
            Bajar de 1500 kcal de forma sostenida no es recomendable sin la supervisión de un profesional sanitario. Tu plan parte de 1900 kcal por algo: prioriza pasos antes de recortar más.
          </div>
        )}
      </Section>

      <Section title="Copia de seguridad" sub="Tus datos viven solo en este móvil">
        <div style={{ display: "grid", gap: 9 }}>
          <button onClick={descargar} style={btnSec}>Descargar copia (.json)</button>
          <button onClick={() => setExportData(JSON.stringify(state))} style={btnSec}>Ver / copiar mis datos</button>
        </div>
        {exportData && (
          <textarea readOnly value={exportData} onClick={(e) => e.target.select()} style={{ ...ta, marginTop: 10, fontFamily: "monospace", fontSize: 11, height: 110 }} />
        )}
        <div style={{ marginTop: 14 }}>
          <label style={lbl}>Restaurar desde una copia</label>
          <textarea value={importText} onChange={(e) => setImportText(e.target.value)} placeholder="Pega aquí el contenido de un archivo de copia" style={{ ...ta, fontFamily: "monospace", fontSize: 11, height: 80 }} />
          <button onClick={importar} style={{ ...btnSec, marginTop: 8 }}>Restaurar datos</button>
          {importMsg && <div style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: importMsg.ok ? C.green : C.red }}>{importMsg.txt}</div>}
        </div>
      </Section>

      <Section title="Zona de reinicio">
        {!confirmReset ? (
          <button onClick={() => setConfirmReset(true)} style={{ ...btnSec, color: C.red, borderColor: "#EAC7BD" }}>Reiniciar todos los datos</button>
        ) : (
          <div style={{ ...card({ background: "#FBEDE9", border: "none" }), padding: 15 }}>
            <p style={{ margin: "0 0 12px", fontSize: 13.5, color: C.ink2 }}>Esto borra todos tus registros, hitos y revisiones. No se puede deshacer. ¿Seguro?</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { setState({ ...defaultState(), config: cfg }); setConfirmReset(false); }} style={{ flex: 1, background: C.red, color: "#fff", border: "none", borderRadius: 11, padding: 12, fontWeight: 700, cursor: "pointer" }}>Sí, reiniciar</button>
              <button onClick={() => setConfirmReset(false)} style={{ flex: 1, background: C.card, color: C.ink, border: `1px solid ${C.line}`, borderRadius: 11, padding: 12, fontWeight: 700, cursor: "pointer" }}>Cancelar</button>
            </div>
          </div>
        )}
      </Section>

      <div style={{ textAlign: "center", color: C.muted, fontSize: 11.5, padding: "8px 0 4px", lineHeight: 1.6 }}>
        MikelFit · seguimiento personal. No sustituye asesoramiento médico. Ante lesiones, enfermedad, medicación o síntomas raros, consulta con un profesional sanitario.
      </div>
    </>
  );
}
const btnSec = { width: "100%", padding: 13, borderRadius: 12, border: `1px solid ${C.line}`, background: C.card, color: C.ink, fontWeight: 700, fontSize: 14, cursor: "pointer" };
