import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, Download, Share2, TrendingUp, CheckCircle2, XCircle, Search, Bell, Info, Terminal, Activity } from 'lucide-react';
import { ChartComponent } from './ChartComponent';
import { cn } from '../utils';
import { VoiceInput } from './VoiceInput';
import { PerspectiveSelector } from './PerspectiveSelector';
import { API_BASE_URL } from '../apiConfig';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChartOption {
  sql: string;
  chart_type: string;
  confidence: 'High' | 'Medium' | 'Low';
  rationale: string;
  summary: string;
  data: any[];
}

interface DashboardViewProps {
  query: string;
  tableName: string;
}

export function DashboardView({ query, tableName }: DashboardViewProps) {
  const initialQueryFired = React.useRef(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isQuerying, setIsQuerying] = useState(false);

  // Persistence: initialize from localStorage
  const [data, setData] = useState<any[]>(() => {
    const saved = localStorage.getItem('nexus_dashboard_data');
    return saved ? JSON.parse(saved) : [];
  });
  const [chartType, setChartType] = useState<string>(() => {
    return localStorage.getItem('nexus_dashboard_chart_type') || 'table';
  });
  const [insights, setInsights] = useState<{ pros_cons: string, predictions: string } | null>(() => {
    const saved = localStorage.getItem('nexus_dashboard_insights');
    return saved ? JSON.parse(saved) : null;
  });
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('nexus_dashboard_messages');
    return saved ? JSON.parse(saved) : [];
  });
  const [chatInput, setChatInput] = useState('');
  const [generatedSql, setGeneratedSql] = useState<string>(() => {
    return localStorage.getItem('nexus_dashboard_sql') || '';
  });
  const [allCharts, setAllCharts] = useState<ChartOption[]>(() => {
    const saved = localStorage.getItem('nexus_dashboard_all_charts');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedChartIndex, setSelectedChartIndex] = useState<number>(() => {
    const saved = localStorage.getItem('nexus_dashboard_selected_index');
    return saved ? parseInt(saved, 10) : 0;
  });

  // Save to localStorage when state changes
  useEffect(() => {
    localStorage.setItem('nexus_dashboard_data', JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    localStorage.setItem('nexus_dashboard_chart_type', chartType);
  }, [chartType]);

  useEffect(() => {
    localStorage.setItem('nexus_dashboard_insights', JSON.stringify(insights));
  }, [insights]);

  useEffect(() => {
    localStorage.setItem('nexus_dashboard_messages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('nexus_dashboard_sql', generatedSql);
  }, [generatedSql]);

  useEffect(() => {
    localStorage.setItem('nexus_dashboard_all_charts', JSON.stringify(allCharts));
  }, [allCharts]);

  useEffect(() => {
    localStorage.setItem('nexus_dashboard_selected_index', selectedChartIndex.toString());
  }, [selectedChartIndex]);

  const executeQuery = async (userQuery: string, currentHistory: Message[]) => {
    setIsQuerying(true);
    setError(null);
    // Clear stale analytic data while querying
    setData([]);
    setInsights(null);
    setChartType('table');
    setGeneratedSql('');
    setAllCharts([]);
    setSelectedChartIndex(0);

    try {
      // Fetch data
      const queryResponse = await fetch(`${API_BASE_URL}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userQuery, table_name: tableName, history: currentHistory })
      });
      const queryData = await queryResponse.json();

      if (!queryResponse.ok) {
        throw new Error(queryData.detail || 'Failed to fetch data');
      }

      setGeneratedSql(queryData.generated_sql || '');
      
      const charts: ChartOption[] = queryData.charts || [];
      setAllCharts(charts);
      
      // If charts are present, use the first one (highest confidence)
      if (charts.length > 0) {
        setData(charts[0].data);
        setChartType(charts[0].chart_type);
        setGeneratedSql(charts[0].sql);
        setSelectedChartIndex(0);
      } else {
        setData(queryData.data);
        setChartType(queryData.chart_type);
        setGeneratedSql(queryData.generated_sql || '');
      }

      let finalInsights = null;

      // 0. Use cached insights if available
      if (queryData.cached && queryData.insights) {
        finalInsights = queryData.insights;
        setInsights(finalInsights);
      } else {
        // Fetch fresh insights
        const insightsResponse = await fetch(`${API_BASE_URL}/api/insights`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: queryData.data, context_query: userQuery })
        });
        const insightsData = await insightsResponse.json();

        if (insightsResponse.ok) {
          const safeStringify = (val: any) => {
            if (typeof val === 'string') return val;
            if (val === null || val === undefined) return '';
            if (Array.isArray(val)) return val.join('\n');
            if (typeof val === 'object') {
              return Object.entries(val)
                .map(([key, value]) => `• ${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
                .join('\n');
            }
            return String(val);
          };
          finalInsights = {
            pros_cons: safeStringify(insightsData.pros_cons),
            predictions: safeStringify(insightsData.predictions)
          };
          setInsights(finalInsights);
        }
      }

      // ONLY AFTER EVERYTHING IS UPDATED, add assistant response to chat
      const summaryText = queryData.summary || `I've analyzed the data for "${userQuery}". You can see the ${queryData.chart_type} visualization and detailed insights in the left panel.`;
      const assistantMessage: Message = {
        role: 'assistant',
        content: summaryText
      };
      
      // Fix duplication: currentHistory already contains the user message
      const finalMessages = [...currentHistory, assistantMessage];
      setMessages(finalMessages);

      // AUTO-SAVE to DB if not from cache
      if (!queryData.cached) {
        fetch(`${API_BASE_URL}/api/analyses`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            table_name: tableName,
            question: userQuery,
            sql: queryData.generated_sql,
            chart_type: queryData.chart_type,
            summary: summaryText,
            data: queryData.data,
            insights: finalInsights,
            messages: finalMessages,
            charts: charts
          })
        }).catch(e => {
          console.error("Auto-save failed:", e);
          // Optional: You could set a non-blocking UI alert here
        });
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during analysis.');
      setMessages(prev => [...prev, { role: 'assistant', content: `Sorry, I encountered an error: ${err.message}` }]);
    } finally {
      setIsQuerying(false);
    }
  };

  useEffect(() => {
    if (query && tableName && !initialQueryFired.current) {
      initialQueryFired.current = true;
      // Only fire if we don't have existing messages/data (meaning it's a fresh analysis)
      if (messages.length === 0) {
        const initialMessage: Message = { role: 'user', content: query };
        setMessages([initialMessage]);
        executeQuery(query, [initialMessage]);
      }
    }
  }, [query, tableName, messages.length]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isQuerying) return;

    const newUserMessage: Message = { role: 'user', content: chatInput };
    const updatedHistory = [...messages, newUserMessage];
    setMessages(updatedHistory);
    setChatInput('');
    executeQuery(chatInput, updatedHistory);
  };

  if (isLoading && messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full">
        <div className="relative w-24 h-24 flex items-center justify-center mb-8">
          <div className="absolute inset-0 rounded-full border-t-2 border-indigo-500 animate-spin"></div>
          <div className="absolute inset-2 rounded-full border-r-2 border-pink-500 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
          <Sparkles className="w-8 h-8 text-indigo-400 animate-pulse" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">AI is analyzing your data...</h2>
        <p className="text-white/40 text-sm">Initializing analysis on table "{tableName}"</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden h-full bg-[#0a0c10] relative">
      {/* Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="bg-blob w-[50%] h-[50%] bg-indigo-600/60 top-[-15%] left-[-15%] slide-in-from-top-10 duration-1000" />
        <div className="bg-blob w-[60%] h-[60%] bg-purple-600/60 bottom-[-15%] right-[-15%] [animation-delay:2s]" />
        <div className="bg-blob w-[40%] h-[40%] bg-fuchsia-600/60 top-[15%] right-[5%] [animation-delay:4s]" />
        <div className="bg-blob w-[45%] h-[45%] bg-indigo-500/60 bottom-[5%] left-[10%] [animation-delay:6s]" />
      </div>

      {/* Left Pane: Analysis Results */}
      <div className="flex-1 overflow-y-auto w-full lg:border-r border-white/5 custom-scrollbar order-2 lg:order-1 relative z-10">
        <header className="sticky top-0 z-30 bg-[#0a0c10]/80 backdrop-blur-xl border-b border-white/5 px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">Analysis Pane</h2>
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-bold flex items-center gap-1 uppercase tracking-wider">
              <TrendingUp className="w-2.5 h-2.5 sm:w-3 h-3" /> Live
            </span>
          </div>

          <div className="flex items-center gap-3">
            {allCharts.length > 1 && (
              <PerspectiveSelector
                options={allCharts}
                selectedIndex={selectedChartIndex}
                onSelect={(idx) => {
                  setSelectedChartIndex(idx);
                  const selected = allCharts[idx];
                  setData(selected.data);
                  setChartType(selected.chart_type);
                  setGeneratedSql(selected.sql);
                }}
                label="Confidence"
              />
            )}
          </div>
        </header>

        <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 text-rose-400 text-sm flex items-center gap-3">
              <Info className="shrink-0" size={18} />
              {error}
            </div>
          )}

          <section className="grid grid-cols-1 gap-6">
            {/* Generated SQL */}
            {generatedSql && (
              <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-500">
                <div className="flex items-center gap-2 mb-2">
                  <Terminal size={14} className="text-indigo-400" />
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Generated SQL Query</span>
                </div>
                <div className="relative group">
                  <code className="text-[11px] text-indigo-300/80 font-mono break-all line-clamp-2 group-hover:line-clamp-none transition-all duration-300">
                    {generatedSql}
                  </code>
                </div>
              </div>
            )}

            {/* Main Chart */}
            <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-4 sm:p-6 shadow-2xl min-h-[350px] sm:min-h-[450px] flex flex-col relative overflow-hidden">
              {isQuerying && (
                <div className="absolute inset-0 bg-[#0a0c10]/40 backdrop-blur-[2px] z-20 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-indigo-400 font-medium text-sm">Updating visualization...</p>
                  </div>
                </div>
              )}
              <div className="flex justify-between items-start mb-6 sm:mb-8">
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-white tracking-tight capitalize">{chartType} Visualization</h3>
                  <p className="text-xs sm:text-sm text-white/40 mt-1">Data insights based on conversation</p>
                </div>
              </div>

              <div className="flex-1 w-full min-h-[300px]">
                {data && data.length > 0 ? (
                  <ChartComponent type={chartType} data={data} />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-white/30 text-sm">
                    {isQuerying ? "Processing..." : "No data to display yet."}
                  </div>
                )}
              </div>
            </div>

            {/* AI Insights Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col h-full">
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 blur-2xl rounded-full"></div>
                <h4 className="text-sm font-bold mb-6 flex items-center gap-2 text-white/90">
                  <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]"></span>
                  Pros & Cons Analysis
                </h4>
                <div className="space-y-4 flex-1">
                  {isQuerying ? (
                    <div className="flex flex-col gap-3">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="flex gap-3 animate-pulse">
                          <div className="w-5 h-5 rounded-full bg-white/5 shrink-0" />
                          <div className="h-4 bg-white/5 rounded w-full" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    (() => {
                      const text = insights?.pros_cons || "";
                      if (!text) return <p className="text-sm text-white/30 italic">Awaiting data analysis...</p>;

                      // Parsing logic: Split by headers, bullets, or newlines
                      const points: { text: string; type: 'pro' | 'con' }[] = [];

                      // Try to split into Pros and Cons sections
                      const prosPart = text.split(/Cons?:/i)[0].replace(/Pros?:/i, '').trim();
                      const consPart = text.includes('Cons:') || text.includes('cons:') ? text.split(/Cons?:/i)[1].trim() : '';

                      const extract = (chunk: string, type: 'pro' | 'con') => {
                        const items = chunk.split(/\n|•|/g).map(s => s.trim()).filter(s => s.length > 10);
                        if (items.length === 0 && chunk.length > 10) items.push(chunk);
                        items.forEach(item => points.push({ text: item, type }));
                      };

                      if (prosPart) extract(prosPart, 'pro');
                      if (consPart) extract(consPart, 'con');

                      // Fallback if parsing failed to produce points but we have text
                      if (points.length === 0 && text.length > 0) {
                        const sentences = text.split(/[.!?]/).filter(s => s.trim().length > 15);
                        sentences.slice(0, 4).forEach((s, idx) => {
                          points.push({ text: s.trim() + '.', type: idx % 2 === 0 ? 'pro' : 'con' });
                        });
                      }

                      return points.map((point, idx) => (
                        <div key={idx} className="flex gap-3 group">
                          {point.type === 'pro' ? (
                            <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3 text-white" strokeWidth={3} />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center shrink-0 shadow-lg shadow-rose-500/20">
                              <XCircle className="w-3 h-3 text-white" strokeWidth={3} />
                            </div>
                          )}
                          <p className="text-sm text-white/80 leading-relaxed group-hover:text-white transition-colors">
                            {point.text}
                          </p>
                        </div>
                      ));
                    })()
                  )}
                </div>
              </div>

              <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col">
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 blur-2xl rounded-full"></div>
                <h4 className="text-sm font-bold mb-4 flex items-center gap-2 text-white">
                  <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                  AI Rationale
                </h4>
                <div className="flex gap-2.5 items-start">
                  {allCharts[selectedChartIndex]?.rationale && <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />}
                  <p className="text-xs sm:text-sm text-white/70 leading-relaxed italic">
                    {isQuerying ? "..." : (allCharts[selectedChartIndex]?.rationale || "Selecting the optimal visualization for your query.")}
                  </p>
                </div>
              </div>

              <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 blur-2xl rounded-full"></div>
                <h4 className="text-sm font-bold mb-4 flex items-center gap-2 text-white">
                  <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                  Insights & Predictions
                </h4>
                <div className="flex gap-2.5 items-start">
                  {insights?.predictions && !isQuerying && <Activity className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />}
                  <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">
                    {isQuerying ? "Generating..." : (insights?.predictions || "Awaiting trends...")}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Data Table */}
          <section className="bg-white/[0.02] border border-white/10 rounded-2xl shadow-2xl overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
              <h3 className="font-bold text-xs text-white/60 uppercase tracking-widest">Query Results (Top 50)</h3>
            </div>
            <div className="overflow-x-auto max-h-[300px] custom-scrollbar">
              {data && data.length > 0 ? (
                <table className="w-full text-left border-collapse min-w-[500px] sm:min-w-[600px]">
                  <thead className="sticky top-0 bg-[#0f1117]/90 backdrop-blur shadow-sm z-10">
                    <tr>
                      {Object.keys(data[0]).map((key) => (
                        <th key={key} className="px-4 sm:px-6 py-3 sm:py-4 text-[9px] sm:text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {data.slice(0, 50).map((row, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.01] transition-colors">
                        {Object.values(row).map((val: any, jdx) => (
                          <td key={jdx} className="px-4 sm:px-6 py-3 sm:py-3.5 text-[11px] sm:text-xs text-white/60">
                            {typeof val === 'number' ? val.toLocaleString() : String(val)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-12 text-center text-white/20 text-xs italic">No data records found.</div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Right Pane: Chat Interface */}
      <div className="w-full lg:w-[350px] xl:w-[400px] flex flex-col bg-white/[0.01] border-l border-white/5 h-[400px] lg:h-full order-1 lg:order-2 relative z-10">
        <div className="p-4 sm:p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Sparkles size={16} />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Nexus AI Assistant</h3>
              <p className="text-[10px] text-emerald-400 font-medium">Assistant is Online</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar">
          {messages.map((msg, idx) => (
            <div key={idx} className={cn(
              "flex flex-col max-w-[90%] sm:max-w-[85%] animate-in fade-in slide-in-from-bottom-2 duration-300",
              msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
            )}>
              <div className={cn(
                "px-3 sm:px-4 py-2 sm:py-3 rounded-2xl text-xs sm:text-sm leading-relaxed",
                msg.role === 'user'
                  ? "bg-indigo-600 text-white rounded-tr-none"
                  : "bg-white/5 border border-white/10 text-white/80 rounded-tl-none"
              )}>
                {msg.content}
              </div>
              <span className="text-[9px] sm:text-[10px] text-white/20 mt-1 uppercase font-bold tracking-tighter">
                {msg.role === 'user' ? 'You' : 'Assistant'}
              </span>
            </div>
          ))}
          {isQuerying && (
            <div className="flex gap-2 items-center text-white/40 text-[9px] sm:text-[10px] font-bold animate-pulse">
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
              THINKING...
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-3 sm:p-4 bg-black/20 border-t border-white/5">
          <form onSubmit={handleSendMessage} className="relative">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask a follow-up question..."
              disabled={isQuerying}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 sm:py-3 pl-4 pr-16 sm:pr-20 text-xs sm:text-sm text-white placeholder:text-white/20 outline-none focus:ring-1 focus:ring-indigo-500 transition-all disabled:opacity-50"
            />
            <div className="absolute right-9 sm:right-10 top-1/2 -translate-y-1/2 flex items-center">
              <VoiceInput onResult={(text) => setChatInput(text)} />
            </div>
            <button
              type="submit"
              disabled={isQuerying || !chatInput.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white hover:bg-indigo-500 transition-colors disabled:opacity-30 disabled:scale-95"
            >
              <ArrowRight size={16} />
            </button>
          </form>
          <p className="text-[8px] sm:text-[9px] text-white/20 text-center mt-2 sm:mt-3 uppercase font-bold tracking-widest">Powered by Gemini 2.5 Flash</p>
        </div>
      </div>
    </div>
  );
}
