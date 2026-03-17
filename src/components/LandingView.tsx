import React, { useState } from 'react';
import { Search, Zap, TrendingUp, Target, BarChart2, UploadCloud, FileSpreadsheet, Database, History, ArrowRight } from 'lucide-react';
import TypewriterEffect from './TypewriterEffect';
import { cn } from '../utils';
import { VoiceInput } from './VoiceInput';
import { DataPreview } from './DataPreview';
import { API_BASE_URL } from '../apiConfig';

interface LandingViewProps {
  onAnalyze: (query: string, tableName?: string) => void;
  activeTable: string;
  setActiveTable: (tableName: string) => void;
}

export function LandingView({ onAnalyze, activeTable, setActiveTable }: LandingViewProps) {
  const [query, setQuery] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [previewData, setPreviewData] = useState<{
    tableName: string;
    sampleData: any[];
    summary: string;
    suggestedQuestions: string[];
  } | null>(null);

  // Fetch preview data automatically when activeTable changes
  React.useEffect(() => {
    if (!activeTable || activeTable === 'default_table') return;
    
    // Only fetch if it's a different table than what we already have
    if (previewData?.tableName === activeTable) return;

    const fetchPreview = async () => {
      try {
        console.log('Fetching preview for:', activeTable);
        const response = await fetch(`${API_BASE_URL}/api/preview/${activeTable}`);
        const data = await response.json();
        if (response.ok) {
          setPreviewData({
            tableName: activeTable,
            sampleData: data.sample_data || [],
            summary: data.summary || "No summary available.",
            suggestedQuestions: data.suggested_questions || []
          });
        }
      } catch (err) {
        console.error('Error fetching preview:', err);
      }
    };

    fetchPreview();
  }, [activeTable, previewData?.tableName]);

  const suggestions = [
    { icon: TrendingUp, text: 'Top performing regions' },
    { icon: Target, text: 'Sales vs. Target' },
    { icon: BarChart2, text: 'Monthly Growth Rate' },
  ];

  const recentDashboards = [
    { title: 'Q4 Revenue by Product Category', date: '2 hours ago' },
    { title: 'Sales team performance leaderboard', date: 'Yesterday' },
    { title: 'Customer Churn Analysis', date: '3 days ago' },
  ];

  const handleAnalyze = () => {
    if (query.trim()) {
      onAnalyze(query, activeTable);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    setIsUploading(true);
    setUploadMessage('Uploading...');
    
    // Create a safe table name from the file name
    const newTableName = selectedFile.name.split('.')[0].replace(/[^a-zA-Z0-9]/g, '_').toLowerCase() + '_' + Date.now();
    
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('table_name', newTableName);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setActiveTable(newTableName);
        setUploadMessage(`Success: ${data.rows} rows uploaded.`);
        // Note: activeTable update will trigger the useEffect to fetch preview
      } else {
        setUploadMessage(`Error: ${data.detail || 'Upload failed'}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadMessage('Error connecting to server.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center px-6 py-12 overflow-y-auto relative h-full min-h-full scroll-smooth">
      {/* Animated Background Effects */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden flex items-center justify-center">
        {/* Floating Logo - Very light and nearly transparent */}
        <div className="w-[80%] max-w-[800px] aspect-square opacity-[0.03] animate-float relative flex items-center justify-center">
          <img src="/logo.png" alt="" className="w-full h-full object-contain filter grayscale invert" />
        </div>

        {/* Breathing Background Blurs */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 blur-[120px] rounded-full animate-pulse-slow"></div>
        <div className="absolute bottom-[10%] right-[-10%] w-[60%] h-[60%] bg-purple-600/20 blur-[150px] rounded-full animate-pulse-slow-reverse"></div>
        <div className="absolute top-[20%] right-[10%] w-[40%] h-[40%] bg-pink-600/10 blur-[100px] rounded-full animate-pulse-slow" style={{ animationDelay: '-2s' }}></div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(-1%); }
          50% { transform: translateY(1%); }
        }
        @keyframes pulse-slow {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.1); opacity: 0.3; }
        }
        @keyframes pulse-slow-reverse {
          0%, 100% { transform: scale(1.1); opacity: 0.3; }
          50% { transform: scale(1); opacity: 0.8; }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
        .animate-pulse-slow {
          animation: pulse-slow 8s ease-in-out infinite;
        }
        .animate-pulse-slow-reverse {
          animation: pulse-slow-reverse 8s ease-in-out infinite;
        }
        .text-gradient {
          background: linear-gradient(to right, #7381fdff, #b164feff, #eb72f4ff);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
      `}</style>

      <div className="w-full flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-7xl mx-auto relative z-10 px-4">
        
        <div className="mt-8 mb-6 text-center space-y-3">
          <h1 className="text-white text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight drop-shadow-2xl">
            Insights at your <span className="text-gradient">
              <TypewriterEffect 
                words={[
                  { word: "command" },
                  { word: "service" },
                  { word: "fingertips" },
                  { word: "business" },
                ]} 
                textColor="transparent" 
                cursorColor="#818cf8"
                cursorWidth={3}
                typingSpeed={80}
                deletingSpeed={50}
                pauseDuration={2000}
              />
            </span>
          </h1>
          <p className="text-white/60 text-sm sm:text-base font-medium tracking-wide max-w-lg mx-auto">
            Natural language data exploration for your entire business.
          </p>
        </div>

        {/* Combined Upload and Database Selection Section */}
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-8 sm:mb-12">
          {/* Upload Card */}
          <div className="relative group cursor-pointer h-full">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 rounded-3xl blur-xl opacity-30 group-hover:opacity-60 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative flex flex-col items-center justify-center border border-white/10 border-dashed rounded-3xl bg-[#0f1117]/80 backdrop-blur-2xl p-6 sm:p-8 text-center hover:bg-white/[0.02] transition-all h-full min-h-[180px] sm:min-h-[220px]">
              <div className="w-10 h-10 sm:w-12 h-12 bg-indigo-500/10 rounded-full flex items-center justify-center mb-3 sm:mb-4 border border-indigo-500/20">
                <UploadCloud className="w-5 h-5 sm:w-6 h-6 text-indigo-400" />
              </div>
              <h3 className="text-white text-base sm:text-lg font-bold mb-1">Import new data</h3>
              <p className="text-white/40 text-[9px] sm:text-[10px] mb-3 sm:mb-4 uppercase tracking-[0.1em] font-bold">CSV supported</p>
              
              <label className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-[10px] sm:text-xs font-bold transition-all shadow-lg backdrop-blur-md cursor-pointer active:scale-95">
                {isUploading ? 'Uploading...' : 'Choose File'}
                <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
              </label>
              
              {uploadMessage && (
                <p className={cn("text-[9px] sm:text-[10px] font-bold mt-2 sm:mt-3 uppercase tracking-wider", uploadMessage.startsWith('Error') ? "text-rose-400" : "text-emerald-400")}>
                  {uploadMessage}
                </p>
              )}
            </div>
          </div>

          {/* Selected Database Status Card */}
          <div className="flex flex-col justify-center items-center p-6 sm:p-8 rounded-3xl bg-white/[0.02] border border-white/10 backdrop-blur-3xl text-center h-full min-h-[180px] sm:min-h-[220px]">
            <div className="w-10 h-10 sm:w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center mb-3 sm:mb-4 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
              <Database className="w-5 h-5 sm:w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-white/40 text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] mb-2">Currently Connected</h3>
            <div className="bg-emerald-500/5 px-3 sm:px-4 py-2 sm:py-3 rounded-2xl border border-emerald-500/10 mb-2 max-w-full">
              <p className="text-white font-mono text-xs sm:text-sm break-all font-bold tracking-tight">
                {activeTable || 'nexus_bi_default'}
              </p>
            </div>
            <p className="text-[9px] sm:text-[10px] text-emerald-400/60 font-medium uppercase tracking-widest">Active Table ready for analysis</p>
          </div>
        </div>

        {/* Query Input Section */}
        <div className="w-full max-w-3xl mb-8 sm:mb-12 relative z-20">
          <div className="relative flex flex-col sm:flex-row items-stretch gap-2 w-full p-1.5 sm:p-2 bg-white/[0.03] backdrop-blur-3xl rounded-2xl shadow-2xl border border-white/10 transition-all focus-within:border-indigo-500/50 focus-within:shadow-indigo-500/20">
            <div className="flex flex-1 items-center px-4 bg-white/5 rounded-xl border border-white/5 transition-colors focus-within:bg-white/10">
              <Search className="text-white/40 mr-2 sm:mr-3 w-4 h-4 sm:w-5 h-5 shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                className="w-full bg-transparent border-none focus:ring-0 text-white placeholder:text-white/30 text-sm sm:text-base py-3 outline-none"
                placeholder="Ask a question about your data..."
              />
              <VoiceInput onResult={(text) => setQuery(text)} className="mr-0.5 sm:mr-1" />
            </div>
            <button
              onClick={handleAnalyze}
              disabled={!query.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 disabled:text-white/50 text-white font-bold px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-95"
            >
              <span className="text-sm sm:text-base">Analyze</span>
              <Zap className="w-3.5 h-3.5 sm:w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => onAnalyze(suggestion.text, activeTable)}
                className="flex items-center gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-white/5 backdrop-blur-md hover:bg-white/10 border border-white/5 transition-all text-white/50 hover:text-white group"
              >
                <suggestion.icon className="w-3 h-3 sm:w-3.5 h-3.5 text-white/30 group-hover:text-indigo-400 transition-colors" />
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">{suggestion.text}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Data Preview Section - Stays open and is full width relative to content */}
        {previewData && (
          <div className="w-full mb-12">
            <DataPreview 
              sampleData={previewData.sampleData}
              summary={previewData.summary}
              suggestedQuestions={previewData.suggestedQuestions}
              onAnalyze={(q) => {
                console.log('Analyzing suggested question:', q, 'on table:', previewData.tableName);
                onAnalyze(q, previewData.tableName);
              }}
              onClose={() => setPreviewData(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
