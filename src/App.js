import React, { useEffect, useMemo, useState } from "react";

// =============================================
//  DETRAN-SP Counter App (Day & Week) – Plug & Play
//  Single-file React component. Uses localStorage for persistence.
//  Theme: DETRAN-SP inspired (azul/Amarelo), responsivo e acessível.
//  Feito para contabilizar "Demandas do dia" e "Acessos resetados" (dia/semana).
// =============================================

// ---- Utilidades de data em fuso de São Paulo ----
const TZ = "America/Sao_Paulo";

function todayInTZ() {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  // en-CA -> YYYY-MM-DD
  return fmt.format(now);
}

function formatDisplayDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString("pt-BR", { timeZone: TZ });
}

function getWeekStart(dateStr, weekStartsOn = 1) {
  // weekStartsOn: 0 = Domingo, 1 = Segunda
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  // Ajusta para o fuso na leitura do dia da semana
  const dow = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: TZ })
    .formatToParts(dt)
    .find((p) => p.type === "weekday")?.value;
  const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const dowNum = map[dow] ?? dt.getUTCDay();

  const diff = (dowNum - weekStartsOn + 7) % 7; // dias desde o início da semana
  const start = new Date(dt);
  start.setUTCDate(start.getUTCDate() - diff);
  const y2 = start.getUTCFullYear();
  const m2 = String(start.getUTCMonth() + 1).padStart(2, "0");
  const d2 = String(start.getUTCDate()).padStart(2, "0");
  return `${y2}-${m2}-${d2}`;
}

function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const y2 = dt.getUTCFullYear();
  const m2 = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const d2 = String(dt.getUTCDate()).padStart(2, "0");
  return `${y2}-${m2}-${d2}`;
}

// ---- Persistência ----
const LS_KEY = "detran_counter_v1";

const defaultState = {
  settings: {
    weekStartsOn: 1, // 1 = Segunda-feira (padrão BR)
  },
  history: {
    // YYYY-MM-DD: { demandas: number, acessos: number }
  },
};

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { ...defaultState };
    const data = JSON.parse(raw);
    return { ...defaultState, ...data };
  } catch (e) {
    console.error("Falha ao carregar estado:", e);
    return { ...defaultState };
  }
}

function saveState(state) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Falha ao salvar estado:", e);
  }
}

// ---- Exportação CSV ----
function toCSV(rows) {
  const header = ["data", "demandas", "acessos"].join(",");
  const body = rows
    .map((r) => [r.data, r.demandas, r.acessos].join(","))
    .join("\n");
  return header + "\n" + body;
}

function download(filename, text) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---- Componente de Card Básico ----
function Card({ title, children, className = "" }) {
  return (
    <div className={`rounded-2xl shadow-lg bg-white/95 backdrop-blur border border-blue-100 ${className}`}>
      <div className="px-5 pt-4 pb-1 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-blue-900">{title}</h3>
      </div>
      <div className="p-5 pt-2">{children}</div>
    </div>
  );
}

function Pill({ children }) {
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
      {children}
    </span>
  );
}

function IconPlus() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M12 5a1 1 0 0 1 1 1v5h5a1 1 0 1 1 0 2h-5v5a1 1 0 1 1-2 0v-5H6a1 1 0 1 1 0-2h5V6a1 1 0 0 1 1-1z" />
    </svg>
  );
}

function IconMinus() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M6 12a1 1 0 0 1 1-1h10a1 1 0 1 1 0 2H7a1 1 0 0 1-1-1z" />
    </svg>
  );
}

function Stepper({ onAdd = () => {}, onSub = () => {}, quick = [1, 5, 10] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {quick.map((q) => (
        <button
          key={q}
          onClick={() => onAdd(q)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-blue-200 bg-blue-50 text-blue-900 hover:bg-blue-100 active:scale-[.99] transition"
        >
          <IconPlus /> +{q}
        </button>
      ))}
      <button
        onClick={() => onSub(1)}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 active:scale-[.99] transition"
      >
        <IconMinus /> -1
      </button>
    </div>
  );
}

function Stat({ label, value, hint }) {
  return (
    <div className="flex flex-col">
      <span className="text-sm text-blue-900/70">{label}</span>
      <span className="text-3xl font-bold text-blue-950 leading-tight">{value}</span>
      {hint && <span className="text-xs text-slate-500">{hint}</span>}
    </div>
  );
}

function DetranCounterApp() {
  const [state, setState] = useState(defaultState);
  const [today, setToday] = useState(todayInTZ());

  // Garantir que o dia atual existe no histórico
  useEffect(() => {
    const s = loadState();
    const t = todayInTZ();
    if (!s.history[t]) s.history[t] = { demandas: 0, acessos: 0 };
    saveState(s);
    setState(s);
    setToday(t);
  }, []);

  // Monitorar mudança de dia (se app ficar aberto virando o dia)
  useEffect(() => {
    const timer = setInterval(() => {
      const t = todayInTZ();
      if (t !== today) {
        setToday(t);
        setState((prev) => {
          const next = { ...prev };
          if (!next.history[t]) next.history[t] = { demandas: 0, acessos: 0 };
          saveState(next);
          return next;
        });
      }
    }, 60 * 1000);
    return () => clearInterval(timer);
  }, [today]);

  const weekStart = useMemo(() => getWeekStart(today, state.settings.weekStartsOn), [today, state.settings.weekStartsOn]);

  // Monta linhas de semana atual
  const weekRows = useMemo(() => {
    const rows = [];
    for (let i = 0; i < 7; i++) {
      const d = addDays(weekStart, i);
      if (d > today) break;
      const rec = state.history[d] || { demandas: 0, acessos: 0 };
      rows.push({ data: d, ...rec });
    }
    return rows;
  }, [state.history, weekStart, today]);

  const todayRec = state.history[today] || { demandas: 0, acessos: 0 };
  const semanaDemandas = weekRows.reduce((sum, r) => sum + (r.demandas || 0), 0);
  const semanaAcessos = weekRows.reduce((sum, r) => sum + (r.acessos || 0), 0);

  function updateToday(key, delta) {
    setState((prev) => {
      const next = { ...prev, history: { ...prev.history } };
      const rec = { ...(next.history[today] || { demandas: 0, acessos: 0 }) };
      rec[key] = Math.max(0, (rec[key] || 0) + delta);
      next.history[today] = rec;
      saveState(next);
      return next;
    });
  }

  function resetToday() {
    setState((prev) => {
      const next = { ...prev, history: { ...prev.history } };
      next.history[today] = { demandas: 0, acessos: 0 };
      saveState(next);
      return next;
    });
  }

  function resetWeek() {
    setState((prev) => {
      const next = { ...prev, history: { ...prev.history } };
      for (let i = 0; i < 7; i++) {
        const d = addDays(weekStart, i);
        if (d > today) break;
        if (next.history[d]) next.history[d] = { demandas: 0, acessos: 0 };
      }
      saveState(next);
      return next;
    });
  }

  function exportCSVCurrentWeek() {
    const csv = toCSV(weekRows);
    const nome = `contador_detransp_semana_${weekStart}_a_${today}.csv`;
    download(nome, csv);
  }

  function exportCSVAll() {
    const allRows = Object.keys(state.history)
      .sort()
      .map((d) => ({ data: d, ...state.history[d] }));
    const csv = toCSV(allRows);
    const nome = `contador_detransp_todos_${today}.csv`;
    download(nome, csv);
  }

  function toggleWeekStart() {
    setState((prev) => {
      const next = { ...prev, settings: { ...prev.settings } };
      next.settings.weekStartsOn = next.settings.weekStartsOn === 1 ? 0 : 1;
      saveState(next);
      return next;
    });
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-blue-50 to-white text-slate-800">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-blue-900/95 backdrop-blur border-b border-blue-800 text-white">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-yellow-400 grid place-items-center text-blue-900 font-black">D</div>
            <div>
              <h1 className="text-xl font-bold leading-tight">Contador DETRAN‑SP</h1>
              <p className="text-xs text-blue-100/90">Demandas do dia, semana e acessos resetados</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleWeekStart}
              className="px-3 py-1.5 text-xs rounded-lg bg-blue-800 hover:bg-blue-700 border border-blue-700"
              title="Alternar início da semana (Segunda/Domingo)"
            >
              Semana começa: {state.settings.weekStartsOn === 1 ? "Seg" : "Dom"}
            </button>
            <button
              onClick={exportCSVCurrentWeek}
              className="px-3 py-1.5 text-xs rounded-lg bg-yellow-400 text-blue-900 font-semibold hover:brightness-95 border border-yellow-300"
            >
              Exportar Semana (CSV)
            </button>
            <button
              onClick={exportCSVAll}
              className="px-3 py-1.5 text-xs rounded-lg bg-white/10 hover:bg-white/20 border border-white/20"
            >
              Exportar Tudo (CSV)
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Pill>Hoje: {formatDisplayDate(today)}</Pill>
          <Pill>Semana atual: {formatDisplayDate(weekStart)} → {formatDisplayDate(today)}</Pill>
          <Pill>Fuso: São Paulo</Pill>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Card Demandas */}
          <Card title="Demandas">
            <div className="grid grid-cols-2 gap-6 items-end">
              <Stat label="Hoje" value={todayRec.demandas} hint="Demandas do dia" />
              <Stat label="Semana" value={semanaDemandas} hint="Total de seg/dom até hoje" />
            </div>
            <div className="mt-4">
              <Stepper
                onAdd={(q) => updateToday("demandas", q)}
                onSub={(q) => updateToday("demandas", -q)}
              />
            </div>
          </Card>

          {/* Card Acessos Resetados */}
          <Card title="Acessos resetados">
            <div className="grid grid-cols-2 gap-6 items-end">
              <Stat label="Hoje" value={todayRec.acessos} hint="Acessos resetados hoje" />
              <Stat label="Semana" value={semanaAcessos} hint="Total na semana até hoje" />
            </div>
            <div className="mt-4">
              <Stepper
                onAdd={(q) => updateToday("acessos", q)}
                onSub={(q) => updateToday("acessos", -q)}
              />
            </div>
          </Card>
        </div>

        {/* Histórico da semana */}
        <div className="mt-6">
          <Card title="Histórico da semana (dia a dia)">
            <div className="overflow-x-auto -mx-2">
              <table className="min-w-full text-sm mx-2">
                <thead>
                  <tr className="text-left text-blue-900">
                    <th className="py-2 pr-3">Data</th>
                    <th className="py-2 pr-3">Demandas</th>
                    <th className="py-2 pr-3">Acessos resetados</th>
                  </tr>
                </thead>
                <tbody>
                  {weekRows.map((r) => (
                    <tr key={r.data} className="border-t border-slate-100">
                      <td className="py-2 pr-3 text-slate-700">{formatDisplayDate(r.data)}</td>
                      <td className="py-2 pr-3 font-semibold text-blue-950">{r.demandas}</td>
                      <td className="py-2 pr-3 font-semibold text-blue-950">{r.acessos}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button onClick={resetToday} className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50">Zerar Hoje</button>
              <button onClick={resetWeek} className="px-3 py-2 rounded-xl bg-red-50 text-red-700 border border-red-200 hover:bg-red-100">Zerar Semana (até hoje)</button>
            </div>
          </Card>
        </div>

        {/* Dicas */}
        <div className="mt-6 text-xs text-slate-500">
          <p>
            Dica: os dados ficam salvos no seu navegador (localStorage). Se você abrir em outro computador, os números não acompanham. Use "Exportar" para salvar CSV.
          </p>
        </div>
      </main>

      <footer className="max-w-5xl mx-auto px-4 pb-8">
        <div className="mt-6 text-[11px] text-slate-500">
          <p>
            * App não-oficial. Identidade visual inspirada no DETRAN‑SP para uso pessoal. Você pode adaptar nomes de campos conforme sua rotina (p.ex. "Demandas" = tickets/atendimentos concluídos).
          </p>
        </div>
      </footer>
    </div>
  );
}

export default DetranCounterApp;