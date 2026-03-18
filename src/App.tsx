/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { LandingView } from './components/LandingView';
import { DashboardView } from './components/DashboardView';
import { DatabasesView } from './components/DatabasesView';
import { AnalysesView } from './components/AnalysesView';
import { AnalysisDetailView } from './components/AnalysisDetailView';
import { cn } from './utils';

export default function App() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<number | null>(null);

  // Persistence: initialize from localStorage
  const [activeView, setActiveView] = useState<'landing' | 'dashboard' | 'databases' | 'analyses'>(() => {
    const saved = localStorage.getItem('nexus_active_view');
    return (saved as any) || 'landing';
  });
  const [currentQuery, setCurrentQuery] = useState(() => {
    return localStorage.getItem('nexus_current_query') || '';
  });
  const [activeTable, setActiveTable] = useState<string>(() => {
    return localStorage.getItem('nexus_active_table') || 'none_selected';
  });

  // Save to localStorage when state changes
  React.useEffect(() => {
    localStorage.setItem('nexus_active_view', activeView);
  }, [activeView]);

  React.useEffect(() => {
    localStorage.setItem('nexus_current_query', currentQuery);
  }, [currentQuery]);

  React.useEffect(() => {
    localStorage.setItem('nexus_active_table', activeTable);
  }, [activeTable]);

  const handleAnalyze = (query: string, tableName?: string) => {
    // Clear persistence for a fresh analysis
    localStorage.removeItem('nexus_dashboard_data');
    localStorage.removeItem('nexus_dashboard_messages');
    localStorage.removeItem('nexus_dashboard_insights');
    localStorage.removeItem('nexus_dashboard_sql');

    setCurrentQuery(query);
    if (tableName) {
      setActiveTable(tableName);
    }
    setActiveView('dashboard');
    setIsMobileMenuOpen(false); // Close mobile menu on action
  };

  return (
    <div className="flex h-screen w-full bg-[#0a0c10] text-slate-100 font-sans overflow-hidden selection:bg-indigo-500/30">
      {/* Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0c10] via-indigo-950/20 to-[#0a0c10]"></div>
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[10%] right-[-10%] w-[60%] h-[60%] bg-purple-600/10 blur-[150px] rounded-full"></div>
        <div className="absolute top-[20%] right-[10%] w-[40%] h-[40%] bg-pink-600/5 blur-[100px] rounded-full"></div>
      </div>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[45] md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <div className={cn(
        "fixed inset-y-0 left-0 z-50 md:relative transition-transform duration-300 md:translate-x-0",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
          activeView={activeView}
          setActiveView={(view) => {
            setActiveView(view);
            setIsMobileMenuOpen(false);
          }}
        />
      </div>

      <main className="flex-1 relative z-10 h-full overflow-auto flex flex-col">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-white/10 bg-[#0a0c10]/80 backdrop-blur-md sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Nexus BI Logo" className="w-8 h-8 object-contain" />
            <span className="font-bold text-lg text-white">Nexus <span className="text-indigo-400">BI</span></span>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 text-white/70 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          {activeView === 'landing' ? (
            <LandingView onAnalyze={handleAnalyze} activeTable={activeTable} setActiveTable={setActiveTable} />
          ) : activeView === 'databases' ? (
            <DatabasesView setActiveTable={setActiveTable} setActiveView={setActiveView} />
          ) : activeView === 'analyses' ? (
            selectedAnalysisId ? (
              <AnalysisDetailView analysisId={selectedAnalysisId} onBack={() => setSelectedAnalysisId(null)} />
            ) : (
              <AnalysesView onSelectAnalysis={(id) => setSelectedAnalysisId(id)} />
            )
          ) : (
            <DashboardView query={currentQuery} tableName={activeTable} />
          )}
        </div>
      </main>
    </div>
  );
}
