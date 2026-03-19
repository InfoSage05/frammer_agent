'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Image, 
  Grid, 
  List,
  Search,
  ZoomIn,
  X,
  Download
} from 'lucide-react';

interface Chart {
  name: string;
  filename: string;
  path: string;
  format: string;
}

interface ChartsByCategory {
  [category: string]: Chart[];
}

const CHART_CATEGORIES = {
  'Funnel Analysis': ['funnel_by_channel.png'],
  'Monthly Trends': ['monthly_trends.png', 'monthly_publish_rate.png', 'mom_growth.png'],
  'Channel Analysis': ['channel_duration.png', 'channel_performance_score.png', 'channel_platform_counts.png', 'channel_quadrant.png'],
  'User Analysis': ['user_analysis.png', 'user_scatter.png', 'heatmap_channel_user.png', 'heatmap_channel_user_pr.png'],
  'Output & Input Mix': ['output_type_mix.png', 'input_type_mix.png'],
  'Language & Platform': ['language_analysis.png', 'platform_distribution.png'],
  'Duration Analytics': ['duration_analytics.png', 'h1_vs_h2.png'],
  'Data Quality': ['data_quality_dashboard.png', 'dq_audit.png', 'correlation_anomaly.png'],
  'KPI Summary': ['kpi_summary.png']
};

export default function ChartGallery() {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [lightboxChart, setLightboxChart] = useState<string | null>(null);
  const [availableCharts, setAvailableCharts] = useState<string[]>([]);

  useEffect(() => {
    // Get all chart filenames
    const allCharts = Object.values(CHART_CATEGORIES).flat();
    setAvailableCharts(allCharts);
  }, []);

  const categories = ['All', ...Object.keys(CHART_CATEGORIES)];

  const getFilteredCharts = () => {
    let charts: string[] = [];
    
    if (selectedCategory === 'All') {
      charts = availableCharts;
    } else {
      charts = CHART_CATEGORIES[selectedCategory as keyof typeof CHART_CATEGORIES] || [];
    }

    if (searchQuery) {
      charts = charts.filter(c => 
        c.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return charts;
  };

  const filteredCharts = getFilteredCharts();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Charts Gallery</h2>
          <p className="text-gray-400">Explore all analysis visualizations</p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search charts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 w-64"
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-brand-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-brand-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`
              px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
              ${selectedCategory === category
                ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/25'
                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
              }
            `}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Charts Grid/List */}
      <motion.div 
        layout
        className={viewMode === 'grid' ? 'grid grid-cols-3 gap-6' : 'space-y-4'}
      >
        {filteredCharts.map((chart, index) => (
          <motion.div
            key={chart}
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.02 }}
            className={`
              glass rounded-2xl overflow-hidden cursor-pointer group
              ${viewMode === 'list' ? 'flex items-center gap-4 p-4' : ''}
            `}
            onClick={() => setLightboxChart(chart)}
          >
            <div className={`relative ${viewMode === 'grid' ? 'aspect-video' : 'w-48 h-28 flex-shrink-0'} bg-gray-900/50 overflow-hidden`}>
              <img
                src={`http://localhost:8000/charts/${chart}`}
                alt={chart}
                className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder-chart.svg';
                }}
              />
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <ZoomIn className="w-8 h-8 text-white" />
              </div>
            </div>
            
            <div className={viewMode === 'grid' ? 'p-4' : 'flex-1'}>
              <h3 className="text-white font-medium capitalize">
                {chart.replace('.png', '').replace(/_/g, ' ')}
              </h3>
              {viewMode === 'list' && (
                <p className="text-sm text-gray-400 mt-1">
                  Click to view full size
                </p>
              )}
            </div>
          </motion.div>
        ))}
      </motion.div>

      {filteredCharts.length === 0 && (
        <div className="text-center py-12">
          <Image className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No charts found matching your criteria</p>
        </div>
      )}

      {/* Lightbox */}
      {lightboxChart && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-8"
          onClick={() => setLightboxChart(null)}
        >
          <button
            className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            onClick={() => setLightboxChart(null)}
          >
            <X className="w-6 h-6" />
          </button>
          
          <motion.img
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            src={`http://localhost:8000/charts/${lightboxChart}`}
            alt={lightboxChart}
            className="max-w-full max-h-full object-contain rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
          
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4">
            <a
              href={`http://localhost:8000/charts/${lightboxChart}`}
              download
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 text-white hover:bg-brand-500 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Download className="w-4 h-4" />
              Download
            </a>
          </div>
        </motion.div>
      )}
    </div>
  );
}
