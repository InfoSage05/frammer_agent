'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, Database, TrendingUp, X, Sparkles, Zap,
  Upload, Activity, Target, Layers, Clock, Users, 
  ArrowUpRight, ArrowDownRight, ChevronRight, MessageSquare,
  Play, FileVideo, Share2, Timer
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, RadialBarChart, RadialBar,
  ComposedChart, Treemap
} from 'recharts';

// ─── API Configuration ───────────────────────────────────────────────────────
const API_BASE = 'http://localhost:8000';
const BRAND_COLORS = ['#4F46E5', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

// ─── KPI icon/color/unit mapping (static, only visual config) ───────────────
const KPI_DISPLAY_CONFIG: Record<string, { icon: any; color: string; unit: string }> = {
  'total_uploaded':    { icon: Upload,   color: 'from-blue-500 to-indigo-600',   unit: 'videos' },
  'total_processed':   { icon: Activity, color: 'from-cyan-500 to-blue-600',     unit: 'outputs' },
  'total_published':   { icon: Share2,   color: 'from-green-500 to-emerald-600', unit: 'videos' },
  'publish_rate':      { icon: Target,   color: 'from-amber-500 to-orange-600',  unit: 'conversion' },
  'amplification_ratio': { icon: Zap,    color: 'from-purple-500 to-pink-600',   unit: 'ratio' },
  'process_rate':      { icon: Layers,   color: 'from-indigo-500 to-purple-600', unit: 'per upload' },
};

const DURATION_ICON_MAP: Record<string, any> = {
  'Uploaded Hours': Clock, 'Processed Hours': Timer,
  'Published Hours': Play, 'Avg Upload Duration': FileVideo,
};

// ─── Fallback data (used if analytics_dashboard.json not found) ─────────────
const FALLBACK_EXECUTIVE_KPIS = [
  { id: 'total_uploaded', name: 'Total Uploaded', value: 4453, formatted: '4,453', unit: 'videos', icon: Upload, color: 'from-blue-500 to-indigo-600', trend: 12.5 },
  { id: 'total_processed', name: 'Total Processed', value: 14914, formatted: '14,914', unit: 'outputs', icon: Activity, color: 'from-cyan-500 to-blue-600', trend: 8.3 },
  { id: 'total_published', name: 'Total Published', value: 111, formatted: '111', unit: 'videos', icon: Share2, color: 'from-green-500 to-emerald-600', trend: -2.1 },
  { id: 'publish_rate', name: 'Publish Rate', value: 0.74, formatted: '0.74%', unit: 'conversion', icon: Target, color: 'from-amber-500 to-orange-600', trend: 0.5 },
  { id: 'amplification_ratio', name: 'Amplification', value: 3.35, formatted: '3.35x', unit: 'ratio', icon: Zap, color: 'from-purple-500 to-pink-600', trend: 15.2 },
  { id: 'process_rate', name: 'Process Rate', value: 334.92, formatted: '334.92%', unit: 'per upload', icon: Layers, color: 'from-indigo-500 to-purple-600' },
];
const FALLBACK_DURATION_KPIS = [
  { name: 'Uploaded Hours', value: 807.67, formatted: '807.67', unit: 'hours', icon: Clock },
  { name: 'Processed Hours', value: 1355.17, formatted: '1,355.17', unit: 'hours', icon: Timer },
  { name: 'Published Hours', value: 4.38, formatted: '4.38', unit: 'hours', icon: Play },
  { name: 'Avg Upload Duration', value: 10.88, formatted: '10.88', unit: 'minutes', icon: FileVideo },
];
const FALLBACK_ENTITY_KPIS = [
  { name: 'Distinct Channels', value: 18, icon: BarChart3, color: '#4F46E5' },
  { name: 'Distinct Users', value: 45, icon: Users, color: '#06B6D4' },
];
const FALLBACK_MONTHLY_DATA = [
  { month: 'Mar', uploaded: 312, created: 1024, published: 8, publishRate: 0.78 },
  { month: 'Apr', uploaded: 289, created: 978, published: 12, publishRate: 1.23 },
  { month: 'May', uploaded: 356, created: 1156, published: 9, publishRate: 0.78 },
  { month: 'Jun', uploaded: 401, created: 1289, published: 15, publishRate: 1.16 },
  { month: 'Jul', uploaded: 445, created: 1456, published: 11, publishRate: 0.76 },
  { month: 'Aug', uploaded: 389, created: 1234, published: 8, publishRate: 0.65 },
  { month: 'Sep', uploaded: 367, created: 1178, published: 10, publishRate: 0.85 },
  { month: 'Oct', uploaded: 412, created: 1345, published: 12, publishRate: 0.89 },
  { month: 'Nov', uploaded: 398, created: 1267, published: 9, publishRate: 0.71 },
  { month: 'Dec', uploaded: 356, created: 1123, published: 7, publishRate: 0.62 },
  { month: 'Jan', uploaded: 378, created: 1189, published: 6, publishRate: 0.50 },
  { month: 'Feb', uploaded: 350, created: 1175, published: 4, publishRate: 0.34 },
];
const FALLBACK_CHANNEL_DATA = [
  { name: 'Channel A', uploaded: 1470, created: 4725, published: 71, rate: 1.50, amp: 3.21 },
  { name: 'Channel B', uploaded: 1293, created: 4251, published: 19, rate: 0.45, amp: 3.29 },
  { name: 'Channel C', uploaded: 765, created: 2631, published: 14, rate: 0.53, amp: 3.44 },
  { name: 'Channel D', uploaded: 456, created: 1567, published: 5, rate: 0.32, amp: 3.44 },
  { name: 'Channel E', uploaded: 234, created: 890, published: 2, rate: 0.22, amp: 3.80 },
  { name: 'Channel F', uploaded: 125, created: 456, published: 0, rate: 0, amp: 3.65 },
];
const FALLBACK_OUTPUT_TYPE_DATA = [
  { name: 'Key Moments', value: 6234, color: '#4F46E5' },
  { name: 'Summary', value: 4521, color: '#06B6D4' },
  { name: 'Shorts', value: 2345, color: '#10B981' },
  { name: 'Reels', value: 1234, color: '#F59E0B' },
  { name: 'Full Video', value: 580, color: '#EF4444' },
];
const FALLBACK_INPUT_TYPE_DATA = [
  { name: 'Video Upload', value: 3245, color: '#4F46E5' },
  { name: 'YouTube Link', value: 856, color: '#06B6D4' },
  { name: 'Audio Only', value: 234, color: '#10B981' },
  { name: 'Recording', value: 118, color: '#F59E0B' },
];
const FALLBACK_FUNNEL_DATA = [
  { stage: 'Uploaded', value: 4453, fill: '#4F46E5' },
  { stage: 'Processed', value: 14914, fill: '#06B6D4' },
  { stage: 'Published', value: 111, fill: '#10B981' },
];
const FALLBACK_PLATFORM_DATA = [
  { name: 'YouTube', value: 45 },
  { name: 'Instagram', value: 28 },
  { name: 'Facebook', value: 15 },
  { name: 'LinkedIn', value: 8 },
  { name: 'X/Twitter', value: 4 },
];

// ─── Load analytics dashboard from JSON file ────────────────────────────────
// Pipeline writes to: frontend/public/data/analytics_dashboard.json
// Next.js serves public/ as static, so fetch('/data/analytics_dashboard.json')
function useAnalyticsDashboard() {
  const [executiveKpis, setExecutiveKpis] = useState(FALLBACK_EXECUTIVE_KPIS);
  const [durationKpis, setDurationKpis] = useState(FALLBACK_DURATION_KPIS);
  const [entityKpis, setEntityKpis] = useState(FALLBACK_ENTITY_KPIS);
  const [monthlyData, setMonthlyData] = useState(FALLBACK_MONTHLY_DATA);
  const [channelData, setChannelData] = useState(FALLBACK_CHANNEL_DATA);
  const [outputTypeData, setOutputTypeData] = useState(FALLBACK_OUTPUT_TYPE_DATA);
  const [inputTypeData, setInputTypeData] = useState(FALLBACK_INPUT_TYPE_DATA);
  const [funnelData, setFunnelData] = useState(FALLBACK_FUNNEL_DATA);
  const [platformData, setPlatformData] = useState(FALLBACK_PLATFORM_DATA);
  const [dataSource, setDataSource] = useState<'fallback' | 'pipeline'>('fallback');

  useEffect(() => {
    // Try backend API first (checks for dataset changes on each call),
    // fall back to static JSON file if backend is down
    const fetchDashboard = async () => {
      // Try backend API
      try {
        const res = await fetch(`${API_BASE}/analytics-dashboard`);
        if (res.ok) return await res.json();
      } catch {}
      // Fallback: static file from public/
      try {
        const res = await fetch('/data/analytics_dashboard.json');
        if (res.ok) return await res.json();
      } catch {}
      return null;
    };

    fetchDashboard()
      .then((dashboard: any) => {
        if (!dashboard) {
          console.log('[Analytics] No pipeline data found, using fallback values');
          return;
        }
        const metrics = dashboard.metrics || [];
        const chartData = dashboard.chart_data || {};

        // ─── Build Executive KPIs from metrics ─────────────────────
        const execIds = ['total_uploaded', 'total_processed', 'total_published', 'publish_rate', 'amplification_ratio', 'process_rate'];
        const execKpis = execIds.map((id, i) => {
          const m = metrics.find((x: any) => x.id === id);
          const cfg = KPI_DISPLAY_CONFIG[id] || { icon: Activity, color: 'from-gray-500 to-gray-600', unit: '' };
          const fallback = FALLBACK_EXECUTIVE_KPIS[i];
          if (!m) return fallback;
          return { id, name: m.name, value: m.value, formatted: m.formatted, unit: cfg.unit, icon: cfg.icon, color: cfg.color, trend: fallback?.trend };
        });
        setExecutiveKpis(execKpis);

        // ─── Duration KPIs ─────────────────────────────────────────
        const durNames = ['Uploaded Hours', 'Processed Hours', 'Published Hours', 'Avg Upload Duration'];
        const durIds = ['uploaded_hours', 'processed_hours', 'published_hours', 'avg_upload_min'];
        const durKpis = durIds.map((id, i) => {
          const m = metrics.find((x: any) => x.id === id);
          if (!m) return FALLBACK_DURATION_KPIS[i];
          return { name: durNames[i], value: m.value, formatted: m.formatted, unit: id.includes('min') ? 'minutes' : 'hours', icon: DURATION_ICON_MAP[durNames[i]] || Clock };
        });
        setDurationKpis(durKpis);

        // ─── Entity KPIs ───────────────────────────────────────────
        const chM = metrics.find((x: any) => x.id === 'distinct_channels');
        const usM = metrics.find((x: any) => x.id === 'distinct_users');
        setEntityKpis([
          { name: 'Distinct Channels', value: chM?.value ?? 18, icon: BarChart3, color: '#4F46E5' },
          { name: 'Distinct Users', value: usM?.value ?? 45, icon: Users, color: '#06B6D4' },
        ]);

        // ─── Chart Data ────────────────────────────────────────────
        if (chartData.monthly_trends?.length) setMonthlyData(chartData.monthly_trends);
        if (chartData.channel_performance?.length) setChannelData(chartData.channel_performance);
        if (chartData.output_type_mix?.length) setOutputTypeData(chartData.output_type_mix);
        if (chartData.input_type_mix?.length) setInputTypeData(chartData.input_type_mix);
        if (chartData.platform_distribution?.length) setPlatformData(chartData.platform_distribution);

        if (chartData.funnel_data?.length) {
          const fills = ['#4F46E5', '#06B6D4', '#10B981'];
          setFunnelData(chartData.funnel_data.map((f: any, i: number) => ({ ...f, fill: fills[i] || '#888' })));
        }

        setDataSource('pipeline');
        console.log(`[Analytics] Loaded ${metrics.length} metrics from pipeline (generated: ${dashboard.generated_at})`);
      });
  }, []);

  return { EXECUTIVE_KPIS: executiveKpis, DURATION_KPIS: durationKpis, ENTITY_KPIS: entityKpis,
           MONTHLY_DATA: monthlyData, CHANNEL_DATA: channelData, OUTPUT_TYPE_DATA: outputTypeData,
           INPUT_TYPE_DATA: inputTypeData, FUNNEL_DATA: funnelData, PLATFORM_DATA: platformData,
           dataSource };
}

// ─── Types ───────────────────────────────────────────────────────────────────
type TabType = 'overview' | 'analytics' | 'data';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  artifacts?: any[];
}

interface Dataset {
  id: number;
  name: string;
  row_count: number;
  col_count: number;
  description: string;
}

interface DynamicChart {
  id: string;
  title: string;
  type: string;
  data: any;
  createdAt: Date;
}

// ─── Component: KPI Card ─────────────────────────────────────────────────────
function KPICard({ kpi, index }: { kpi: typeof EXECUTIVE_KPIS[0]; index: number }) {
  const Icon = kpi.icon;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.08, type: 'spring', stiffness: 100 }}
      className="group relative"
    >
      <div className={`absolute inset-0 bg-gradient-to-r ${kpi.color} rounded-2xl blur-xl opacity-0 group-hover:opacity-30 transition-opacity duration-500`} />
      <div className="relative bg-gray-900/90 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all duration-300 h-full">
        <div className="flex items-start justify-between mb-4">
          <div className={`p-3 rounded-xl bg-gradient-to-br ${kpi.color}`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          {kpi.trend !== undefined && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${
              kpi.trend >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}>
              {kpi.trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(kpi.trend)}%
            </div>
          )}
        </div>
        <div className="space-y-1">
          <div className="text-3xl font-bold text-white tracking-tight">{kpi.formatted}</div>
          <div className="text-sm text-gray-400">{kpi.name}</div>
          <div className="text-xs text-gray-500">{kpi.unit}</div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Component: Chart Card ───────────────────────────────────────────────────
function ChartCard({ title, subtitle, children, className = '' }: { 
  title: string; 
  subtitle?: string;
  children: React.ReactNode; 
  className?: string;
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gray-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 ${className}`}
    >
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        {subtitle && <p className="text-sm text-gray-400 mt-1">{subtitle}</p>}
      </div>
      {children}
    </motion.div>
  );
}

// ─── Component: Mini Stat ────────────────────────────────────────────────────
function MiniStat({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: string }) {
  return (
    <div className="flex items-center gap-3 p-4 bg-gray-800/50 rounded-xl">
      <div className={`p-2 rounded-lg`} style={{ backgroundColor: `${color}20` }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div>
        <div className="text-lg font-semibold text-white">{value}</div>
        <div className="text-xs text-gray-400">{label}</div>
      </div>
    </div>
  );
}

// ─── Component: Dynamic Chart Renderer (for AI-generated charts) ────────────
function DynamicChartRenderer({ chartData }: { chartData: any }) {
  const CHART_COLORS = ['#4F46E5', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];
  
  if (!chartData) return <div className="text-gray-400 text-sm">No chart data</div>;
  
  const chartType = chartData.chartType || chartData.type || 'bar';
  
  // Transform data for Recharts
  let rechartsData: any[] = [];
  let dataKeys: string[] = ['value'];
  let xAxisKey = 'name';
  
  // Handle our backend format: { data: [...], xKey, yKeys }
  if (chartData.data && Array.isArray(chartData.data) && chartData.xKey && chartData.yKeys) {
    rechartsData = chartData.data;
    xAxisKey = chartData.xKey;
    dataKeys = chartData.yKeys;
  } else if (chartData.labels && chartData.datasets) {
    // Format: { labels: [...], datasets: [{ name, values: [...] }] }
    rechartsData = chartData.labels.map((label: string, i: number) => {
      const point: any = { name: label };
      chartData.datasets.forEach((ds: any, j: number) => {
        const key = ds.name || `series${j}`;
        point[key] = ds.values?.[i] ?? 0;
      });
      return point;
    });
    dataKeys = chartData.datasets.map((ds: any, j: number) => ds.name || `series${j}`);
  } else if (chartData.data && Array.isArray(chartData.data)) {
    // Format: { data: [{ name, value, ... }] }
    rechartsData = chartData.data;
    if (rechartsData.length > 0) {
      dataKeys = Object.keys(rechartsData[0]).filter(k => k !== 'name' && typeof rechartsData[0][k] === 'number');
    }
  }
  
  if (rechartsData.length === 0) {
    return <div className="text-gray-400 text-sm p-4">Unable to render chart data</div>;
  }
  
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        {chartType === 'pie' ? (
          <PieChart>
            <Pie
              data={rechartsData}
              dataKey={dataKeys[0] || 'value'}
              nameKey={xAxisKey}
              cx="50%"
              cy="50%"
              outerRadius={90}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            >
              {rechartsData.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ background: '#1f2937', border: 'none', borderRadius: '8px' }} />
            <Legend />
          </PieChart>
        ) : chartType === 'line' ? (
          <LineChart data={rechartsData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey={xAxisKey} stroke="#9CA3AF" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
            <YAxis stroke="#9CA3AF" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
            <Tooltip contentStyle={{ background: '#1f2937', border: 'none', borderRadius: '8px' }} />
            <Legend />
            {dataKeys.map((key, i) => (
              <Line key={key} type="monotone" dataKey={key} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={{ r: 4 }} />
            ))}
          </LineChart>
        ) : chartType === 'area' ? (
          <AreaChart data={rechartsData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey={xAxisKey} stroke="#9CA3AF" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
            <YAxis stroke="#9CA3AF" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
            <Tooltip contentStyle={{ background: '#1f2937', border: 'none', borderRadius: '8px' }} />
            <Legend />
            {dataKeys.map((key, i) => (
              <Area key={key} type="monotone" dataKey={key} fill={CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={0.3} stroke={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </AreaChart>
        ) : (
          <BarChart data={rechartsData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey={xAxisKey} stroke="#9CA3AF" tick={{ fill: '#9CA3AF', fontSize: 11 }} angle={-45} textAnchor="end" height={80} />
            <YAxis stroke="#9CA3AF" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
            <Tooltip contentStyle={{ background: '#1f2937', border: 'none', borderRadius: '8px' }} />
            <Legend />
            {dataKeys.map((key, i) => (
              <Bar key={key} dataKey={key} fill={CHART_COLORS[i % CHART_COLORS.length]} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

// ─── Component: Artifact Renderer ────────────────────────────────────────────
function ArtifactRenderer({ artifact }: { artifact: any }) {
  if (!artifact) return null;
  
  const CHART_COLORS = ['#4F46E5', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];
  
  if (artifact.type === 'chart') {
    // Our backend format: { type, chartType, title, data: [...], xKey, yKeys }
    const chartType = artifact.chartType || 'bar';
    const title = artifact.title || 'Generated Chart';
    const xKey = artifact.xKey || 'name';
    const yKeys = artifact.yKeys || [];
    
    // Get data array directly from artifact.data
    let rechartsData: any[] = [];
    if (Array.isArray(artifact.data)) {
      rechartsData = artifact.data;
    }
    
    // Auto-detect yKeys if not provided
    let dataKeys = yKeys;
    if (dataKeys.length === 0 && rechartsData.length > 0) {
      dataKeys = Object.keys(rechartsData[0]).filter(k => k !== xKey && typeof rechartsData[0][k] === 'number');
    }
    
    if (rechartsData.length === 0) {
      return <div className="text-gray-400 text-sm p-4">No chart data available</div>;
    }
    
    return (
      <div className="bg-gray-900 rounded-xl p-4 mt-2">
        <h4 className="text-sm font-semibold text-white mb-3">{title}</h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'pie' ? (
              <PieChart>
                <Pie
                  data={rechartsData}
                  dataKey={dataKeys[0] || 'value'}
                  nameKey={xKey}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {rechartsData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#1f2937', border: 'none', borderRadius: '8px' }} />
              </PieChart>
            ) : chartType === 'line' ? (
              <LineChart data={rechartsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey={xKey} stroke="#9CA3AF" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                <YAxis stroke="#9CA3AF" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#1f2937', border: 'none', borderRadius: '8px' }} />
                <Legend />
                {dataKeys.map((key: string, i: number) => (
                  <Line key={key} type="monotone" dataKey={key} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={{ r: 4 }} />
                ))}
              </LineChart>
            ) : chartType === 'area' ? (
              <AreaChart data={rechartsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey={xKey} stroke="#9CA3AF" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                <YAxis stroke="#9CA3AF" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#1f2937', border: 'none', borderRadius: '8px' }} />
                <Legend />
                {dataKeys.map((key: string, i: number) => (
                  <Area key={key} type="monotone" dataKey={key} fill={CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={0.3} stroke={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </AreaChart>
            ) : (
              <BarChart data={rechartsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey={xKey} stroke="#9CA3AF" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                <YAxis stroke="#9CA3AF" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#1f2937', border: 'none', borderRadius: '8px' }} />
                <Legend />
                {dataKeys.map((key: string, i: number) => (
                  <Bar key={key} dataKey={key} fill={CHART_COLORS[i % CHART_COLORS.length]} radius={[4, 4, 0, 0]} />
                ))}
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
    );
  }
  
  if (artifact.type === 'table' && artifact.data) {
    const tableData = artifact.data;
    if (!tableData.length) return null;
    const columns = Object.keys(tableData[0]);
    
    return (
      <div className="bg-gray-900 rounded-xl p-4 mt-2 overflow-x-auto">
        <h4 className="text-sm font-semibold text-white mb-3">Data Table</h4>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-700">
              {columns.map(col => (
                <th key={col} className="text-left py-2 px-2 text-gray-400 font-medium">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableData.slice(0, 10).map((row: any, i: number) => (
              <tr key={i} className="border-b border-gray-800 hover:bg-gray-800/50">
                {columns.map(col => (
                  <td key={col} className="py-2 px-2 text-gray-300">{String(row[col] ?? '')}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {tableData.length > 10 && (
          <p className="text-xs text-gray-500 mt-2">Showing 10 of {tableData.length} rows</p>
        )}
      </div>
    );
  }
  
  if (artifact.type === 'metrics' && artifact.data) {
    const metrics = artifact.data;
    return (
      <div className="bg-gray-900 rounded-xl p-4 mt-2">
        <h4 className="text-sm font-semibold text-white mb-3">Computed Metrics</h4>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(metrics).map(([key, value]) => (
            <div key={key} className="bg-gray-800/50 rounded-lg p-3">
              <div className="text-lg font-bold text-white">{String(value)}</div>
              <div className="text-xs text-gray-400">{key.replace(/_/g, ' ')}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  // Handle image artifacts (base64 encoded matplotlib figures)
  if ((artifact.type === 'image' || artifact.type === 'figure') && artifact.data) {
    return (
      <div className="bg-gray-900 rounded-xl p-4 mt-2">
        <h4 className="text-sm font-semibold text-white mb-3">{artifact.name || 'Generated Chart'}</h4>
        <img 
          src={`data:image/png;base64,${artifact.data}`}
          alt={artifact.name || 'Chart'}
          className="max-w-full rounded-lg"
        />
      </div>
    );
  }
  
  return (
    <div className="bg-gray-900/50 rounded-lg p-3 mt-2">
      <span className="text-xs text-indigo-400 font-medium">📊 Analysis Complete</span>
    </div>
  );
}

// ─── Component: Chat Panel ───────────────────────────────────────────────────
function ChatPanel({ 
  isOpen, 
  onClose, 
  onAddChart 
}: { 
  isOpen: boolean; 
  onClose: () => void;
  onAddChart?: (chart: DynamicChart) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    
    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, session_id: sessionId }),
      });
      
      if (!res.ok) throw new Error('API error');
      
      const data = await res.json();
      setSessionId(data.session_id);
      
      // Extract chart artifacts and add them to Analytics tab
      if (data.artifacts && onAddChart) {
        data.artifacts.forEach((artifact: any) => {
          if (artifact.type === 'chart') {
            onAddChart({
              id: `chart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              title: artifact.title || artifact.name || 'Agent Generated Chart',
              type: artifact.chartType || artifact.type || 'bar',
              data: artifact,  // Pass the whole artifact as data
              createdAt: new Date()
            });
          }
        });
      }
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: data.response,
        artifacts: data.artifacts 
      }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '⚠️ Sorry, I couldn\'t process your request. Please make sure the backend server is running on port 8000.' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    "What's the overall publish rate?",
    "Which channel has the highest volume?",
    "Analyze monthly trends",
    "Show output type breakdown",
    "Why do some channels have 0% publish?",
    "Compare H1 vs H2 performance",
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          />
          
          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-gray-950 border-l border-white/10 z-50 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="p-5 border-b border-white/10 bg-gradient-to-r from-indigo-600/10 to-purple-600/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">AI Data Analyst</h2>
                    <p className="text-xs text-gray-400">Powered by Groq LLaMA</p>
                  </div>
                </div>
                <button 
                  onClick={onClose} 
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-4">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center mb-6">
                    <MessageSquare className="w-10 h-10 text-indigo-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">Start a Conversation</h3>
                  <p className="text-gray-400 text-sm mb-8 max-w-xs">
                    Ask me to analyze your data, create visualizations, explain trends, or generate new insights.
                  </p>
                  <div className="w-full space-y-2">
                    {suggestions.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => setInput(s)}
                        className="w-full text-left px-4 py-3 bg-gray-800/50 hover:bg-gray-800 border border-white/5 hover:border-indigo-500/30 rounded-xl text-sm text-gray-300 hover:text-white transition-all duration-200"
                      >
                        <ChevronRight className="w-4 h-4 inline mr-2 text-indigo-400" />
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      msg.role === 'user' 
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white' 
                        : 'bg-gray-800/80 border border-white/10 text-gray-100'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      {msg.artifacts && msg.artifacts.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-white/10 space-y-3">
                          {msg.artifacts.map((art, j) => (
                            <ArtifactRenderer key={j} artifact={art} />
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
              {loading && (
                <div className="flex items-center gap-2 text-gray-400 px-4">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" />
                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0.15s' }} />
                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0.3s' }} />
                  </div>
                  <span className="text-sm">Analyzing...</span>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-5 border-t border-white/10 bg-gray-900/50">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder="Ask about your data..."
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
                <button
                  onClick={sendMessage}
                  disabled={loading || !input.trim()}
                  className="px-5 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30"
                >
                  Send
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Component: Data Explorer ────────────────────────────────────────────────
function DataExplorerTab() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<number | null>(null);
  const [sampleData, setSampleData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/datasets`)
      .then(res => res.json())
      .then(data => {
        setDatasets(data.datasets || []);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        // Mock data for demo
        setDatasets([
          { id: 1, name: 'channel_summary', row_count: 18, col_count: 7, description: 'Channel-level aggregates' },
          { id: 2, name: 'monthly_counts', row_count: 12, col_count: 4, description: 'Monthly upload/process/publish counts' },
          { id: 3, name: 'user_summary', row_count: 45, col_count: 7, description: 'User-level statistics' },
          { id: 4, name: 'output_type', row_count: 5, col_count: 7, description: 'Output type breakdown' },
          { id: 5, name: 'input_type', row_count: 12, col_count: 7, description: 'Input type breakdown' },
          { id: 6, name: 'language', row_count: 6, col_count: 7, description: 'Language distribution' },
        ]);
      });
  }, []);

  const loadSample = async (id: number) => {
    setSelectedDataset(id);
    try {
      const res = await fetch(`${API_BASE}/datasets/${id}/sample?limit=20`);
      const data = await res.json();
      setColumns(data.columns || []);
      setSampleData(data.data || []);
    } catch (e) {
      // Mock sample for demo
      setColumns(['Channel', 'Uploaded', 'Processed', 'Published']);
      setSampleData([
        { Channel: 'A', Uploaded: 1470, Processed: 4725, Published: 71 },
        { Channel: 'B', Uploaded: 1293, Processed: 4251, Published: 19 },
        { Channel: 'C', Uploaded: 765, Processed: 2631, Published: 14 },
      ]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Data Explorer</h2>
          <p className="text-gray-400 mt-1">Browse and preview registered datasets</p>
        </div>
        <div className="text-sm text-gray-400 bg-gray-800/50 px-4 py-2 rounded-lg">
          {datasets.length} datasets available
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {datasets.map((ds) => (
          <motion.button
            key={ds.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => loadSample(ds.id)}
            className={`p-5 rounded-xl border text-left transition-all ${
              selectedDataset === ds.id 
                ? 'bg-indigo-600/20 border-indigo-500 shadow-lg shadow-indigo-500/10' 
                : 'bg-gray-900/50 border-white/10 hover:border-indigo-500/50 hover:bg-gray-800/50'
            }`}
          >
            <Database className={`w-6 h-6 mb-3 ${selectedDataset === ds.id ? 'text-indigo-400' : 'text-gray-400'}`} />
            <div className="text-white font-semibold">{ds.name}</div>
            <div className="text-xs text-gray-400 mt-1">{ds.description}</div>
            <div className="flex gap-3 mt-3 text-xs text-gray-500">
              <span>{ds.row_count} rows</span>
              <span>{ds.col_count} cols</span>
            </div>
          </motion.button>
        ))}
      </div>

      {selectedDataset && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-900/50 border border-white/10 rounded-xl overflow-hidden"
        >
          <div className="p-4 border-b border-white/10 bg-gray-800/30">
            <h3 className="text-white font-medium">Sample Data Preview</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-800/50">
                <tr>
                  {columns.map((col) => (
                    <th key={col} className="px-4 py-3 text-left text-gray-400 font-medium whitespace-nowrap">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sampleData.slice(0, 10).map((row, i) => (
                  <tr key={i} className="border-t border-white/5 hover:bg-gray-800/30 transition-colors">
                    {columns.map((col) => (
                      <td key={col} className="px-4 py-3 text-gray-300 truncate max-w-[200px]">
                        {String(row[col] ?? '-')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────
export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [chatOpen, setChatOpen] = useState(false);
  const [apiConnected, setApiConnected] = useState(false);
  const [dynamicCharts, setDynamicCharts] = useState<DynamicChart[]>([]);

  // Load analytics data from pipeline JSON (falls back to hardcoded if not found)
  const { EXECUTIVE_KPIS, DURATION_KPIS, ENTITY_KPIS, MONTHLY_DATA, CHANNEL_DATA,
          OUTPUT_TYPE_DATA, INPUT_TYPE_DATA, FUNNEL_DATA, PLATFORM_DATA, dataSource } = useAnalyticsDashboard();

  useEffect(() => {
    fetch(`${API_BASE}/health`)
      .then(res => res.ok && setApiConnected(true))
      .catch(() => setApiConnected(false));
  }, []);

  const addDynamicChart = (chart: DynamicChart) => {
    setDynamicCharts(prev => [chart, ...prev]);
    // Switch to Analytics tab to show the new chart
    setActiveTab('analytics');
  };

  const removeDynamicChart = (chartId: string) => {
    setDynamicCharts(prev => prev.filter(c => c.id !== chartId));
  };

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: TrendingUp },
    { id: 'analytics' as const, label: 'Analytics', icon: BarChart3, badge: dynamicCharts.length > 0 ? dynamicCharts.length : undefined },
    { id: 'data' as const, label: 'Data Explorer', icon: Database },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] bg-gradient-to-br from-gray-950 via-gray-900 to-indigo-950/30">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-gray-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Frammer Analytics</h1>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-400">Mar 2025 – Feb 2026</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                  apiConnected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}>
                  {apiConnected ? '● Connected' : '○ Offline'}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1 bg-gray-800/50 rounded-xl p-1.5">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.id 
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.badge && (
                  <span className="ml-1 px-1.5 py-0.5 bg-green-500 text-white text-[10px] font-bold rounded-full animate-pulse">
                    +{tab.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* AI Assistant Button */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setChatOpen(!chatOpen)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all duration-300 ${
              chatOpen 
                ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40'
            }`}
          >
            {chatOpen ? <X className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
            {chatOpen ? 'Close' : 'AI Assistant'}
          </motion.button>
        </div>
      </header>

      {/* Main Content */}
      <main className={`pt-24 pb-12 transition-all duration-300 ${chatOpen ? 'lg:mr-[420px]' : ''}`}>
        <div className="max-w-7xl mx-auto px-6">
          <AnimatePresence mode="wait">
            {/* ═══ OVERVIEW TAB ═══ */}
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-8"
              >
                {/* Hero Section */}
                <div className="text-center mb-10">
                  <motion.h2 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-4xl font-bold text-white mb-3"
                  >
                    Executive Dashboard
                  </motion.h2>
                  <p className="text-gray-400 max-w-2xl mx-auto">
                    Real-time analytics for Frammer AI media publishing platform — 
                    tracking upload, processing, and publishing metrics across 18 channels and 45 users.
                  </p>
                </div>

                {/* Primary KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {EXECUTIVE_KPIS.map((kpi, i) => (
                    <KPICard key={kpi.id} kpi={kpi} index={i} />
                  ))}
                </div>

                {/* Charts Row 1 */}
                <div className="grid lg:grid-cols-2 gap-6">
                  <ChartCard title="Upload → Process → Publish Funnel" subtitle="Video conversion pipeline">
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={FUNNEL_DATA} layout="vertical" margin={{ left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
                        <XAxis type="number" stroke="#6b7280" tickFormatter={(v) => v.toLocaleString()} />
                        <YAxis type="category" dataKey="stage" stroke="#6b7280" width={80} />
                        <Tooltip 
                          contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                          labelStyle={{ color: '#fff' }}
                          formatter={(value: number) => [value.toLocaleString(), 'Count']}
                        />
                        <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                          {FUNNEL_DATA.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>

                  <ChartCard title="Output Type Distribution" subtitle="Content format breakdown">
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={OUTPUT_TYPE_DATA}
                          cx="50%"
                          cy="50%"
                          innerRadius={70}
                          outerRadius={110}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {OUTPUT_TYPE_DATA.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                          formatter={(value: number) => [value.toLocaleString(), 'Count']}
                        />
                        <Legend 
                          verticalAlign="middle" 
                          align="right"
                          layout="vertical"
                          wrapperStyle={{ paddingLeft: '20px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartCard>
                </div>

                {/* Duration & Entity Stats */}
                <div className="grid md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {DURATION_KPIS.map((kpi, i) => (
                    <MiniStat key={i} label={kpi.name} value={kpi.formatted + ' ' + kpi.unit} icon={kpi.icon} color="#4F46E5" />
                  ))}
                  {ENTITY_KPIS.map((kpi, i) => (
                    <MiniStat key={i} label={kpi.name} value={kpi.value} icon={kpi.icon} color={kpi.color} />
                  ))}
                </div>
              </motion.div>
            )}

            {/* ═══ ANALYTICS TAB ═══ */}
            {activeTab === 'analytics' && (
              <motion.div
                key="analytics"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white">Detailed Analytics</h2>
                  <p className="text-gray-400 text-sm">Interactive charts powered by Recharts</p>
                </div>

                {/* Dynamic Charts from AI Agent */}
                {dynamicCharts.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-indigo-400" />
                        AI Generated Charts
                      </h3>
                      <span className="text-xs text-gray-400">{dynamicCharts.length} chart(s)</span>
                    </div>
                    <div className="grid lg:grid-cols-2 gap-6">
                      {dynamicCharts.map((chart) => (
                        <motion.div
                          key={chart.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="relative"
                        >
                          <button
                            onClick={() => removeDynamicChart(chart.id)}
                            className="absolute top-2 right-2 z-10 p-1.5 bg-red-500/20 hover:bg-red-500/40 rounded-lg transition-colors"
                          >
                            <X className="w-4 h-4 text-red-400" />
                          </button>
                          <ChartCard 
                            title={chart.title} 
                            subtitle={`Generated ${chart.createdAt.toLocaleTimeString()}`}
                          >
                            <DynamicChartRenderer chartData={chart.data} />
                          </ChartCard>
                        </motion.div>
                      ))}
                    </div>
                    <div className="border-b border-white/10 my-6" />
                  </div>
                )}

                {/* Monthly Trends */}
                <ChartCard title="Monthly Volume Trends" subtitle="Upload, Process, Publish over 12 months">
                  <ResponsiveContainer width="100%" height={350}>
                    <ComposedChart data={MONTHLY_DATA}>
                      <defs>
                        <linearGradient id="colorUploaded" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#06B6D4" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                      <XAxis dataKey="month" stroke="#6b7280" />
                      <YAxis yAxisId="left" stroke="#6b7280" />
                      <YAxis yAxisId="right" orientation="right" stroke="#10B981" />
                      <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }} />
                      <Legend />
                      <Area yAxisId="left" type="monotone" dataKey="uploaded" stroke="#4F46E5" fill="url(#colorUploaded)" name="Uploaded" />
                      <Area yAxisId="left" type="monotone" dataKey="created" stroke="#06B6D4" fill="url(#colorCreated)" name="Processed" />
                      <Line yAxisId="right" type="monotone" dataKey="published" stroke="#10B981" strokeWidth={3} dot={{ fill: '#10B981', r: 4 }} name="Published" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </ChartCard>

                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Channel Performance */}
                  <ChartCard title="Top Channels by Volume" subtitle="Upload vs Publish comparison">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={CHANNEL_DATA}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                        <XAxis dataKey="name" stroke="#6b7280" />
                        <YAxis stroke="#6b7280" />
                        <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }} />
                        <Legend />
                        <Bar dataKey="uploaded" fill="#4F46E5" name="Uploaded" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="published" fill="#10B981" name="Published" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>

                  {/* Publish Rate by Channel */}
                  <ChartCard title="Channel Publish Rates" subtitle="Conversion efficiency by channel">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={CHANNEL_DATA} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
                        <XAxis type="number" stroke="#6b7280" unit="%" />
                        <YAxis type="category" dataKey="name" stroke="#6b7280" width={90} />
                        <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }} />
                        <Bar dataKey="rate" fill="#10B981" radius={[0, 4, 4, 0]} name="Publish Rate %" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                </div>

                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Input Types */}
                  <ChartCard title="Input Type Distribution" subtitle="Source of video uploads">
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={INPUT_TYPE_DATA}
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {INPUT_TYPE_DATA.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartCard>

                  {/* Monthly Publish Rate Trend */}
                  <ChartCard title="Monthly Publish Rate Trend" subtitle="Conversion rate over time">
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart data={MONTHLY_DATA}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                        <XAxis dataKey="month" stroke="#6b7280" />
                        <YAxis stroke="#6b7280" unit="%" />
                        <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }} />
                        <Line 
                          type="monotone" 
                          dataKey="publishRate" 
                          stroke="#F59E0B" 
                          strokeWidth={3}
                          dot={{ fill: '#F59E0B', r: 5 }}
                          name="Publish Rate %"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartCard>
                </div>
              </motion.div>
            )}

            {/* ═══ DATA TAB ═══ */}
            {activeTab === 'data' && (
              <motion.div
                key="data"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <DataExplorerTab />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Chat Panel */}
      <ChatPanel isOpen={chatOpen} onClose={() => setChatOpen(false)} onAddChart={addDynamicChart} />
    </div>
  );
}
