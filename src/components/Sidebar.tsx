import React from 'react';
import { Home, LayoutDashboard, Database, Settings, ChevronLeft, ChevronRight, BarChart3 } from 'lucide-react';
import { cn } from '../utils';

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  activeView: 'landing' | 'dashboard' | 'databases' | 'analyses';
  setActiveView: (view: 'landing' | 'dashboard' | 'databases' | 'analyses') => void;
}

export function Sidebar({ isCollapsed, setIsCollapsed, activeView, setActiveView }: SidebarProps) {
  const navItems = [
    { id: 'landing', label: 'Home', icon: Home },
    { id: 'dashboard', label: 'Dashboards', icon: LayoutDashboard },
    { id: 'analyses', label: 'Analysis', icon: BarChart3 },
    { id: 'databases', label: 'Databases', icon: Database },
  ];

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-[#0a0c10]/95 backdrop-blur-xl border-r border-white/10 transition-all duration-300 relative z-50",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      <div className="p-6 flex items-center justify-between h-24 relative overflow-hidden">
        {/* Purple Radial Blur Background */}
        <div className="absolute top-1/2 left-8 -translate-y-1/2 w-16 h-16 bg-purple-600/30 blur-2xl rounded-full"></div>
        
        <div className="flex items-center gap-3 relative z-10">
          <div className="relative flex items-center justify-center shrink-0">
            {/* The glowing purple background layer */}
            <div className="absolute w-8 h-8 bg-purple-800 rounded-full blur-md opacity-75"></div>
            
            {/* Your sharp logo on top */}
            <img src="/logo.png" alt="Nexus BI Logo" className="relative z-10 w-10 h-10 object-contain" />
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden whitespace-nowrap">
              <h1 className="font-bold text-xl leading-none text-white tracking-tight">Nexus <span className="text-indigo-400">BI</span></h1>
              <p className="text-[10px] text-white/50 font-semibold uppercase tracking-[0.2em] mt-1.5">Intelligence</p>
            </div>
          )}
        </div>

        {/* Mobile Close Button would be handled by overlay in App.tsx or we can add one here if needed */}
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = activeView === item.id || (activeView === 'dashboard' && item.id === 'dashboard');
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveView(item.id as any);
              }}
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 w-full text-left group",
                isActive 
                  ? "bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/20" 
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon className={cn("w-5 h-5 shrink-0", isActive ? "text-indigo-400" : "text-white/50 group-hover:text-white")} />
              {!isCollapsed && <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10 space-y-2">
        <button className="flex items-center gap-3 px-3 py-3 rounded-xl text-white/60 hover:bg-white/5 hover:text-white transition-all w-full text-left group">
          <Settings className="w-5 h-5 shrink-0 text-white/50 group-hover:text-white" />
          {!isCollapsed && <span className="text-sm font-medium whitespace-nowrap">Settings</span>}
        </button>
        
        <div className="flex items-center gap-3 px-3 py-4 mt-2">
          <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0 border border-indigo-500/30">
            <span className="text-indigo-300 text-xs font-bold">G</span>
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0 overflow-hidden">
              <p className="text-sm font-semibold truncate text-white">Guest</p>
              <p className="text-[10px] text-white/50 font-medium truncate uppercase tracking-wider">User</p>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="hidden md:flex absolute -right-3 top-20 w-6 h-6 bg-[#1a1c23] border border-white/10 rounded-full items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors z-50"
      >
        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </aside>
  );
}
