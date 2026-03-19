'use client';

import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Zap, 
  Database,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';

interface SidebarProps {
  apiStatus: 'connected' | 'disconnected' | 'checking';
}

export default function Sidebar({ apiStatus }: SidebarProps) {
  const statusConfig = {
    connected: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-400/10', label: 'API Connected' },
    disconnected: { icon: XCircle, color: 'text-rose-400', bg: 'bg-rose-400/10', label: 'API Offline' },
    checking: { icon: Loader2, color: 'text-amber-400', bg: 'bg-amber-400/10', label: 'Checking...' },
  };

  const status = statusConfig[apiStatus];
  const StatusIcon = status.icon;

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 glass-dark border-r border-white/5 z-50">
      <div className="flex flex-col h-full p-6">
        {/* Logo */}
        <div className="mb-8">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-brand-500/25">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold gradient-text">Frammer AI</h1>
              <p className="text-xs text-gray-500">Analytics Dashboard</p>
            </div>
          </motion.div>
        </div>

        {/* Navigation Info */}
        <div className="space-y-4 flex-1">
          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-3 text-gray-400 mb-3">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">Analysis Period</span>
            </div>
            <p className="text-white font-semibold">Mar 2025 – Feb 2026</p>
            <p className="text-xs text-gray-500 mt-1">12 months of data</p>
          </div>

          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-3 text-gray-400 mb-3">
              <Database className="w-4 h-4" />
              <span className="text-sm font-medium">Data Sources</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Datasets</span>
                <span className="text-white font-semibold">11</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Charts</span>
                <span className="text-white font-semibold">18</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Records</span>
                <span className="text-white font-semibold">14.9K</span>
              </div>
            </div>
          </div>

          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-3 text-gray-400 mb-3">
              <Activity className="w-4 h-4" />
              <span className="text-sm font-medium">Quick Stats</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Channels</span>
                <span className="text-white font-semibold">18</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Users</span>
                <span className="text-white font-semibold">45</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Platforms</span>
                <span className="text-white font-semibold">8</span>
              </div>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className={`rounded-xl p-4 ${status.bg}`}>
          <div className="flex items-center gap-3">
            <StatusIcon className={`w-5 h-5 ${status.color} ${apiStatus === 'checking' ? 'animate-spin' : ''}`} />
            <div>
              <p className={`text-sm font-medium ${status.color}`}>{status.label}</p>
              <p className="text-xs text-gray-500">Backend Server</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
