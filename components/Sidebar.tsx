import React, { useRef } from 'react';
import { LayoutDashboard, List, PlusCircle, Disc, ArrowRightLeft, Bus, Wrench, LogOut, DownloadCloud, UploadCloud, Settings, Shield } from 'lucide-react';
import { TabView, UserLevel } from '../types';

interface SidebarProps {
  currentTab: TabView;
  onTabChange: (tab: TabView) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  onLogout: () => void;
  onExportData: () => void;
  onImportData: (e: React.ChangeEvent<HTMLInputElement>) => void;
  userLevel: UserLevel;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentTab, 
  onTabChange, 
  isMobileOpen, 
  setIsMobileOpen, 
  onLogout, 
  onExportData, 
  onImportData,
  userLevel
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Visão Geral FIRST
  const allMenuItems = [
    { id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'fleet', label: 'Minha Frota', icon: Bus },
    { id: 'inventory', label: 'Estoque & Histórico', icon: List },
    { id: 'movement', label: 'Movimentação', icon: ArrowRightLeft },
    { id: 'maintenance', label: 'Inspeção', icon: Wrench },
    { id: 'register', label: 'Cadastrar Pneu', icon: PlusCircle },
    { id: 'ai-insights', label: 'Assistente IA', icon: Settings },
  ] as const;

  // Filter menu based on role
  const menuItems = allMenuItems.filter(item => {
    // Regras para Operacional (JUNIOR)
    if (userLevel === 'JUNIOR') {
      // Remove Cadastro, Dashboard (Visão Geral) e Estoque
      if (item.id === 'register' || item.id === 'dashboard' || item.id === 'inventory') return false;
    }
    return true;
  });

  // Estilos Base: Sidebar Flutuante no Desktop
  const baseClasses = `
    fixed z-50 w-72 bg-slate-900 text-slate-300 
    transition-transform duration-300 ease-in-out flex flex-col 
    border-r border-slate-800 lg:border-slate-800/50
    
    /* Mobile: Full Height, Fixed Left */
    inset-y-0 left-0
    
    /* Desktop: Floating Card Style */
    lg:top-4 lg:bottom-4 lg:left-4 lg:rounded-2xl lg:shadow-2xl lg:shadow-slate-900/50
  `;
  
  const mobileClasses = isMobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0";

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const getRoleBadgeColor = () => {
    switch(userLevel) {
      case 'SENIOR': return 'bg-gradient-to-r from-amber-500 to-red-600 text-white';
      case 'PLENO': return 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white';
      case 'JUNIOR': return 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white';
      default: return 'bg-slate-700 text-slate-300';
    }
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside className={`${baseClasses} ${mobileClasses}`}>
        {/* Logo Section */}
        <div className="h-24 flex items-center px-8 border-b border-slate-800/50 bg-gradient-to-b from-slate-800/20 to-transparent rounded-t-2xl">
          <div className="flex items-center gap-3 text-white">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2.5 rounded-xl shadow-lg shadow-blue-900/30 ring-1 ring-white/10">
              <Disc className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-xl leading-none tracking-tight text-white">GMcontrol</h1>
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Pro System</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1.5 custom-scrollbar">
          <p className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 mt-2">Navegação Principal</p>
          
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => {
                  onTabChange(item.id as TabView);
                  setIsMobileOpen(false);
                }}
                className={`group flex items-center gap-3 w-full px-4 py-3.5 rounded-xl transition-all duration-300 font-medium text-sm relative overflow-hidden ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' 
                    : 'hover:bg-slate-800 hover:text-white text-slate-400'
                }`}
              >
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent pointer-events-none"></div>
                )}
                <Icon className={`h-5 w-5 transition-colors relative z-10 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-white'}`} />
                <span className="relative z-10">{item.label}</span>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"></div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800/50 bg-slate-900/50 rounded-b-2xl">
          {/* Backup Actions only for SENIOR */}
          {userLevel === 'SENIOR' && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button 
                onClick={onExportData}
                className="flex items-center justify-center gap-2 py-2.5 text-xs font-medium text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 rounded-lg transition-colors border border-slate-700/50 hover:border-slate-600"
              >
                <DownloadCloud className="h-3.5 w-3.5" />
                Backup
              </button>

              <button 
                onClick={handleImportClick}
                className="flex items-center justify-center gap-2 py-2.5 text-xs font-medium text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 rounded-lg transition-colors border border-slate-700/50 hover:border-slate-600"
              >
                <UploadCloud className="h-3.5 w-3.5" />
                Restaurar
              </button>
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={onImportData}
                accept=".json"
                className="hidden"
              />
            </div>
          )}

          <div className="flex items-center justify-between bg-slate-800/80 rounded-xl p-3 border border-slate-700/50 backdrop-blur-sm">
            <div className="flex items-center gap-3">
               <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-inner border border-white/10">
                 {userLevel.substring(0, 2)}
               </div>
               <div className="flex flex-col">
                 <span className="text-xs font-bold text-white">Usuário</span>
                 <span className={`text-[9px] px-1.5 py-0.5 rounded-full w-fit mt-0.5 font-bold ${getRoleBadgeColor()}`}>
                   {userLevel === 'JUNIOR' ? 'OPERACIONAL' : userLevel}
                 </span>
               </div>
            </div>
            <button 
              onClick={onLogout}
              className="text-slate-400 hover:text-red-400 transition-colors p-2 hover:bg-slate-700/50 rounded-lg"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};