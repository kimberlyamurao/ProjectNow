import { useState, useEffect, useCallback } from "react";
import { supabase } from "./lib/supabase";
import {
  AlertTriangle, Users, Clock, FileText, Search, Handshake,
  CheckCircle, ChevronRight, BarChart3, PieChart, Bell,
  ArrowUpRight, Filter, Download, RefreshCw, Shield,
  Target, Activity, Euro, UserCheck, Gavel, Mail,
  Wifi, WifiOff, Calendar, TrendingUp, Phone, FileWarning,
  Cog, Leaf
} from "lucide-react";
import {
  Tooltip, ResponsiveContainer, Cell, PieChart as RePieChart, Pie
} from "recharts";

// ─── 8-WEEK PLAN (date-based, auto-detects current week) ─────────────────────
// end dates use 23:59:59 so the full last day is included
function eod(dateStr) {
  const d = new Date(dateStr);
  d.setHours(23, 59, 59, 999);
  return d;
}

const EIGHT_WEEK_PLAN = [
  { week: 1, label: "Log",                  dates: "May 25 – 29",    icon: FileText,     start: new Date("2026-05-25"), end: eod("2026-05-29") },
  { week: 2, label: "Reach Out",            dates: "Jun 1 – 5",      icon: Mail,         start: new Date("2026-06-01"), end: eod("2026-06-05") },
  { week: 3, label: "Escalation",           dates: "Jun 8 – 12",     icon: TrendingUp,   start: new Date("2026-06-08"), end: eod("2026-06-12") },
  { week: 4, label: "Call Major Items",     dates: "Jun 15 – 19",    icon: Phone,        start: new Date("2026-06-15"), end: eod("2026-06-19") },
  { week: 5, label: "Structural Process",   dates: "Jun 22 – 26",    icon: Cog,          start: new Date("2026-06-22"), end: eod("2026-06-26") },
  { week: 6, label: "Final Demand Letter",  dates: "Jun 29 – Jul 3", icon: FileWarning,  start: new Date("2026-06-29"), end: eod("2026-07-03") },
  { week: 7, label: "Optimization",         dates: "Jul 6 – 10",     icon: Search,       start: new Date("2026-07-06"), end: eod("2026-07-10") },
  { week: 8, label: "Sustainability",       dates: "Jul 13 – 17",    icon: Leaf,         start: new Date("2026-07-13"), end: eod("2026-07-17") },
];

function getCurrentWeek() {
  const today = new Date();
  for (const w of EIGHT_WEEK_PLAN) {
    if (today >= w.start && today <= w.end) return w.week;
  }
  if (today < EIGHT_WEEK_PLAN[0].start) return 0;
  if (today > EIGHT_WEEK_PLAN[7].end)   return 9;
  for (const w of EIGHT_WEEK_PLAN) {
    if (today < w.start) return w.week;
  }
  return 8;
}

// ─── TRANSFORM: Supabase rows → dashboard metrics ────────────────────────────
function transformDebtors(rows) {
  if (!rows || rows.length === 0) return null;

  const positive = rows.filter(r => (r.balance || 0) > 0);
  const totalOutstanding = positive.reduce((s, r) => s + r.balance, 0);

  const weightedDays = positive.reduce((s, r) => s + (r.oldest_inv_days || 0) * r.balance, 0);
  const dso = totalOutstanding > 0 ? Math.round(weightedDays / totalOutstanding) : 0;

  const escalations = rows.filter(r =>
    (r.action || "").toLowerCase().includes("deurwaarder")
  ).length;

  const hasRealBuckets = rows.some(r =>
    (r.bucket_0_30 || 0) + (r.bucket_31_60 || 0) + (r.bucket_61_90 || 0) + (r.bucket_90_plus || 0) !== 0
  );
  let b030 = 0, b3160 = 0, b6190 = 0, b90p = 0;
  if (hasRealBuckets) {
    rows.forEach(r => {
      b030  += r.bucket_0_30    || 0;
      b3160 += r.bucket_31_60   || 0;
      b6190 += r.bucket_61_90   || 0;
      b90p  += r.bucket_90_plus || 0;
    });
  } else {
    positive.forEach(r => {
      const d = r.oldest_inv_days || 0;
      if      (d <= 30) b030  += r.balance;
      else if (d <= 60) b3160 += r.balance;
      else if (d <= 90) b6190 += r.balance;
      else              b90p  += r.balance;
    });
  }
  const bTotal = (b030 + b3160 + b6190 + b90p) || 1;
  const agingBuckets = [
    { label: "0–30 Days",  pct: +((b030  / bTotal) * 100).toFixed(1), amount: b030,  color: "#22c55e" },
    { label: "31–60 Days", pct: +((b3160 / bTotal) * 100).toFixed(1), amount: b3160, color: "#3b82f6" },
    { label: "61–90 Days", pct: +((b6190 / bTotal) * 100).toFixed(1), amount: b6190, color: "#f59e0b" },
    { label: "90+ Days",   pct: +((b90p  / bTotal) * 100).toFixed(1), amount: b90p,  color: "#ef4444" },
  ];

  let cntDeurwaarder = 0, cntEmail = 0, cntPayment = 0, cntOther = 0;
  rows.forEach(r => {
    const a = (r.action || "").toLowerCase();
    if      (a.includes("deurwaarder"))                           cntDeurwaarder++;
    else if (a.includes("email"))                                 cntEmail++;
    else if (a.includes("payment") || a.includes("agreement"))   cntPayment++;
    else                                                          cntOther++;
  });
  const aTotal = rows.length || 1;
  const disputes = [
    { name: "Deurwaarder",       value: Math.round((cntDeurwaarder / aTotal) * 100), color: "#ef4444" },
    { name: "Email Follow-up",   value: Math.round((cntEmail       / aTotal) * 100), color: "#3b82f6" },
    { name: "Payment Agreement", value: Math.round((cntPayment     / aTotal) * 100), color: "#8b5cf6" },
    { name: "Follow-up / Other", value: Math.round((cntOther       / aTotal) * 100), color: "#f59e0b" },
  ];

  const ownerMap = {};
  positive.forEach(r => {
    const raw = r.owner || "";
    if (!raw || raw === "Unassigned" || raw === "for checking") return;
    const parts = raw.split(" ");
    const short = parts[0] + (parts[1] ? " " + parts[1][0] + "." : "");
    ownerMap[short] = (ownerMap[short] || 0) + r.balance;
  });
  const ownerWorkload = Object.entries(ownerMap)
    .map(([name, amount]) => ({ name, amount: Math.round(amount) }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6);

  const top20 = [...rows]
    .filter(r => (r.balance || 0) > 0)
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 20)
    .map(r => ({
      id:      String(r.id),
      name:    r.name || "Unknown",
      balance: r.balance,
      days:    r.oldest_inv_days || 0,
      owner:   r.owner || "—",
      action:  r.action || "—",
    }));

  return { dso, totalOutstanding, escalations, agingBuckets, disputes, ownerWorkload, customers: top20, allRows: rows };
}

// ─── EXPORT TO CSV ────────────────────────────────────────────────────────────
function exportToExcel(rows) {
  if (!rows || rows.length === 0) return;
  const headers = ["ID", "Name", "Balance (€)", "Oldest Invoice Days", "Owner", "Action"];
  const csvRows = [
    headers.join(","),
    ...rows.map(r => [
      r.id,
      `"${(r.name || "").replace(/"/g, '""')}"`,
      r.balance?.toFixed(2) ?? "0.00",
      r.oldest_inv_days ?? 0,
      `"${(r.owner || "").replace(/"/g, '""')}"`,
      `"${(r.action || "").replace(/"/g, '""')}"`,
    ].join(","))
  ];
  const csvContent = csvRows.join("\n");
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href     = url;
  link.download = `debtors_export_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─── UTILS ───────────────────────────────────────────────────────────────────
function fmt(n) {
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `€${(n / 1_000).toFixed(0)}k`;
  return `€${Math.round(n)}`;
}
function fmtFull(n) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

function useCountUp(target, duration = 1200) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!target) return;
    let v = 0;
    const step = target / (duration / 16);
    const t = setInterval(() => {
      v += step;
      if (v >= target) { setCount(target); clearInterval(t); }
      else setCount(Math.floor(v));
    }, 16);
    return () => clearInterval(t);
  }, [target, duration]);
  return count;
}

// ─── SCREENS ─────────────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50/40 to-slate-100 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-xl">
          <Shield size={28} className="text-white" />
        </div>
        <div className="flex items-center gap-3">
          <RefreshCw size={16} className="text-blue-600 animate-spin" />
          <span className="text-sm font-semibold text-slate-600">Loading debtor data from Supabase…</span>
        </div>
        <div className="flex gap-1.5 mt-1">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ErrorScreen({ message, onRetry }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50/40 to-slate-100 flex items-center justify-center">
      <div className="bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl shadow-xl p-8 max-w-sm w-full mx-4 text-center">
        <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={24} className="text-red-500" />
        </div>
        <h2 className="text-lg font-black text-slate-800 mb-2">Failed to load data</h2>
        <p className="text-xs text-slate-500 mb-6 break-words">{message}</p>
        <button onClick={onRetry}
          className="flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-blue-700 transition-all mx-auto">
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    </div>
  );
}

// ─── GLASS CARD ───────────────────────────────────────────────────────────────
function GlassCard({ children, className = "", hover = true }) {
  return (
    <div className={`bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl
      shadow-[0_4px_24px_rgba(30,64,175,0.08)]
      ${hover ? "hover:shadow-[0_8px_32px_rgba(30,64,175,0.15)] hover:-translate-y-0.5 transition-all duration-300" : ""}
      ${className}`}>
      {children}
    </div>
  );
}

function SectionTitle({ children, icon: Icon }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      {Icon && <Icon size={16} className="text-blue-600" />}
      <h2 className="text-sm font-bold text-slate-700 uppercase tracking-widest">{children}</h2>
    </div>
  );
}

// ─── DSO GAUGE (redesigned — blue palette, zero text overlap) ────────────────
function DSOGauge({ value, target }) {
  const countVal = useCountUp(value);

  const cx = 120, cy = 112, R = 84, strokeW = 13;
  const startAngle = -210;
  const totalSweep = 240;
  const pct = Math.min(value / 120, 1);

  function polarToXY(angleDeg) {
    const rad = (angleDeg - 90) * Math.PI / 180;
    return { x: cx + R * Math.cos(rad), y: cy + R * Math.sin(rad) };
  }

  function arcD(a1, a2) {
    const s = polarToXY(a1);
    const e = polarToXY(a2);
    const large = (a2 - a1) > 180 ? 1 : 0;
    return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
  }

  const fillEndAngle = startAngle + totalSweep * pct;
  const dotPos = polarToXY(fillEndAngle);
  const color = value <= 30 ? "#22c55e" : value <= 90 ? "#f59e0b" : "#ef4444";

  // SVG viewBox is exactly tall enough for the arc — no extra space for text
  // All text lives OUTSIDE the SVG as normal HTML elements (no overlap possible)
  return (
    <div className="flex flex-col items-center gap-2 w-full">

      {/* Arc-only SVG — viewBox height stops just below arc bottom ~cy+R*sin60 */}
      <div className="relative w-56">
        <svg viewBox="0 0 240 148" className="w-full">
          <defs>
            <linearGradient id="dsoGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="#1565C0" />
              <stop offset="35%"  stopColor="#1976D2" />
              <stop offset="70%"  stopColor="#42A5F5" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
          </defs>

          {/* Track */}
          <path d={arcD(startAngle, startAngle + totalSweep)}
            fill="none" stroke="rgba(55,138,221,0.15)"
            strokeWidth={strokeW} strokeLinecap="round" />

          {/* Filled arc */}
          {pct > 0 && (
            <path d={arcD(startAngle, fillEndAngle)}
              fill="none" stroke="url(#dsoGrad)"
              strokeWidth={strokeW} strokeLinecap="round" />
          )}

          {/* Dot indicator on arc */}
          <circle cx={dotPos.x} cy={dotPos.y} r={9}  fill="#0D47A1" />
          <circle cx={dotPos.x} cy={dotPos.y} r={4.5} fill="#fff" />

          {/* Big value number — centred, sits in the open space inside arc */}
          <text x={cx} y={cy - 6}
            textAnchor="middle" fontSize="44" fontWeight="800" fill={color}>
            {countVal}
          </text>

          {/* "DAYS AVG" — directly below number, still inside arc ring gap */}
          <text x={cx} y={cy + 20}
            textAnchor="middle" fontSize="9" fontWeight="600"
            fill="rgba(55,138,221,0.65)" letterSpacing="2">
            DAYS AVG
          </text>
        </svg>
      </div>

      {/* Description — pure HTML div, rendered below SVG, can never overlap */}
      <p className="text-xs text-slate-500 text-center leading-snug">
        Weighted avg days overdue<br />by outstanding balance
      </p>

      {/* Alert badge */}
      <span className="text-xs px-3 py-1 rounded-full font-semibold border flex items-center gap-1.5"
        style={{ background: "linear-gradient(135deg,#FFEBEE,#FFCDD2)", borderColor: "#EF9A9A", color: "#C62828" }}>
        <AlertTriangle size={11} />
        Target: {target}d · Current: {value}d
      </span>

      {/* Mini stat cards */}
      <div className="grid grid-cols-2 gap-2 w-full">
        <div className="flex flex-col items-center py-2 rounded-xl border"
          style={{ background: "linear-gradient(135deg,#E3F2FD,#BBDEFB)", borderColor: "#90CAF9" }}>
          <Target size={13} className="text-blue-700 mb-0.5" />
          <span className="text-[10px] text-blue-600 font-medium">Target</span>
          <span className="text-sm font-black text-blue-800">{target}d</span>
        </div>
        <div className="flex flex-col items-center py-2 rounded-xl border"
          style={{ background: "linear-gradient(135deg,#FFEBEE,#FFCDD2)", borderColor: "#FFCDD2" }}>
          <Clock size={13} className="text-red-600 mb-0.5" />
          <span className="text-[10px] text-red-500 font-medium">Current</span>
          <span className="text-sm font-black text-red-700">{value}d</span>
        </div>
      </div>
    </div>
  );
}

// ─── ESCALATION BOARD ─────────────────────────────────────────────────────────
function EscalationBoard({ value }) {
  const count = useCountUp(value, 800);
  const tens = Math.floor(count / 10);
  const ones = count % 10;
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex gap-2">
        {[tens, ones].map((d, i) => (
          <div key={i} className="w-14 h-16 bg-gradient-to-b from-slate-800 to-slate-900
            rounded-xl flex items-center justify-center
            shadow-[0_4px_16px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]
            border-b-4 border-slate-950 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent" />
            <span className="text-3xl font-black text-white font-mono relative z-10">{d}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
        <AlertTriangle size={12} className="text-red-500" />
        <span className="text-xs text-red-600 font-semibold">Active Deurwaarder Cases</span>
      </div>
      <p className="text-xs text-slate-500 text-center leading-tight">
        Accounts referred to legal<br />collection (Deurwaarder)
      </p>
    </div>
  );
}

// ─── 8-WEEK PLAN TIMELINE (redesigned — blue gradient) ────────────────────────
function EightWeekPlan() {
  const currentWeek = getCurrentWeek();
  const today = new Date();

  return (
    <div className="space-y-3">
      <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
        {EIGHT_WEEK_PLAN.map((w) => {
          const Icon = w.icon;
          const isDone     = currentWeek > w.week;
          const isCurrent  = currentWeek === w.week;

          let progress = 0;
          if (isCurrent) {
            const total   = w.end - w.start;
            const elapsed = today - w.start;
            progress = Math.min(Math.max((elapsed / total) * 100, 5), 100);
          } else if (isDone) {
            progress = 100;
          }

          // ── Styles driven by state ──
          const rowStyle = isCurrent
            ? {
                background: "linear-gradient(135deg, #1565C0 0%, #1976D2 40%, #42A5F5 100%)",
                borderColor: "#1565C0",
                boxShadow: "0 4px 16px rgba(21,101,192,0.35)",
              }
            : isDone
            ? {
                background: "linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%)",
                borderColor: "#90CAF9",
              }
            : {
                background: "rgba(0,0,0,0.02)",
                borderColor: "rgba(0,0,0,0.07)",
              };

          const badgeStyle = isCurrent
            ? { background: "rgba(255,255,255,0.2)", color: "#fff" }
            : isDone
            ? { background: "#1976D2", color: "#fff" }
            : { background: "rgba(0,0,0,0.06)", color: "#94a3b8" };

          const labelColor  = isCurrent ? "#fff"              : isDone ? "#0D47A1" : "#94a3b8";
          const dateColor   = isCurrent ? "rgba(255,255,255,0.7)" : "#94a3b8";
          const iconColor   = isCurrent ? "rgba(255,255,255,0.8)" : isDone ? "#1565C0" : "#94a3b8";

          return (
            <div
              key={w.week}
              className="flex items-center gap-3 p-2.5 rounded-xl border transition-all duration-200"
              style={rowStyle}
            >
              {/* Week badge */}
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black flex-shrink-0"
                style={badgeStyle}
              >
                {isDone ? <CheckCircle size={12} /> : `W${w.week}`}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Icon size={11} style={{ color: iconColor }} />
                  <span className="text-xs font-bold truncate" style={{ color: labelColor }}>
                    {w.label}
                  </span>
                  {isCurrent && (
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0"
                      style={{ background: "rgba(255,255,255,0.25)", color: "#fff" }}
                    >
                      NOW
                    </span>
                  )}
                </div>

                <div className="text-[10px] mt-0.5 flex items-center gap-1" style={{ color: dateColor }}>
                  <Calendar size={8} />
                  {w.dates}
                </div>

                {/* Progress bar — current week only */}
                {isCurrent && (
                  <div
                    className="mt-1.5 h-1 rounded-full overflow-hidden"
                    style={{ background: "rgba(255,255,255,0.2)" }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${progress}%`, background: "#fff" }}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Status footer */}
      {currentWeek === 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold bg-slate-50 border-slate-200 text-slate-500">
          <Calendar size={12} /> Plan starts May 25, 2026
        </div>
      )}
      {currentWeek === 9 && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold"
          style={{ background: "linear-gradient(135deg,#E3F2FD,#BBDEFB)", borderColor: "#90CAF9", color: "#0D47A1" }}
        >
          <CheckCircle size={12} /> ✓ All 8 weeks completed
        </div>
      )}
      {currentWeek >= 1 && currentWeek <= 8 && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold"
          style={{
            background: "linear-gradient(135deg, #1565C0, #1976D2)",
            borderColor: "#1565C0",
            color: "#fff",
          }}
        >
          <Calendar size={12} />
          Week {currentWeek} of 8 · {EIGHT_WEEK_PLAN[currentWeek - 1]?.label}
        </div>
      )}
    </div>
  );
}

// ─── AGING BUCKETS ────────────────────────────────────────────────────────────
function AgingBuckets({ data }) {
  const [hovered, setHovered] = (null);
  const critical = data.find(b => b.label.includes("90+"));
  return (
    <div className="space-y-3">
      <div className="flex rounded-xl overflow-hidden h-10 shadow-inner">
        {data.map((b, i) => (
          <div key={i} style={{ width: `${Math.max(b.pct, 0.5)}%`, background: b.color }}
            className="flex items-center justify-center text-white text-xs font-bold transition-all duration-300 hover:brightness-110 cursor-pointer relative"
            onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
            {b.pct >= 4 ? `${b.pct}%` : ""}
            {hovered === i && (
              <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] rounded-lg px-2 py-1 whitespace-nowrap z-10 pointer-events-none">
                {fmtFull(b.amount)}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="flex">
        {data.map((b, i) => (
          <div key={i} style={{ width: `${Math.max(b.pct, 0.5)}%` }}
            className="text-center text-[9px] font-semibold text-slate-500 leading-tight px-0.5 truncate">
            {b.pct >= 4 ? b.label : ""}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-2">
        {data.map((b, i) => (
          <div key={i} className="rounded-xl p-2.5 border border-slate-100 bg-white/60 hover:shadow-md transition-all cursor-pointer"
            style={{ borderLeftColor: b.color, borderLeftWidth: 3 }}>
            <div className="text-[10px] text-slate-500 font-semibold">{b.label}</div>
            <div className="text-sm font-black mt-0.5" style={{ color: b.color }}>{fmt(b.amount)}</div>
            <div className="text-[10px] text-slate-400">{b.pct}% of total</div>
          </div>
        ))}
      </div>
      {critical && (
        <div className="flex items-center justify-between text-xs bg-red-50 border border-red-100 rounded-xl px-3 py-2">
          <span className="flex items-center gap-1.5">
            <AlertTriangle size={12} className="text-red-500" />
            <strong className="text-red-700">{critical.pct}% of balance is 90+ days overdue</strong>
          </span>
          <span className="font-bold text-red-600">{fmt(critical.amount)} critical</span>
        </div>
      )}
    </div>
  );
}

// ─── CUSTOMER ROW ─────────────────────────────────────────────────────────────
function CustomerRow({ customer, index }) {
  const isHighRisk    = customer.days > 500 || customer.balance > 100000;
  const isDeurwaarder = (customer.action || "").toLowerCase().includes("deurwaarder");
  const isEmail       = (customer.action || "").toLowerCase().includes("email");
  const isPayment     = (customer.action || "").toLowerCase().includes("payment") ||
                        (customer.action || "").toLowerCase().includes("agreement");
  const actionColor   = isDeurwaarder ? "bg-red-100 text-red-700" :
                        isEmail       ? "bg-blue-100 text-blue-700" :
                        isPayment     ? "bg-purple-100 text-purple-700" :
                                        "bg-slate-100 text-slate-600";
  const actionIcon    = isDeurwaarder ? <Gavel size={9} /> :
                        isEmail       ? <Mail size={9} /> :
                        isPayment     ? <Handshake size={9} /> :
                                        <CheckCircle size={9} />;
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-xl border border-transparent
      hover:bg-blue-50/60 hover:border-blue-100 transition-all duration-200 cursor-pointer group">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-black shadow flex-shrink-0
        ${isHighRisk ? "bg-gradient-to-br from-red-500 to-red-700" : "bg-gradient-to-br from-blue-500 to-blue-700"}`}>
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700 truncate max-w-[130px]">{customer.name}</span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0
            ${customer.balance >= 100000 ? "bg-red-100 text-red-700" :
              customer.balance >= 20000  ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"}`}>
            {fmt(customer.balance)}
          </span>
        </div>
        <div className="flex gap-2 mt-0.5 flex-wrap">
          <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
            <Clock size={9} />{customer.days}d overdue
          </span>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded flex items-center gap-0.5 ${actionColor}`}>
            {actionIcon}{customer.action?.slice(0, 22)}
          </span>
        </div>
      </div>
      <div className="text-[10px] text-slate-400 flex-shrink-0 max-w-[55px] truncate text-right">
        {customer.owner?.split(" ")[0]}
      </div>
      <ChevronRight size={14} className="text-slate-300 group-hover:text-blue-400 transition-colors flex-shrink-0" />
    </div>
  );
}

// ─── DISPUTE DONUT ────────────────────────────────────────────────────────────
function DisputeDonut({ data }) {
  const R = Math.PI / 180;
  const label = ({ cx, cy, midAngle, innerRadius, outerRadius, value }) => {
    if (value < 5) return null;
    const r = innerRadius + (outerRadius - innerRadius) * 0.5;
    return (
      <text x={cx + r * Math.cos(-midAngle * R)} y={cy + r * Math.sin(-midAngle * R)}
        fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="700">
        {value}%
      </text>
    );
  };
  return (
    <div className="flex items-center gap-4">
      <div className="w-36 h-36 flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <RePieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={32} outerRadius={65}
              dataKey="value" labelLine={false} label={label}>
              {data.map((e, i) => <Cell key={i} fill={e.color} />)}
            </Pie>
            <Tooltip contentStyle={{ background: "#1e293b", border: "none", borderRadius: 8, color: "#f8fafc", fontSize: 11 }} />
          </RePieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-col gap-2 flex-1">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: d.color }} />
            <span className="text-xs text-slate-600 flex-1">{d.name}</span>
            <span className="text-xs font-bold text-slate-700">{d.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── OWNER WORKLOAD ───────────────────────────────────────────────────────────
function OwnerWorkloadChart({ data }) {
  const max = Math.max(...data.map(d => d.amount), 1);
  return (
    <div className="space-y-2">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-[11px] text-slate-600 font-semibold w-20 flex-shrink-0 truncate">{d.name}</span>
          <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700 flex items-center justify-end pr-2"
              style={{ width: `${(d.amount / max) * 100}%`, background: "linear-gradient(90deg,#3b82f6,#1d4ed8)" }}>
              <span className="text-[9px] text-white font-bold">{fmt(d.amount)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
export default function DebtorDashboard() {
  const [data,        setData]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing,  setRefreshing]  = useState(false);
  const [exporting,   setExporting]   = useState(false);
  const [isLive,      setIsLive]      = useState(false);
  const [recoveryStats, setRecoveryStats] = useState(null);

  const fetchDebtors = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const { data: rows, error: err } = await supabase
        .from("debtors")
        .select("id, name, balance, oldest_inv_days, owner, action, bucket_0_30, bucket_31_60, bucket_61_90, bucket_90_plus")
        .order("balance", { ascending: false });
      const PROJECT_NOW_START = "2026-05-25";

const { data: paidRows, error: paidErr } = await supabase
  .from("paid_invoices")
  .select("amount, paid_date")
  .gte("paid_date", PROJECT_NOW_START);

if (paidErr) throw paidErr;

if (paidRows && paidRows.length > 0) {
  const totalRecovered = paidRows.reduce(
    (sum, r) => sum + Number(r.amount || 0),
    0
  );

  const invoicesPaid = paidRows.length;

  const avgValue = totalRecovered / invoicesPaid;

  const largest = Math.max(
    ...paidRows.map(r => Number(r.amount || 0))
  );

  const lastPayment = paidRows
    .map(r => r.paid_date)
    .sort()
    .at(-1);

  setRecoveryStats({
    totalRecovered,
    invoicesPaid,
    avgValue,
    largest,
    lastPayment
  });
}

      if (err) throw err;
      setData(transformDebtors(rows));
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Supabase error:", err);
      setError(err.message || "Could not connect to Supabase.");
    } finally {
      setLoading(false);
      if (showSpinner) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDebtors();
    const channel = supabase
      .channel("debtors-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "debtors" }, () => {
        fetchDebtors();
      })
      .subscribe(status => setIsLive(status === "SUBSCRIBED"));
    return () => { supabase.removeChannel(channel); setIsLive(false); };
  }, [fetchDebtors]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const { data: rows, error: err } = await supabase
        .from("debtors")
        .select("id, name, balance, oldest_inv_days, owner, action, bucket_0_30, bucket_31_60, bucket_61_90, bucket_90_plus")
        .order("balance", { ascending: false });
      if (err) throw err;
      exportToExcel(rows);
    } catch (err) {
      alert("Export failed: " + (err.message || "Unknown error"));
    } finally {
      setExporting(false);
    }
  }, []);

  if (loading) return <LoadingScreen />;
  if (error)   return <ErrorScreen message={error} onRetry={() => { setLoading(true); fetchDebtors(); }} />;
  if (!data)   return <ErrorScreen message="No data returned from Supabase." onRetry={() => { setLoading(true); fetchDebtors(); }} />;

  const topOwner = data.ownerWorkload[0];
  const currentWeek = getCurrentWeek();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50/40 to-slate-100 font-sans p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-40 w-80 h-80 bg-indigo-200/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 left-1/3 w-72 h-72 bg-cyan-200/20 rounded-full blur-3xl" />
      </div>

      <div className="max-w-screen-xl mx-auto">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center shadow-md">
                <Shield size={16} className="text-white" />
              </div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">Debtor Recovery Performance</h1>
              <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                8-Week Plan
              </span>
            </div>
            <div className="flex items-center gap-3 ml-10 flex-wrap">
              <p className="text-xs text-slate-400">
                Last updated: {lastUpdated?.toLocaleTimeString()} · Supabase "debtors"
              </p>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 border
                ${isLive ? "bg-green-50 text-green-700 border-green-200" : "bg-orange-50 text-orange-600 border-orange-200"}`}>
                {isLive ? <><Wifi size={10} /> Realtime Live</> : <><WifiOff size={10} /> Connecting…</>}
              </span>
              <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Euro size={10} />{fmtFull(data.totalOutstanding)} outstanding
              </span>
              {currentWeek >= 1 && currentWeek <= 8 && (
                <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Calendar size={10} /> Week {currentWeek}: {EIGHT_WEEK_PLAN[currentWeek - 1]?.label}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => fetchDebtors(true)}
              className="flex items-center gap-1.5 text-xs bg-white border border-slate-200 text-slate-600 px-3 py-2 rounded-xl hover:bg-slate-50 transition-all shadow-sm">
              <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} /> Refresh
            </button>
            <button className="flex items-center gap-1.5 text-xs bg-white border border-slate-200 text-slate-600 px-3 py-2 rounded-xl hover:bg-slate-50 transition-all shadow-sm">
              <Filter size={12} /> Filter
            </button>
            <button onClick={handleExport} disabled={exporting}
              className="flex items-center gap-1.5 text-xs bg-blue-600 text-white px-3 py-2 rounded-xl hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-md">
              {exporting
                ? <><RefreshCw size={12} className="animate-spin" /> Exporting…</>
                : <><Download size={12} /> Export CSV</>}
            </button>
          </div>
        </div>

        {/* ── KPIs ── */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Activity size={14} className="text-blue-600" />
            <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Executive KPIs — High-Level Metrics</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <GlassCard className="p-4 flex flex-col items-center">
              <SectionTitle icon={Target}>Days Sales Outstanding</SectionTitle>
              <DSOGauge value={data.dso} target={30} />
            </GlassCard>
            <GlassCard className="p-4 flex flex-col items-center justify-center">
              <SectionTitle icon={Bell}>Deurwaarder Escalations</SectionTitle>
              <EscalationBoard value={data.escalations} />
            </GlassCard>
          </div>
        </div>

                {recoveryStats && (
  <div className="grid grid-cols-5 gap-4 mb-4">
    <GlassCard className="p-4">
      <div className="text-xs text-slate-500">Recovered</div>
      <div className="text-xl font-bold">
        €{recoveryStats.totalRecovered.toLocaleString("nl-NL")}
      </div>
    </GlassCard>

    <GlassCard className="p-4">
      <div className="text-xs text-slate-500">Invoices Paid</div>
      <div className="text-xl font-bold">
        {recoveryStats.invoicesPaid}
      </div>
    </GlassCard>

    <GlassCard className="p-4">
      <div className="text-xs text-slate-500">Average Value</div>
      <div className="text-xl font-bold">
        €{Math.round(recoveryStats.avgValue).toLocaleString("nl-NL")}
      </div>
    </GlassCard>

    <GlassCard className="p-4">
      <div className="text-xs text-slate-500">Largest Payment</div>
      <div className="text-xl font-bold">
        €{recoveryStats.largest.toLocaleString("nl-NL")}
      </div>
    </GlassCard>

    <GlassCard className="p-4">
      <div className="text-xs text-slate-500">Last Payment</div>
      <div className="text-sm font-bold">
        {recoveryStats.lastPayment}
      </div>
    </GlassCard>
  </div>
)}

        {/* ── Middle row ── */}
        <div className="grid grid-cols-5 gap-4 mb-4">
          <GlassCard className="col-span-2 p-4">
            <SectionTitle icon={Users}>Top 20 Priority Tracker</SectionTitle>
            <p className="text-xs font-semibold text-slate-600 mb-0.5">Outstanding Balance & Days Overdue</p>
            <p className="text-[10px] text-slate-400 mb-3">Live from Supabase · sorted by balance</p>
            <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
              {data.customers.map((c, i) => <CustomerRow key={c.id} customer={c} index={i} />)}
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] text-slate-400">Top 20 total</span>
              <span className="text-xs font-black text-slate-700">
                {fmtFull(data.customers.reduce((s, c) => s + c.balance, 0))}
              </span>
            </div>
          </GlassCard>

          <GlassCard className="col-span-3 p-4">
            <SectionTitle icon={BarChart3}>Aging Buckets (by oldest invoice days)</SectionTitle>
            <AgingBuckets data={data.agingBuckets} />
          </GlassCard>
        </div>

        {/* ── Bottom row ── */}
        <div className="grid grid-cols-3 gap-4">
          <GlassCard className="p-4">
            <SectionTitle icon={PieChart}>Action Item Distribution</SectionTitle>
            <DisputeDonut data={data.disputes} />
            <p className="text-xs text-slate-500 mt-3">Categorises recovery actions across all debtors.</p>
          </GlassCard>

          <GlassCard className="p-4">
            <SectionTitle icon={UserCheck}>Owner Workload (€ Assigned)</SectionTitle>
            <OwnerWorkloadChart data={data.ownerWorkload} />
            <p className="text-xs text-slate-500 mt-3">Outstanding balance per account manager</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-3 border border-purple-100">
                <div className="flex items-center gap-1.5 mb-1">
                  <ArrowUpRight size={12} className="text-purple-500" />
                  <span className="text-xs font-bold text-slate-700">Top Owner</span>
                </div>
                <span className="text-sm font-black text-purple-700">{topOwner?.name || "—"}</span>
                <div className="text-[10px] text-slate-500">{topOwner ? fmt(topOwner.amount) : "—"} assigned</div>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-3 border border-orange-100">
                <div className="flex items-center gap-1.5 mb-1">
                  <Gavel size={12} className="text-orange-500" />
                  <span className="text-xs font-bold text-slate-700">Legal Cases</span>
                </div>
                <span className="text-xl font-black text-orange-600">{data.escalations}</span>
                <div className="text-[10px] text-slate-500">deurwaarder files</div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <SectionTitle icon={Calendar}>8-Week Recovery Plan</SectionTitle>
            <EightWeekPlan />
          </GlassCard>
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between text-[10px] text-slate-400">
          <span>Debtor Recovery Dashboard · 8-Week Action Plan · May 25 – Jul 17, 2026</span>
          <span className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${isLive ? "bg-green-400 animate-pulse" : "bg-orange-400"}`} />
            {isLive ? "Supabase Realtime Connected" : "Reconnecting to Supabase…"}
          </span>
        </div>
      </div>
    </div>
  );
}
