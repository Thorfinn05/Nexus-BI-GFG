import React, { useState, useEffect } from 'react';
import { BarChart3, Database, Search, RefreshCw, ArrowRight, Calendar, Sparkles } from 'lucide-react';
import { cn } from '../utils';
import { API_BASE_URL } from '../apiConfig';

interface AnalysisSummary {
  id: number;
  table_name: string;
  question: string;
  created_at: string;
}

interface AnalysesViewProps {
  onSelectAnalysis: (id: number) => void;
}

export function AnalysesView({ onSelectAnalysis }: AnalysesViewProps) {
  const [analyses, setAnalyses] = useState<AnalysisSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchAnalyses = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/analyses`);
      const data = await response.json();
      setAnalyses(data.analyses || []);
    } catch (error) {
      console.error('Failed to fetch analyses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyses();
  }, []);

  const filteredAnalyses = analyses.filter(a => 
    a.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
    a.table_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-y-auto w-full">
      <header className="sticky top-0 z-30 bg-[#0a0c10]/80 backdrop-blur-xl border-b border-white/5 px-4 sm:px-8 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">Analysis History</h2>
          <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-bold flex items-center gap-1 uppercase tracking-wider">
            <BarChart3 className="w-2.5 h-2.5 sm:w-3 h-3" /> {analyses.length} Saved
          </span>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 w-3.5 h-3.5 sm:w-4 h-4" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search history..." 
              className="pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-xs sm:text-sm w-full sm:w-64 focus:ring-1 focus:ring-indigo-500 placeholder:text-white/30 text-white outline-none transition-all"
            />
          </div>
          <button 
            onClick={fetchAnalyses}
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all shrink-0"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 sm:w-4 h-4", isLoading && "animate-spin")} />
          </button>
        </div>
      </header>

      <div className="p-4 sm:p-8 max-w-7xl mx-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredAnalyses.length === 0 ? (
          <div className="bg-white/[0.02] border border-white/5 border-dashed rounded-3xl p-8 sm:p-20 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4 sm:mb-6">
              <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-white/20" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white mb-2">No past analyses found</h3>
            <p className="text-xs sm:text-sm text-white/40 max-w-sm">Every question you ask the AI in the Dashboard will be automatically saved here for later viewing.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredAnalyses.map((analysis) => (
              <div 
                key={analysis.id}
                onClick={() => onSelectAnalysis(analysis.id)}
                className="group relative cursor-pointer"
              >
                <div className="absolute -inset-0.5 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
                <div className="relative flex flex-col p-5 sm:p-6 rounded-2xl bg-[#0f1117]/60 border border-white/10 group-hover:border-white/20 hover:shadow-2xl transition-all h-full">
                  <div className="flex items-start justify-between mb-3 sm:mb-4">
                    <div className="flex items-center gap-2 px-2 py-0.5 sm:py-1 rounded-md bg-white/5 border border-white/5">
                      <Database className="w-3 h-3 text-white/40" />
                      <span className="text-[9px] sm:text-[10px] font-bold text-white/60 uppercase tracking-wider truncate max-w-[80px] sm:max-w-[120px]">
                        {analysis.table_name}
                      </span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 sm:w-4 h-4 text-white/20 group-hover:text-white/80 transition-all group-hover:translate-x-1" />
                  </div>
                  
                  <h3 className="text-sm sm:text-base font-semibold text-white group-hover:text-indigo-300 transition-colors line-clamp-3 mb-4 sm:mb-6 flex-1">
                    "{analysis.question}"
                  </h3>
                  
                  <div className="flex items-center gap-2 text-white/30 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest pt-3 sm:pt-4 border-t border-white/5">
                    <Calendar className="w-3 h-3" />
                    {new Date(analysis.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
