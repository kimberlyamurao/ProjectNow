import { useState, useEffect, useRef } from "react";
import {
  TrendingDown, TrendingUp, AlertTriangle, Users, Clock,
  FileText, Search, Handshake, Settings, CheckCircle,
  ChevronRight, BarChart3, PieChart, Calendar, Bell,
  ArrowUpRight, ArrowDownRight, Filter, Download, RefreshCw,
  Shield, Zap, Target, Activity
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, PieChart as RePieChart, Pie, Legend
} from "recharts";

// ─── DATA LAYER (swap with API calls for backend integration) ───────────────
const DATA = {
  dso: 45,
  dsoTarget: 30,
  escalations: 18,
  balanceTrend: [
    { week: "Wk 1", balance: 980 },
    { week: "Wk 2", balance: 910 },
    { week: "Wk 3", balance: 860 },
    { week: "Wk 4", balance: 810 },
    { week: "Wk 5", balance: 740 },
    { week: "Wk 6", balance: 680 },
    { week: "Wk 7", balance: 600 },
    { week: "Wk 8", balance: 520 },
  ],
  weeklyCollections: [
    { week: "Wk 1", amount: 20 },
    { week: "Wk 2", amount: 35 },
    { week: "Wk 3", amount: 45 },
    { week: "Wk 4", amount: 55 },
    { week: "Wk 5", amount: 65 },
    { week: "Wk 6", amount: 80 },
    { week: "Wk 7", amount: 100 },
    { week: "Wk 8", amount: 120 },
  ],
  agingBuckets: [
    { label: "0–30 Days", pct: 40, amount: 400, color: "#93c5fd" },
    { label: "31–60 Days", pct: 25, amount: 250, color: "#3b82f6" },
    { label: "61–90 Days", pct: 15, amount: 150, color: "#1d4ed8" },
    { label: "91–120 Days", pct: 10, amount: 100, color: "#f97316" },
    { label: "120+ Days", pct: 10, amount: 100, color: "#ef4444" },
  ],
  customers: [
    { id: "A", balance: 75, oldestInvoice: 65, lastContact: "Oct 15", owner: "Sales Team" },
    { id: "B", balance: 75, oldestInvoice: null, lastContact: "Oct 15", owner: "Sales Team" },
    { id: "C", balance: 75, oldestInvoice: 65, lastContact: null, owner: "Sales Team" },
    { id: "F", balance: 125, oldestInvoice: null, lastContact: null, owner: "Sales Team" },
    { id: "D", balance: 75, oldestInvoice: null, lastContact: "Oct 15", owner: "Sales Team" },
    { id: "E", balance: 75, oldestInvoice: null, lastContact: "Oct 15", owner: "Sales Team" },
  ],
  disputes: [
    { name: "Missing POs", value: 35, color: "#1e40af" },
    { name: "Hours Conflicts", value: 25, color: "#3b82f6" },
    { name: "Delivery Discussions", value: 20, color: "#93c5fd" },
    { name: "Invoice Discrepancies", value: 20, color: "#bfdbfe" },
  ],
  resolutionPhases: [
    { phase: 1, label: "Log", icon: FileText, active: true },
    { phase: 2, label: "Investigate", icon: Search, active: true },
    { phase: 3, label: "Collaborate", icon: Handshake, active: true },
    { phase: 4, label: "Resolve", icon: Settings, active: false },
    { phase: 5, label: "Close", icon: CheckCircle, active: false },
  ],
};

// ─── CUSTOM HOOKS ────────────────────────────────────────────────────────────
function useCountUp(target, duration = 1200) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return count;
}

// ─── SUB-COMPONENTS ──────────────────────────────────────────────────────────

function GlassCard({ children, className = "", hover = true }) {
  return (
    <div className={`
      bg-white/80 backdrop-blur-sm border border-white/60
      rounded-2xl shadow-[0_4px_24px_rgba(30,64,175,0.08)]
      ${hover ? "hover:shadow-[0_8px_32px_rgba(30,64,175,0.15)] hover:-translate-y-0.5 transition-all duration-300" : ""}
      ${className}
    `}>
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

// DSO Gauge
function DSOGauge({ value, target }) {
  const pct = Math.min(value / 90, 1);
  const angle = -135 + pct * 270;
  const countVal = useCountUp(value);
  const color = value <= 30 ? "#22c55e" : value <= 50 ? "#3b82f6" : "#ef4444";

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 160 100" className="w-44">
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>
        {/* Track */}
        <path d="M 20 90 A 60 60 0 1 1 140 90" fill="none" stroke="#e2e8f0" strokeWidth="12" strokeLinecap="round" />
        {/* Fill */}
        <path d="M 20 90 A 60 60 0 1 1 140 90" fill="none" stroke="url(#gaugeGrad)" strokeWidth="12"
          strokeLinecap="round" strokeDasharray={`${pct * 188.5} 188.5`} />
        {/* Needle */}
        <g transform={`translate(80,90) rotate(${angle})`}>
          <line x1="0" y1="0" x2="0" y2="-44" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="0" cy="0" r="4" fill="#1e293b" />
        </g>
        <text x="80" y="82" textAnchor="middle" fontSize="26" fontWeight="800" fill={color}>{countVal}</text>
        <text x="80" y="96" textAnchor="middle" fontSize="9" fill="#64748b">DAYS</text>
      </svg>
      <p className="text-xs text-slate-500 text-center mt-1 leading-tight">
        Primary indicator of collection efficiency,<br />monitored for downward trend
      </p>
      <span className="mt-2 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
        Target: {target} days
      </span>
    </div>
  );
}

// Escalation Flipboard
function EscalationBoard({ value }) {
  const count = useCountUp(value, 800);
  const tens = Math.floor(count / 10);
  const ones = count % 10;
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex gap-2">
        {[tens, ones].map((d, i) => (
          <div key={i} className="
            w-14 h-16 bg-gradient-to-b from-slate-800 to-slate-900
            rounded-xl flex items-center justify-center
            shadow-[0_4px_16px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]
            border-b-4 border-slate-950 relative overflow-hidden
          ">
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent" />
            <span className="text-3xl font-black text-white font-mono relative z-10">{d}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
        <AlertTriangle size={12} className="text-red-500" />
        <span className="text-xs text-red-600 font-semibold">Active Escalations</span>
      </div>
      <p className="text-xs text-slate-500 text-center leading-tight">
        Accounts moved to Finance<br />Managers / Management
      </p>
    </div>
  );
}

// Balance Trend Chart
function BalanceTrendChart({ data }) {
  return (
    <div className="h-36">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
          <defs>
            <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#93c5fd" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="week" tick={{ fontSize: 10, fill: "#94a3b8" }} />
          <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
          <Tooltip
            contentStyle={{ background: "#1e293b", border: "none", borderRadius: 8, color: "#f8fafc", fontSize: 11 }}
            formatter={(v) => [`$${v}k`, "Balance"]}
          />
          <Line type="monotone" dataKey="balance" stroke="url(#lineGrad)" strokeWidth={2.5}
            dot={{ fill: "#3b82f6", r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: "#1d4ed8" }} />
        </LineChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-1.5 mt-1">
        <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
        <span className="text-xs text-slate-500">Reduction Focus: &gt;90 Days</span>
      </div>
    </div>
  );
}

// Weekly Collections Chart
function WeeklyCollectionsChart({ data }) {
  return (
    <div className="h-36">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
          <defs>
            <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#16a34a" />
              <stop offset="100%" stopColor="#4ade80" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="week" tick={{ fontSize: 10, fill: "#94a3b8" }} />
          <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(v) => `$${v}k`} />
          <Tooltip
            contentStyle={{ background: "#1e293b", border: "none", borderRadius: 8, color: "#f8fafc", fontSize: 11 }}
            formatter={(v) => [`$${v}k`, "Collected"]}
          />
          {data.map((entry, i) => null)}
          <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={i === data.length - 1 ? "#16a34a" : `rgba(74,222,128,${0.4 + i * 0.07})`} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="text-xs text-slate-500 mt-1">Tracks actual cash realized each week</p>
    </div>
  );
}

// Aging Buckets
function AgingBuckets({ data }) {
  return (
    <div className="space-y-3">
      {/* Bar */}
      <div className="flex rounded-xl overflow-hidden h-10 shadow-inner">
        {data.map((b, i) => (
          <div key={i} style={{ width: `${b.pct}%`, background: b.color }}
            className="flex items-center justify-center text-white text-xs font-bold transition-all duration-700 hover:brightness-110 cursor-pointer"
            title={b.label}>
            {b.pct}%
          </div>
        ))}
      </div>
      {/* Labels */}
      <div className="flex">
        {data.map((b, i) => (
          <div key={i} style={{ width: `${b.pct}%` }}
            className="text-center text-[9px] font-semibold text-slate-500 leading-tight px-0.5">
            {b.label}
          </div>
        ))}
      </div>
      {/* Amount tags */}
      <div className="flex gap-2 flex-wrap">
        {data.map((b, i) => (
          <div key={i} style={{ background: b.color }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-white text-xs font-bold shadow-sm">
            ${b.amount}k
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-500">Total outstanding divided into five aging categories.</p>
    </div>
  );
}

// Customer Row
function CustomerRow({ customer, index }) {
  const riskColor = customer.balance >= 100 ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700";
  return (
    <div className={`
      flex items-center gap-3 p-2.5 rounded-xl border border-transparent
      hover:bg-blue-50/60 hover:border-blue-100 transition-all duration-200 cursor-pointer
      group
    `}>
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-black shadow flex-shrink-0">
        {customer.id}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-700">Customer {customer.id}</span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${riskColor}`}>
            ${customer.balance}k
          </span>
        </div>
        <div className="flex gap-3 mt-0.5 flex-wrap">
          {customer.oldestInvoice && (
            <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
              <Clock size={9} />Inv: {customer.oldestInvoice}d
            </span>
          )}
          {customer.lastContact && (
            <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
              <Calendar size={9} />{customer.lastContact}
            </span>
          )}
          <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
            <Users size={9} />{customer.owner}
          </span>
        </div>
      </div>
      <ChevronRight size={14} className="text-slate-300 group-hover:text-blue-400 transition-colors flex-shrink-0" />
    </div>
  );
}

// Dispute Donut
function DisputeDonut({ data }) {
  const RADIAN = Math.PI / 180;
  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, name, value }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="700">
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
              dataKey="value" labelLine={false} label={renderLabel}>
              {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
            </Pie>
            <Tooltip contentStyle={{ background: "#1e293b", border: "none", borderRadius: 8, color: "#f8fafc", fontSize: 11 }} />
          </RePieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-col gap-1.5 flex-1">
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

// Resolution Lifecycle
function ResolutionLifecycle({ phases }) {
  const [active, setActive] = useState(3);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1">
        {phases.map((p, i) => {
          const Icon = p.icon;
          const isActive = p.phase <= active;
          const isCurrent = p.phase === active;
          return (
            <div key={i} className="flex items-center flex-1">
              <button
                onClick={() => setActive(p.phase)}
                className={`
                  flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-300 flex-1
                  ${isCurrent ? "bg-blue-600 text-white shadow-lg shadow-blue-200 scale-105" :
                    isActive ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-400"}
                `}
              >
                <Icon size={14} />
                <span className="text-[9px] font-bold">{p.label}</span>
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
          <strong>Goal:</strong> Solution achieved within <strong>5 working days</strong> as mandated in Week 3.
        </p>
      </div>
    </div>
  );
}

// ─── MAIN DASHBOARD ──────────────────────────────────────────────────────────
export default function DebtorDashboard() {
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  // Simulated refresh — replace with real API call
  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => { setRefreshing(false); setLastUpdated(new Date()); }, 1200);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50/40 to-slate-100 font-sans p-4">
      {/* Ambient background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-40 w-80 h-80 bg-indigo-200/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 left-1/3 w-72 h-72 bg-cyan-200/20 rounded-full blur-3xl" />
      </div>

      {/* ── Header ── */}
      <div className="max-w-screen-xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center shadow-md">
                <Shield size={16} className="text-white" />
              </div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">
                Debtor Recovery Performance
              </h1>
              <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                8-Week Plan
              </span>
            </div>
            <p className="text-xs text-slate-400 ml-10">
              Last updated: {lastUpdated.toLocaleTimeString()} · All figures in USD
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleRefresh}
              className="flex items-center gap-1.5 text-xs bg-white border border-slate-200 text-slate-600 px-3 py-2 rounded-xl hover:bg-slate-50 transition-all shadow-sm">
              <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
              Refresh
            </button>
            <button className="flex items-center gap-1.5 text-xs bg-white border border-slate-200 text-slate-600 px-3 py-2 rounded-xl hover:bg-slate-50 transition-all shadow-sm">
              <Filter size={12} /> Filter
            </button>
            <button className="flex items-center gap-1.5 text-xs bg-blue-600 text-white px-3 py-2 rounded-xl hover:bg-blue-700 transition-all shadow-md">
              <Download size={12} /> Export
            </button>
          </div>
        </div>

        {/* ── Section: Executive KPIs ── */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Activity size={14} className="text-blue-600" />
            <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Executive KPIs — High-Level Metrics</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>
          <div className="grid grid-cols-4 gap-4">
            {/* DSO */}
            <GlassCard className="p-4 flex flex-col items-center">
              <SectionTitle icon={Target}>Days Sales Outstanding</SectionTitle>
              <DSOGauge value={DATA.dso} target={DATA.dsoTarget} />
            </GlassCard>

            {/* 90-Day Balance Trend */}
            <GlassCard className="p-4">
              <SectionTitle icon={TrendingDown}>90-Day Balance Trend</SectionTitle>
              <BalanceTrendChart data={DATA.balanceTrend} />
            </GlassCard>

            {/* Weekly Collections */}
            <GlassCard className="p-4">
              <SectionTitle icon={TrendingUp}>Weekly Collection Amounts</SectionTitle>
              <WeeklyCollectionsChart data={DATA.weeklyCollections} />
            </GlassCard>

            {/* Escalations */}
            <GlassCard className="p-4 flex flex-col items-center justify-center">
              <SectionTitle icon={Bell}>Number of Escalations</SectionTitle>
              <EscalationBoard value={DATA.escalations} />
            </GlassCard>
          </div>
        </div>

        {/* ── Section: Middle Row ── */}
        <div className="grid grid-cols-5 gap-4 mb-4">
          {/* Top 20 Priority Tracker */}
          <GlassCard className="col-span-2 p-4">
            <SectionTitle icon={Users}>Top 20 Priority Tracker</SectionTitle>
            <p className="text-xs font-semibold text-slate-600 mb-0.5">Outstanding Balance & Oldest Invoice</p>
            <p className="text-[10px] text-slate-400 mb-3">Dollar amount & age of most critical overdue item</p>
            <div className="space-y-1 max-h-64 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-blue-200">
              {DATA.customers.map((c, i) => <CustomerRow key={c.id} customer={c} index={i} />)}
            </div>
            <p className="text-[10px] text-slate-400 mt-3 border-t border-slate-100 pt-2">
              Identifies dollar amount and age of critical overdue item; records most recent contact and responsible colleague.
            </p>
          </GlassCard>

          {/* Aging Buckets */}
          <GlassCard className="col-span-3 p-4">
            <SectionTitle icon={BarChart3}>Aging Buckets (0 to 120+ Days)</SectionTitle>
            <AgingBuckets data={DATA.agingBuckets} />
          </GlassCard>
        </div>

        {/* ── Section: Disputes ── */}
        <div className="grid grid-cols-2 gap-4">
          {/* Dispute Categories */}
          <GlassCard className="p-4">
            <SectionTitle icon={PieChart}>Dispute Tracking & Resolution — Categories</SectionTitle>
            <DisputeDonut data={DATA.disputes} />
            <p className="text-xs text-slate-500 mt-3">Categorizes barriers to payment into four groups.</p>
          </GlassCard>

          {/* Resolution Lifecycle */}
          <GlassCard className="p-4">
            <SectionTitle icon={CheckCircle}>Resolution Lifecycle</SectionTitle>
            <ResolutionLifecycle phases={DATA.resolutionPhases} />
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-3 border border-blue-100">
                <div className="flex items-center gap-1.5 mb-1">
                  <ArrowDownRight size={12} className="text-green-500" />
                  <span className="text-xs font-bold text-slate-700">Avg. Resolution</span>
                </div>
                <span className="text-xl font-black text-blue-700">3.2d</span>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-3 border border-orange-100">
                <div className="flex items-center gap-1.5 mb-1">
                  <AlertTriangle size={12} className="text-orange-500" />
                  <span className="text-xs font-bold text-slate-700">Open Disputes</span>
                </div>
                <span className="text-xl font-black text-orange-600">14</span>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between text-[10px] text-slate-400">
          <span>Debtor Recovery Dashboard · 8-Week Action Plan · Data refreshes every 15 min</span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            Backend Integration Ready
          </span>
        </div>
      </div>
    </div>
  );
}
