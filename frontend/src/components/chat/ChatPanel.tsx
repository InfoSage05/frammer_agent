'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  X, 
  Send, 
  Sparkles, 
  User, 
  Bot,
  Loader2,
  Image as ImageIcon,
  Table,
  ChevronDown,
  RefreshCw,
  Trash2,
  Lightbulb,
  BarChart3
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { fetchAPI } from '@/lib/utils';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  artifacts?: Artifact[];
}

interface Artifact {
  type: 'image' | 'table' | 'plotly' | 'figure' | 'chart';
  name?: string;
  title?: string;
  data?: any;
  chartType?: string;
  xKey?: string;
  yKeys?: string[];
}

interface ChatPanelProps {
  onClose: () => void;
}

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#14b8a6'];

const QUICK_PROMPTS = [
  "What is the overall publish rate?",
  "Which channels have the highest volume?",
  "Show me monthly trends",
  "Compare top 5 users by output",
  "What datasets are available?",
];

// Chart renderer component
function ChartRenderer({ artifact }: { artifact: Artifact }) {
  const { chartType, title, data, xKey, yKeys } = artifact;
  
  if (!data || !Array.isArray(data) || data.length === 0) {
    return <div className="text-gray-400 text-sm p-4">No data to display</div>;
  }

  const renderChart = () => {
    switch (chartType) {
      case 'bar':
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey={xKey} stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 10 }} />
            <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 10 }} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
              labelStyle={{ color: '#fff' }}
            />
            <Legend />
            {yKeys?.map((key, i) => (
              <Bar key={key} dataKey={key} fill={COLORS[i % COLORS.length]} />
            ))}
          </BarChart>
        );
      
      case 'line':
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey={xKey} stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 10 }} />
            <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 10 }} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
              labelStyle={{ color: '#fff' }}
            />
            <Legend />
            {yKeys?.map((key, i) => (
              <Line key={key} type="monotone" dataKey={key} stroke={COLORS[i % COLORS.length]} strokeWidth={2} />
            ))}
          </LineChart>
        );
      
      case 'area':
        return (
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey={xKey} stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 10 }} />
            <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 10 }} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
              labelStyle={{ color: '#fff' }}
            />
            <Legend />
            {yKeys?.map((key, i) => (
              <Area key={key} type="monotone" dataKey={key} fill={COLORS[i % COLORS.length]} stroke={COLORS[i % COLORS.length]} fillOpacity={0.3} />
            ))}
          </AreaChart>
        );
      
      case 'pie':
        return (
          <PieChart>
            <Pie
              data={data}
              dataKey={yKeys?.[0] || 'value'}
              nameKey={xKey}
              cx="50%"
              cy="50%"
              outerRadius={80}
              label
            >
              {data.map((entry: any, index: number) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
            />
            <Legend />
          </PieChart>
        );
      
      default:
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey={xKey || Object.keys(data[0])[0]} stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 10 }} />
            <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 10 }} />
            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }} />
            <Legend />
            {(yKeys || Object.keys(data[0]).slice(1)).map((key, i) => (
              <Bar key={key} dataKey={key} fill={COLORS[i % COLORS.length]} />
            ))}
          </BarChart>
        );
    }
  };

  return (
    <div className="bg-gray-900/70 rounded-xl p-3">
      {title && (
        <div className="flex items-center gap-2 mb-2 text-xs text-gray-300 font-medium">
          <BarChart3 className="w-3 h-3" />
          {title}
        </div>
      )}
      <ResponsiveContainer width="100%" height={200}>
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
}

export default function ChatPanel({ onClose }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [ragMode, setRagMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Welcome message
    setMessages([{
      id: '1',
      role: 'assistant',
      content: "👋 Hi! I'm your AI Data Analyst. I can help you explore your data, answer questions, and generate visualizations.\n\nTry asking me something like:\n- \"What's the publish rate?\"\n- \"Show me channel performance\"\n- \"Plot monthly trends\"",
      timestamp: new Date()
    }]);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setShowSuggestions(false);

    try {
      let response;
      
      if (ragMode) {
        // Use RAG endpoint
        response = await fetchAPI<{
          answer: string;
          session_id: string;
          context_size: number;
          datasets_referenced: string[];
        }>('/ask-ai', {
          method: 'POST',
          body: JSON.stringify({
            question: content.trim(),
            session_id: sessionId,
            use_thinking_model: false
          })
        });

        setSessionId(response.session_id);

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `🎯 **RAG Response** (Context: ${response.context_size} items, Datasets: ${response.datasets_referenced.join(', ') || 'None'})\n\n${response.answer}`,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, assistantMessage]);
      } else {
        // Use standard chat endpoint
        response = await fetchAPI<{
          response: string;
          session_id: string;
          artifacts: Artifact[];
          suggestions: string[];
        }>('/chat', {
          method: 'POST',
          body: JSON.stringify({
            message: content.trim(),
            session_id: sessionId
          })
        });

        setSessionId(response.session_id);

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.response,
          timestamp: new Date(),
          artifacts: response.artifacts
        };

        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `⚠️ Sorry, I couldn't process your request. ${error instanceof Error ? `Error: ${error.message}` : 'Please make sure the backend server is running on port 8000.'}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }

    setIsLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearChat = () => {
    setMessages([{
      id: '1',
      role: 'assistant',
      content: "🗑️ Chat cleared! How can I help you?",
      timestamp: new Date()
    }]);
    setShowSuggestions(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 400 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 400 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="fixed right-0 top-0 h-screen w-[420px] glass-dark border-l border-white/10 flex flex-col z-50"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-brand-500/25">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-white">AI Assistant</h2>
            <p className="text-xs text-gray-400">
              {ragMode ? '🎯 RAG Mode' : 'Powered by Groq LLM'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRagMode(!ragMode)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              ragMode
                ? 'bg-emerald-600 text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
            title="Toggle RAG mode (context-aware answering)"
          >
            {ragMode ? '🎯 RAG' : 'Chat'}
          </button>
          <button
            onClick={clearChat}
            className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            title="Clear chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            {/* Avatar */}
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
              ${message.role === 'user' 
                ? 'bg-brand-600' 
                : 'bg-gradient-to-br from-cyan-500 to-emerald-500'
              }
            `}>
              {message.role === 'user' 
                ? <User className="w-4 h-4 text-white" />
                : <Bot className="w-4 h-4 text-white" />
              }
            </div>

            {/* Content */}
            <div className={`
              max-w-[85%] rounded-2xl px-4 py-3
              ${message.role === 'user'
                ? 'bg-brand-600 text-white'
                : 'glass text-gray-100'
              }
            `}>
              <div className="markdown-content text-sm">
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>

              {/* Artifacts */}
              {message.artifacts && message.artifacts.length > 0 && (
                <div className="mt-3 space-y-2">
                  {message.artifacts.map((artifact, i) => (
                    <div key={i} className="rounded-xl overflow-hidden">
                      {artifact.type === 'chart' ? (
                        <ChartRenderer artifact={artifact} />
                      ) : artifact.type === 'image' || artifact.type === 'figure' ? (
                        <div className="p-2 bg-gray-900/50">
                          <div className="flex items-center gap-2 mb-2 text-xs text-gray-400">
                            <ImageIcon className="w-3 h-3" />
                            {artifact.name || artifact.title}
                          </div>
                          {artifact.data && typeof artifact.data === 'string' && (
                            <img 
                              src={`data:image/png;base64,${artifact.data}`}
                              alt={artifact.name || artifact.title || 'chart'}
                              className="rounded-lg max-w-full"
                            />
                          )}
                        </div>
                      ) : artifact.type === 'table' ? (
                        <div className="p-2 bg-gray-900/50">
                          <div className="flex items-center gap-2 mb-2 text-xs text-gray-400">
                            <Table className="w-3 h-3" />
                            {artifact.name || artifact.title}
                          </div>
                          {artifact.data && Array.isArray(artifact.data) && artifact.data.length > 0 && (
                            <div className="overflow-x-auto">
                              <table className="text-xs text-gray-300 w-full">
                                <thead>
                                  <tr className="border-b border-gray-700">
                                    {Object.keys(artifact.data[0]).map((col) => (
                                      <th key={col} className="px-2 py-1 text-left font-medium">{col}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {artifact.data.slice(0, 5).map((row: any, rowIdx: number) => (
                                    <tr key={rowIdx} className="border-b border-gray-800">
                                      {Object.values(row).map((val: any, colIdx: number) => (
                                        <td key={colIdx} className="px-2 py-1">{String(val)}</td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              {artifact.data.length > 5 && (
                                <div className="text-xs text-gray-500 mt-1">... and {artifact.data.length - 5} more rows</div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}

              <p className="text-[10px] mt-2 opacity-50">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </motion.div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="glass rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2 text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Analyzing...</span>
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts */}
      {showSuggestions && messages.length <= 1 && (
        <div className="px-4 py-3 border-t border-white/5">
          <div className="flex items-center gap-2 mb-2 text-xs text-gray-400">
            <Lightbulb className="w-3 h-3" />
            Quick prompts
          </div>
          <div className="flex flex-wrap gap-2">
            {QUICK_PROMPTS.slice(0, 3).map((prompt) => (
              <button
                key={prompt}
                onClick={() => sendMessage(prompt)}
                className="px-3 py-1.5 rounded-full text-xs bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-white/10">
        <div className="relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your data..."
            rows={1}
            className="w-full px-4 py-3 pr-12 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 resize-none focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            style={{ minHeight: '48px', maxHeight: '120px' }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            className={`
              absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all
              ${input.trim() && !isLoading
                ? 'bg-brand-600 text-white hover:bg-brand-500'
                : 'bg-white/5 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-gray-500 mt-2 text-center">
          Press Enter to send • Shift+Enter for new line
        </p>
      </div>
    </motion.div>
  );
}
