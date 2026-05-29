import { useState, useEffect, useCallback } from "react";
import { supabase } from "./lib/supabase";
import {
  TrendingDown, TrendingUp, AlertTriangle, Users, Clock,
  FileText, Search, Handshake, Settings, CheckCircle,
  ChevronRight, BarChart3, PieChart, Bell,
  ArrowUpRight, ArrowDownRight, Filter, Download, RefreshCw,
  Shield, Zap, Target, Activity, Euro, UserCheck, Gavel, Mail,
  Wifi, WifiOff
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, PieChart as RePieChart, Pie
} from "recharts";

// ─── STATIC (plan data — not from DB) ────────────────────────────────────────
const STATIC = {
  dsoTarget: 30,
  balanceTrend: [
    { week: "Wk 1", balance: 4425 }, { week: "Wk 2", balance: 4200 },
    { week: "Wk 3", balance: 3980 }, { week: "Wk 4", balance: 3750 },
    { week: "Wk 5", balance: 3500 }, { week: "Wk 6", balance: 3100 },
    { week: "Wk 7", balance: 2600 }, { week: "Wk 8", balance: 2000 },
  ],
  weeklyCollections: [
    { week: "Wk 1", amount: 225 }, { week: "Wk 2", amount: 220 },
    { week: "Wk 3", amount: 230 }, { week: "Wk 4", amount: 250 },
    { week: "Wk 5", amount: 250 }, { week: "Wk 6", amount: 400 },
    { week: "Wk 7", amount: 500 }, { week: "Wk 8", amount: 600 },
  ],
  resolutionPhases: [
    { phase: 1, label: "Log",         icon: FileText    },
    { phase: 2, label: "Investigate", icon: Search      },
    { phase: 3, label: "Collaborate", icon: Handshake   },
    { phase: 4, label: "Resolve",     icon: Settings    },
    { phase: 5, label: "Close",       icon: CheckCircle },
  ],
};

// ─── TRANSFORM: Supabase rows → dashboard metrics ────────────────────────────
// Works with schema: id, name, balance, oldest_inv_days, owner, action
function transformDebtors(rows) {
  if (!rows || rows.length === 0) return null;

  const positive = rows.filter(r => (r.balance || 0) > 0);
  const totalOutstanding = positive.reduce((s, r) => s + r.balance, 0);

  // DSO — weighted average of oldest_inv_days by balance
  const weightedDays = positive.reduce((s, r) => s + r.oldest_inv_days * r.balance, 0);
  const dso = totalOutstanding > 0 ? Math.round(weightedDays / totalOutstanding) : 0;

  // Escalations — any action containing "deurwaarder" (case-insensitive)
  const escalations = rows.filter(r =>
    (r.action || "").toLowerCase().includes("deurwaarder")
  ).length;

  // Aging buckets — derived from oldest_inv_days × balance
  let b030 = 0, b3160 = 0, b6190 = 0, b90p = 0;
  positive.forEach(r => {
    const d = r.oldest_inv_days || 0;
    if      (d <= 30) b030  += r.balance;
    else if (d <= 60) b3160 += r.balance;
    else if (d <= 90) b6190 += r.balance;
    else              b90p  += r.balance;
  });
  const bTotal = totalOutstanding || 1;
  const agingBuckets = [
    { label: "0–30 Days",  pct: +((b030  / bTotal) * 100).toFixed(1), amount: b030,  color: "#22c55e" },
    { label: "31–60 Days", pct: +((b3160 / bTotal) * 100).toFixed(1), amount: b3160, color: "#3b82f6" },
    { label: "61–90 Days", pct: +((b6190 / bTotal) * 100).toFixed(1), amount: b6190, color: "#f59e0b" },
    { label: "90+ Days",   pct: +((b90p  / bTotal) * 100).toFixed(1), amount: b90p,  color: "#ef4444" },
  ];

  // Action item distribution
  let cntDeurwaarder = 0, cntEmail = 0, cntPayment = 0, cntOther = 0;
  rows.forEach(r => {
    const a = (r.action || "").toLowerCase();
    if      (a.includes("deurwaarder")) cntDeurwaarder++;
    else if (a.includes("email"))       cntEmail++;
    else if (a.includes("payment") || a.includes("agreement")) cntPayment++;
    else                                cntOther++;
  });
  const aTotal = rows.length || 1;
  const disputes = [
    { name: "Deurwaarder",       value: Math.round((cntDeurwaarder / aTotal) * 100), color: "#ef4444" },
    { name: "Email Follow-up",   value: Math.round((cntEmail       / aTotal) * 100), color: "#3b82f6" },
    { name: "Payment Agreement", value: Math.round((cntPayment     / aTotal) * 100), color: "#8b5cf6" },
    { name: "Follow-up / Other", value: Math.round((cntOther       / aTotal) * 100), color: "#f59e0b" },
  ];

  // Owner workload — sum of positive balances, skip Unassigned
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

  // Top 20 customers sorted by balance descending
  const top20 = [...rows]
    .filter(r => (r.balance || 0) > 0)
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 20)
    .map(r => ({
      id:     String(r.id),
      name:   r.name || "Unknown",
      balance: r.balance,
      days:   r.oldest_inv_days || 0,
      owner:  r.owner || "—",
      action: r.action || "—",
    }));

  return { dso, totalOutstanding, escalations, agingBuckets, disputes, ownerWorkload, customers: top20 };
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

// ─── COUNT-UP HOOK ────────────────────────────────────────────────────────────
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

// ─── LOADING SCREEN ───────────────────────────────────────────────────────────
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

// ─── ERROR SCREEN ─────────────────────────────────────────────────────────────
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

// ─── DSO GAUGE ────────────────────────────────────────────────────────────────
function DSOGauge({ value, target }) {
  // Cap at 1200 days for gauge visual — DSO is 853 so cap at 1000 for scale
  const pct = Math.min(value / 1000, 1);
  const angle = -135 + pct * 270;
  const countVal = useCountUp(value);
  const color = value <= 30 ? "#22c55e" : value <= 90 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 160 100" className="w-44">
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="40%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>
        <path d="M 20 90 A 60 60 0 1 1 140 90" fill="none" stroke="#e2e8f0" strokeWidth="12" strokeLinecap="round" />
        <path d="M 20 90 A 60 60 0 1 1 140 90" fill="none" stroke="url(#gaugeGrad)" strokeWidth="12"
          strokeLinecap="round" strokeDasharray={`${pct * 188.5} 188.5`} />
        <g transform={`translate(80,90) rotate(${angle})`}>
          <line x1="0" y1="0" x2="0" y2="-44" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="0" cy="0" r="4" fill="#1e293b" />
        </g>
        <text x="80" y="78" textAnchor="middle" fontSize="22" fontWeight="800" fill={color}>{countVal}</text>
        <text x="80" y="96" textAnchor="middle" fontSize="9" fill="#64748b">DAYS AVG</text>
      </svg>
      <p className="text-xs text-slate-500 text-center mt-1 leading-tight">
        Weighted avg days overdue<br />by outstanding balance
      </p>
      <span className="mt-2 text-xs px-2 py-0.5 rounded-full font-medium border bg-red-50 text-red-600 border-red-200">
        Target: {target}d · Current: {value}d
      </span>
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

// ─── BALANCE TREND ────────────────────────────────────────────────────────────
function BalanceTrendChart({ data }) {
  return (
    <div className="h-36">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
          <defs>
            <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#93c5fd" /><stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="week" tick={{ fontSize: 10, fill: "#94a3b8" }} />
          <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={v => `€${v}k`} />
          <Tooltip contentStyle={{ background: "#1e293b", border: "none", borderRadius: 8, color: "#f8fafc", fontSize: 11 }}
            formatter={v => [`€${v}k`, "Balance"]} />
          <Line type="monotone" dataKey="balance" stroke="url(#lineGrad)" strokeWidth={2.5}
            dot={{ fill: "#3b82f6", r: 3, strokeWidth: 0 }} activeDot={{ r: 5, fill: "#1d4ed8" }} />
        </LineChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-1.5 mt-1">
        <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
        <span className="text-xs text-slate-500">8-Week reduction plan · Starting €4.42M</span>
      </div>
    </div>
  );
}

// ─── WEEKLY COLLECTIONS ───────────────────────────────────────────────────────
function WeeklyCollectionsChart({ data }) {
  return (
    <div className="h-36">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="week" tick={{ fontSize: 10, fill: "#94a3b8" }} />
          <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={v => `€${v}k`} />
          <Tooltip contentStyle={{ background: "#1e293b", border: "none", borderRadius: 8, color: "#f8fafc", fontSize: 11 }}
            formatter={v => [`€${v}k`, "Target"]} />
          <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={i === data.length - 1 ? "#16a34a" : `rgba(74,222,128,${0.4 + i * 0.07})`} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="text-xs text-slate-500 mt-1">Weekly collection target · 8-week plan</p>
    </div>
  );
}

// ─── AGING BUCKETS ────────────────────────────────────────────────────────────
function AgingBuckets({ data }) {
  const [hovered, setHovered] = useState(null);
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

// ─── RESOLUTION LIFECYCLE ─────────────────────────────────────────────────────
function ResolutionLifecycle({ phases }) {
  const [active, setActive] = useState(3);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1">
        {phases.map((p, i) => {
          const Icon = p.icon;
          const isActive  = p.phase <= active;
          const isCurrent = p.phase === active;
          return (
            <div key={i} className="flex items-center flex-1">
              <button onClick={() => setActive(p.phase)}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-300 flex-1
                  ${isCurrent ? "bg-blue-600 text-white shadow-lg shadow-blue-200 scale-105" :
                    isActive   ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-400"}`}>
                <Icon size={14} /><span className="text-[9px] font-bold">{p.label}</span>
              </button>
              {i < phases.length - 1 && (
                <div className={`h-0.5 w-2 ${p.phase < active ? "bg-blue-400" : "bg-slate-200"}`} />
              )}
            </div>
          );
        })}
      </div>
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 flex items-start gap-2">
        <Zap size={12} className="text-blue-500 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-blue-700">
          <strong>Goal:</strong> Resolution within <strong>5 working days</strong> as mandated in Week 3.
        </p>
      </div>
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
  const [isLive,      setIsLive]      = useState(false);

  const fetchDebtors = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const { data: rows, error: err } = await supabase
        .from("debtors")
        .select("id, name, balance, oldest_inv_days, owner, action")
        .order("balance", { ascending: false });

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

  if (loading) return <LoadingScreen />;
  if (error)   return <ErrorScreen message={error} onRetry={() => { setLoading(true); fetchDebtors(); }} />;
  if (!data)   return <ErrorScreen message="No data returned from Supabase." onRetry={() => { setLoading(true); fetchDebtors(); }} />;

  const topOwner = data.ownerWorkload[0];

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
            <button className="flex items-center gap-1.5 text-xs bg-blue-600 text-white px-3 py-2 rounded-xl hover:bg-blue-700 transition-all shadow-md">
              <Download size={12} /> Export
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
          <div className="grid grid-cols-4 gap-4">
            <GlassCard className="p-4 flex flex-col items-center">
              <SectionTitle icon={Target}>Days Sales Outstanding</SectionTitle>
              <DSOGauge value={data.dso} target={STATIC.dsoTarget} />
            </GlassCard>
            <GlassCard className="p-4">
              <SectionTitle icon={TrendingDown}>90-Day Balance Trend</SectionTitle>
              <BalanceTrendChart data={STATIC.balanceTrend} />
            </GlassCard>
            <GlassCard className="p-4">
              <SectionTitle icon={TrendingUp}>Weekly Collection Targets</SectionTitle>
              <WeeklyCollectionsChart data={STATIC.weeklyCollections} />
            </GlassCard>
            <GlassCard className="p-4 flex flex-col items-center justify-center">
              <SectionTitle icon={Bell}>Deurwaarder Escalations</SectionTitle>
              <EscalationBoard value={data.escalations} />
            </GlassCard>
          </div>
        </div>

        {/* ── Middle ── */}
        <div className="grid grid-cols-5 gap-4 mb-4">
          <GlassCard className="col-span-2 p-4">
            <SectionTitle icon={Users}>Top 20 Priority Tracker</SectionTitle>
            <p className="text-xs font-semibold text-slate-600 mb-0.5">Outstanding Balance & Days Overdue</p>
            <p className="text-[10px] text-slate-400 mb-3">Live from Supabase · {data.customers.length} shown · sorted by balance</p>
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

        {/* ── Bottom ── */}
        <div className="grid grid-cols-3 gap-4">
          <GlassCard className="p-4">
            <SectionTitle icon={PieChart}>Action Item Distribution</SectionTitle>
            <DisputeDonut data={data.disputes} />
            <p className="text-xs text-slate-500 mt-3">Categorises recovery actions across all {data.customers.length} debtors.</p>
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
            <SectionTitle icon={CheckCircle}>Resolution Lifecycle</SectionTitle>
            <ResolutionLifecycle phases={STATIC.resolutionPhases} />
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-3 border border-blue-100">
                <div className="flex items-center gap-1.5 mb-1">
                  <ArrowDownRight size={12} className="text-green-500" />
                  <span className="text-xs font-bold text-slate-700">Target Resolution</span>
                </div>
                <span className="text-xl font-black text-blue-700">5d</span>
                <div className="text-[10px] text-slate-500">week 3 mandate</div>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-3 border border-orange-100">
                <div className="flex items-center gap-1.5 mb-1">
                  <AlertTriangle size={12} className="text-orange-500" />
                  <span className="text-xs font-bold text-slate-700">Total Debtors</span>
                </div>
                <span className="text-xl font-black text-orange-600">{data.customers.length}</span>
                <div className="text-[10px] text-slate-500">tracked accounts</div>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between text-[10px] text-slate-400">
          <span>Debtor Recovery Dashboard · 8-Week Action Plan · {new Date().toLocaleDateString()}</span>
          <span className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${isLive ? "bg-green-400 animate-pulse" : "bg-orange-400"}`} />
            {isLive ? "Supabase Realtime Connected" : "Reconnecting to Supabase…"}
          </span>
        </div>
      </div>
    </div>
  );
}