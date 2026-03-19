'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Database, 
  Table, 
  Columns,
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
  Eye,
  FileSpreadsheet
} from 'lucide-react';
import { fetchAPI } from '@/lib/utils';

interface Dataset {
  id: number;
  name: string;
  file_path: string;
  file_type: string;
  row_count: number;
  col_count: number;
  description: string;
}

interface Column {
  name: string;
  dtype: string;
  semantic_type: string;
  null_rate: number;
  distinct_count: number;
  top_values: string[];
}

interface DatasetDetails extends Dataset {
  columns: Column[];
}

export default function DataExplorer() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<DatasetDetails | null>(null);
  const [sampleData, setSampleData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const pageSize = 15;

  useEffect(() => {
    loadDatasets();
  }, []);

  const loadDatasets = async () => {
    try {
      const data = await fetchAPI<{ datasets: Dataset[] }>('/datasets');
      setDatasets(data.datasets);
    } catch {
      // Fallback mock data
      setDatasets([
        { id: 1, name: 'CLIENT 1 combined_data(2025-3-1-2026-2-28)', file_path: '', file_type: '.csv', row_count: 18, col_count: 7, description: 'Channel-level summary data' },
        { id: 2, name: 'combined_data by channel and user', file_path: '', file_type: '.csv', row_count: 236, col_count: 8, description: 'User activity by channel' },
        { id: 3, name: 'video_list_data_obfuscated', file_path: '', file_type: '.csv', row_count: 14918, col_count: 9, description: 'Raw video processing records' },
      ]);
    }
    setLoading(false);
  };

  const selectDataset = async (dataset: Dataset) => {
    try {
      const details = await fetchAPI<DatasetDetails>(`/datasets/${dataset.id}`);
      setSelectedDataset(details);
      
      const sample = await fetchAPI<{ data: any[] }>(`/datasets/${dataset.id}/sample?limit=${pageSize}`);
      setSampleData(sample.data);
    } catch {
      // Fallback
      setSelectedDataset({
        ...dataset,
        columns: [
          { name: 'Channel', dtype: 'object', semantic_type: 'categorical', null_rate: 0, distinct_count: 18, top_values: ['A', 'B', 'C'] },
          { name: 'Uploaded Count', dtype: 'int64', semantic_type: 'metric', null_rate: 0, distinct_count: 15, top_values: [] },
          { name: 'Published Count', dtype: 'int64', semantic_type: 'metric', null_rate: 0, distinct_count: 10, top_values: [] },
        ]
      });
      setSampleData([]);
    }
    setPage(1);
  };

  const filteredDatasets = datasets.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'metric': 'bg-emerald-500/20 text-emerald-400',
      'categorical': 'bg-blue-500/20 text-blue-400',
      'temporal': 'bg-amber-500/20 text-amber-400',
      'identifier': 'bg-purple-500/20 text-purple-400',
      'text': 'bg-gray-500/20 text-gray-400',
      'numeric': 'bg-cyan-500/20 text-cyan-400',
    };
    return colors[type] || 'bg-gray-500/20 text-gray-400';
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-white/5" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Data Explorer</h2>
          <p className="text-gray-400">Browse and inspect your datasets</p>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search datasets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 w-64"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Dataset List */}
        <div className="col-span-1 space-y-3">
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Datasets</h3>
          <div className="space-y-2">
            {filteredDatasets.map((dataset) => (
              <motion.button
                key={dataset.id}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => selectDataset(dataset)}
                className={`
                  w-full text-left p-4 rounded-xl transition-all duration-200
                  ${selectedDataset?.id === dataset.id
                    ? 'bg-brand-600/20 border border-brand-500/50'
                    : 'glass hover:bg-white/10'
                  }
                `}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-brand-600/20">
                    <FileSpreadsheet className="w-4 h-4 text-brand-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{dataset.name}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      <span>{dataset.row_count.toLocaleString()} rows</span>
                      <span>•</span>
                      <span>{dataset.col_count} cols</span>
                    </div>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Dataset Details */}
        <div className="col-span-2">
          {selectedDataset ? (
            <div className="space-y-6">
              {/* Dataset Info */}
              <div className="glass rounded-2xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white">{selectedDataset.name}</h3>
                    <p className="text-gray-400 mt-1">{selectedDataset.description}</p>
                  </div>
                  <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 text-white hover:bg-brand-500 transition-colors">
                    <Download className="w-4 h-4" />
                    Export
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-white/5">
                    <p className="text-gray-400 text-sm">Rows</p>
                    <p className="text-2xl font-bold text-white">{selectedDataset.row_count.toLocaleString()}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5">
                    <p className="text-gray-400 text-sm">Columns</p>
                    <p className="text-2xl font-bold text-white">{selectedDataset.col_count}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5">
                    <p className="text-gray-400 text-sm">Type</p>
                    <p className="text-2xl font-bold text-white">{selectedDataset.file_type}</p>
                  </div>
                </div>
              </div>

              {/* Schema */}
              <div className="glass rounded-2xl p-6">
                <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Columns className="w-5 h-5 text-brand-400" />
                  Schema
                </h4>
                <div className="space-y-2">
                  {selectedDataset.columns.map((col) => (
                    <div 
                      key={col.name}
                      className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-white font-medium">{col.name}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${getTypeColor(col.semantic_type)}`}>
                          {col.semantic_type}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span>{col.dtype}</span>
                        <span>{col.distinct_count} unique</span>
                        {col.null_rate > 0 && (
                          <span className="text-amber-400">{(col.null_rate * 100).toFixed(1)}% null</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sample Data */}
              {sampleData.length > 0 && (
                <div className="glass rounded-2xl p-6">
                  <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Eye className="w-5 h-5 text-brand-400" />
                    Data Preview
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/10">
                          {Object.keys(sampleData[0]).map((key) => (
                            <th key={key} className="text-left p-3 text-sm font-medium text-gray-400">
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sampleData.map((row, i) => (
                          <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                            {Object.values(row).map((val, j) => (
                              <td key={j} className="p-3 text-sm text-gray-300 truncate max-w-[200px]">
                                {String(val)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="glass rounded-2xl p-12 text-center">
              <Database className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Select a Dataset</h3>
              <p className="text-gray-400">Choose a dataset from the list to explore its structure and data</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
