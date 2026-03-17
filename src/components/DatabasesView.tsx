import React, { useState, useEffect } from 'react';
import { Database, TrendingUp, Search, RefreshCw, AlertCircle, ArrowRight } from 'lucide-react';
import { cn } from '../utils';
import { API_BASE_URL } from '../apiConfig';

interface DatabasesViewProps {
  setActiveTable: (tableName: string) => void;
  setActiveView: (view: 'landing' | 'dashboard' | 'databases') => void;
}

export function DatabasesView({ setActiveTable, setActiveView }: DatabasesViewProps) {
  const [databases, setDatabases] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchDatabases = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/databases`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Failed to fetch databases');
      setDatabases(data.databases || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error loading databases');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDatabases();
  }, []);

  const handleSelectDatabase = (tableName: string) => {
    setActiveTable(tableName);
    setActiveView('landing');
  };

  const filteredDatabases = databases.filter(db => 
    db.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-y-auto w-full">
      <header className="sticky top-0 z-30 bg-[#0a0c10]/80 backdrop-blur-xl border-b border-white/5 px-4 sm:px-8 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">Data Sources</h2>
          <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-bold flex items-center gap-1 uppercase tracking-wider">
            <Database className="w-2.5 h-2.5 sm:w-3 h-3" /> {databases.length} Available
          </span>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 w-3.5 h-3.5 sm:w-4 h-4" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search databases..." 
              className="pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-xs sm:text-sm w-full sm:w-64 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-white/30 text-white outline-none transition-all"
            />
          </div>
          <button 
            onClick={fetchDatabases}
            disabled={isLoading}
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all disabled:opacity-50 shrink-0"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 sm:w-4 h-4", isLoading && "animate-spin")} />
          </button>
        </div>
      </header>

      <div className="p-4 sm:p-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">Your Databases</h1>
          <p className="text-white/50 text-sm sm:text-base">Select an existing database to analyze or upload a new one from the Home tab.</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="relative w-10 sm:w-12 h-10 sm:h-12 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-t-2 border-indigo-500 animate-spin"></div>
              <Database className="w-3.5 h-3.5 sm:w-4 h-4 text-indigo-400 animate-pulse" />
            </div>
          </div>
        ) : error ? (
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-6 flex flex-col items-center justify-center text-center h-64">
            <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10 text-rose-400 mb-4" />
            <h3 className="text-base sm:text-lg font-bold text-white mb-2">Error Loading Databases</h3>
            <p className="text-xs sm:text-sm text-rose-400/80 mb-6">{error}</p>
            <button 
              onClick={fetchDatabases}
              className="px-5 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-sm font-semibold rounded-lg transition-colors border border-rose-500/30"
            >
              Try Again
            </button>
          </div>
        ) : filteredDatabases.length === 0 ? (
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-8 sm:p-12 flex flex-col items-center justify-center text-center border-dashed">
            <Database className="w-10 h-10 sm:w-12 h-12 text-white/20 mb-4" />
            <h3 className="text-lg sm:text-xl font-bold text-white mb-2">No Databases Found</h3>
            <p className="text-xs sm:text-sm text-white/40 mb-6 max-w-md">
              {searchQuery 
                ? `No databases matching "${searchQuery}".`
                : "You haven't uploaded any data yet. Go to Home to upload a CSV file."}
            </p>
            {!searchQuery && (
              <button 
                onClick={() => setActiveView('landing')}
                className="px-5 py-2.5 sm:px-6 sm:py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20"
              >
                Go to Upload
                <ArrowRight className="w-3.5 h-3.5 sm:w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredDatabases.map((dbName) => (
              <div 
                key={dbName}
                onClick={() => handleSelectDatabase(dbName)}
                className="group relative cursor-pointer"
              >
                <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/0 via-indigo-500/0 to-purple-500/0 group-hover:from-indigo-500/20 group-hover:via-indigo-500/20 group-hover:to-purple-500/20 rounded-2xl blur opacity-50 transition duration-500"></div>
                <div className="relative flex flex-col p-5 sm:p-6 rounded-2xl bg-[#0f1117] border border-white/10 group-hover:border-indigo-500/50 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all h-full">
                  <div className="flex items-start justify-between mb-3 sm:mb-4">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0 group-hover:bg-indigo-500 group-hover:border-indigo-400 group-hover:shadow-lg group-hover:shadow-indigo-500/30 transition-all duration-300">
                      <Database className="w-4 h-4 sm:w-5 h-5 text-indigo-400 group-hover:text-white transition-colors" />
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 sm:w-4 h-4 text-white/20 group-hover:text-white/80 group-hover:translate-x-1 duration-300 transition-all" />
                  </div>
                  
                  <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-indigo-300 transition-colors break-words mb-2">
                    {dbName}
                  </h3>
                  
                  <div className="mt-auto pt-3 sm:pt-4 flex items-center gap-3 border-t border-white/5">
                    <span className="text-[10px] sm:text-xs font-medium text-emerald-400 flex items-center gap-1.5 bg-emerald-500/10 px-2 py-1 rounded w-fit">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      Ready for analysis
                    </span>
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
