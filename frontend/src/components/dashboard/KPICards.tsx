'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  Upload, 
  Cog, 
  Send,
  Zap,
  Target
} from 'lucide-react';
import { fetchAPI, formatNumber, formatPercent } from '@/lib/utils';

interface KPI {
  name: string;
  value: number;
  formatted: string;
  category: string;
  description?: string;
}

interface ChartData {
  name: string;
  filename: string;
  path: string;
}

export default function KPICards() {
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [featuredCharts, setFeaturedCharts] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Try API first
      const data = await fetchAPI<{ metrics: KPI[] }>('/metrics');
      setKpis(data.metrics);
    } catch {
      // Fallback to hardcoded values based on notebook analysis
      setKpis([
        { name: 'Total Uploaded', value: 5765, formatted: '5,765', category: 'volume' },
        { name: 'Total Processed', value: 14918, formatted: '14,918', category: 'volume' },
        { name: 'Total Published', value: 111, formatted: '111', category: 'volume' },
        { name: 'Publish Rate', value: 0.74, formatted: '0.74%', category: 'conversion' },
        { name: 'Amplification', value: 2.59, formatted: '2.59x', category: 'efficiency' },
      ]);
    }
    
    setFeaturedCharts([
      'kpi_summary.png',
      'funnel_by_channel.png',
      'monthly_trends.png'
    ]);
    
    setLoading(false);
  };

  const kpiConfig: Record<string, { icon: any; gradient: string; shadowColor: string }> = {
    'Total Uploaded': { 
      icon: Upload, 
      gradient: 'from-blue-500 to-cyan-500',
      shadowColor: 'shadow-blue-500/25'
    },
    'Total Processed': { 
      icon: Cog, 
      gradient: 'from-violet-500 to-purple-500',
      shadowColor: 'shadow-violet-500/25'
    },
    'Total Published': { 
      icon: Send, 
      gradient: 'from-emerald-500 to-teal-500',
      shadowColor: 'shadow-emerald-500/25'
    },
    'Publish Rate': { 
      icon: Target, 
      gradient: 'from-amber-500 to-orange-500',
      shadowColor: 'shadow-amber-500/25'
    },
    'Amplification': { 
      icon: Zap, 
      gradient: 'from-rose-500 to-pink-500',
      shadowColor: 'shadow-rose-500/25'
    },
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-8">
        <div className="grid grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">Dashboard Overview</h2>
        <p className="text-gray-400">Key performance indicators for your media publishing pipeline</p>
      </div>

      {/* KPI Cards */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-5 gap-4"
      >
        {kpis.map((kpi) => {
          const config = kpiConfig[kpi.name] || { 
            icon: TrendingUp, 
            gradient: 'from-gray-500 to-gray-600',
            shadowColor: 'shadow-gray-500/25'
          };
          const Icon = config.icon;

          return (
            <motion.div
              key={kpi.name}
              variants={itemVariants}
              whileHover={{ scale: 1.02, y: -5 }}
              className={`
                relative overflow-hidden rounded-2xl p-6
                bg-gradient-to-br ${config.gradient}
                shadow-xl ${config.shadowColor}
                cursor-pointer transition-all duration-300
              `}
            >
              {/* Background decoration */}
              <div className="absolute top-0 right-0 w-20 h-20 opacity-20">
                <Icon className="w-full h-full" />
              </div>

              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 rounded-lg bg-white/20">
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-white mb-1">{kpi.formatted}</p>
                <p className="text-sm text-white/80">{kpi.name}</p>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Featured Charts */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-white">Key Visualizations</h3>
        <div className="grid grid-cols-2 gap-6">
          {featuredCharts.slice(0, 2).map((chart, index) => (
            <motion.div
              key={chart}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              className="glass rounded-2xl p-4 overflow-hidden"
            >
              <h4 className="text-lg font-medium text-white mb-3 capitalize">
                {chart.replace('.png', '').replace(/_/g, ' ')}
              </h4>
              <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-900/50">
                <img
                  src={`http://localhost:8000/charts/${chart}`}
                  alt={chart}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Third chart full width */}
        {featuredCharts[2] && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="glass rounded-2xl p-4"
          >
            <h4 className="text-lg font-medium text-white mb-3 capitalize">
              {featuredCharts[2].replace('.png', '').replace(/_/g, ' ')}
            </h4>
            <div className="relative aspect-[21/9] rounded-xl overflow-hidden bg-gray-900/50">
              <img
                src={`http://localhost:8000/charts/${featuredCharts[2]}`}
                alt={featuredCharts[2]}
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
