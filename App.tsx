import React, { useState, useEffect } from 'react';
import { Tire, TabView, Vehicle, UserLevel } from './types';
import { Sidebar } from './components/Sidebar';
import { TireForm } from './components/TireForm';
import { InventoryList } from './components/InventoryList';
import { Dashboard } from './components/Dashboard';
import { AIAssistant } from './components/AIAssistant';
import { TireMovement } from './components/TireMovement';
import { VehicleManager } from './components/VehicleManager';
import { MaintenanceHub } from './components/MaintenanceHub';
import { storageService } from './services/storageService';
import { Menu, Lock, Disc, ArrowRight, AlertCircle, Mail, Cloud, Bell, Search, User, ChevronRight, ScanLine, X, Shield, ChevronDown } from 'lucide-react';

function App() {
  // Auth State
  const [user, setUser] = useState<any | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserLevel>('SENIOR'); // Para simulação no Login
  const [userLevel, setUserLevel] = useState<UserLevel>('SENIOR'); // Nível efetivo logado
  const [loginError, setLoginError] = useState('');

  // Data State
  const [tires, setTires] = useState<Tire[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  const [currentTab, setCurrentTab] = useState<TabView>('dashboard');
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Scanner State
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scanInput, setScanInput] = useState('');

  // 1. Auth Listener
  useEffect(() => {
    const unsubscribe = storageService.subscribeToAuth((currentUser) => {
      setUser(currentUser);
      // Em um app real, buscaríamos o nível do usuário no banco de dados.
      // Aqui, persistimos o nível selecionado na sessão anterior ou padrão
      const savedLevel = localStorage.getItem('userLevel') as UserLevel;
      if (savedLevel) {
        setUserLevel(savedLevel);
        // Se for Operacional/Junior, vai direto para Movimentação
        if (savedLevel === 'JUNIOR') {
          setCurrentTab('movement');
        }
      }
      
      setLoadingAuth(false);
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // 2. Data Listeners (Only if logged in)
  useEffect(() => {
    if (!user) {
      setTires([]);
      setVehicles([]);
      return;
    }

    // Subscribe to Tires
    const unsubTires = storageService.subscribeToTires((data) => {
      setTires(data);
    });

    // Subscribe to Vehicles
    const unsubVehicles = storageService.subscribeToVehicles((data) => {
      setVehicles(data);
    });

    return () => {
      if (unsubTires) unsubTires();
      if (unsubVehicles) unsubVehicles();
    };
  }, [user]);

  // Login Handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      await storageService.login(email, password);
      setUserLevel(selectedRole);
      localStorage.setItem('userLevel', selectedRole);
      
      // Redirecionamento no Login
      if (selectedRole === 'JUNIOR') {
        setCurrentTab('movement');
      } else {
        setCurrentTab('dashboard');
      }

    } catch (error: any) {
      console.error(error);
      setLoginError('Falha ao entrar. Verifique suas credenciais.');
    }
  };

  const handleLogout = async () => {
    try {
      await storageService.logout();
      setEmail('');
      setPassword('');
      localStorage.removeItem('userLevel');
    } catch (error) {
      console.error("Error logging out", error);
    }
  };

  const handleExportData = () => {
    if (userLevel !== 'SENIOR') {
      alert("Acesso Negado: Apenas usuários SENIOR podem exportar dados.");
      return;
    }
    storageService.exportData(tires, vehicles);
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (userLevel !== 'SENIOR') {
      alert("Acesso Negado: Apenas usuários SENIOR podem importar dados.");
      return;
    }
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        
        if (json.tires && Array.isArray(json.tires) && json.vehicles && Array.isArray(json.vehicles)) {
          if(window.confirm("ATENÇÃO: A importação atualizará o banco de dados na nuvem. Isso pode sobrescrever dados existentes. Deseja continuar?")) {
            await storageService.importDataBatch(json.tires, json.vehicles);
            alert("Dados importados para a nuvem com sucesso!");
          }
        } else {
          alert("Arquivo inválido.");
        }
      } catch (err) {
        console.error(err);
        alert("Erro ao processar arquivo.");
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  // Handlers
  const handleAddTire = async (newTire: Tire) => {
    if (userLevel === 'JUNIOR') return;
    
    const tireWithHistory = {
      ...newTire,
      totalKms: 0,
      totalInvestment: newTire.price,
      retreadCount: 0,
      costPerKm: 0,
      history: (newTire.history && newTire.history.length > 0) ? newTire.history : [{
        date: new Date().toISOString(),
        action: 'CADASTRADO' as const, details: `Cadastrado por usuário ${userLevel}`
      }]
    };
    await storageService.addTire(tireWithHistory);
    // Removed automatic tab switching to allow QR code viewing
  };

  const handleDeleteTire = async (id: string) => {
    if (userLevel !== 'SENIOR') {
      alert("Acesso Negado: Apenas SENIOR pode excluir registros.");
      return;
    }
    if(confirm("Tem certeza que deseja remover este item do estoque?")) {
      await storageService.deleteTire(id);
    }
  };

  const handleUpdateTire = async (updatedTire: Tire) => {
    // JUNIOR pode atualizar apenas via inspeção ou movimentação, mas esta função é genérica.
    // A validação fina estaria no backend, aqui confiamos na UI escondendo botões críticos.
    await storageService.updateTire(updatedTire);
  };

  const handleAddVehicle = async (newVehicle: Vehicle) => {
    if (userLevel === 'JUNIOR') return;
    await storageService.addVehicle(newVehicle);
  };

  const handleUpdateVehicle = async (updatedVehicle: Vehicle) => {
    if (userLevel === 'JUNIOR') return; // Junior não edita veículo (odometro via inspeção ok, mas aqui é cadastro)
    await storageService.updateVehicle(updatedVehicle);
  };

  const handleDeleteVehicle = async (id: string) => {
    if (userLevel !== 'SENIOR') {
      alert("Acesso Negado: Apenas SENIOR pode excluir veículos.");
      return;
    }
    const hasTires = tires.some(t => t.vehicleId === id);
    if(hasTires) {
      alert("Não é possível excluir um veículo que possui pneus montados. Desmonte os pneus primeiro.");
      return;
    }
    if(confirm("Deseja excluir este veículo?")) {
      await storageService.deleteVehicle(id);
    }
  }

  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Simulação: Buscando pneu com código ${scanInput}... (Na versão mobile real, isso ativaria a câmera)`);
    setIsScannerOpen(false);
    setCurrentTab('inventory');
    setScanInput('');
  };

  const getPageTitle = () => {
    switch (currentTab) {
      case 'dashboard': return 'Visão Geral';
      case 'inventory': return 'Estoque';
      case 'register': return 'Cadastro';
      case 'movement': return 'Movimentação';
      case 'fleet': return 'Frota';
      case 'maintenance': return 'Manutenção';
      case 'ai-insights': return 'Assistente IA';
      default: return 'Painel';
    }
  };

  if (loadingAuth) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white"></div>
        <span className="text-sm font-medium opacity-80">Carregando Sistema...</span>
      </div>
    </div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-10 pointer-events-none">
           <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-blue-600 rounded-full blur-[120px]"></div>
           <div className="absolute top-[40%] right-[10%] w-[30%] h-[30%] bg-purple-600 rounded-full blur-[100px]"></div>
        </div>

        <div className="bg-white/95 backdrop-blur-xl w-full max-w-md rounded-3xl shadow-2xl overflow-hidden z-10 border border-white/20">
           <div className="p-10 text-center">
             <div className="inline-flex items-center justify-center p-4 bg-slate-900 rounded-2xl shadow-xl shadow-slate-900/20 mb-6">
               <Disc className="h-12 w-12 text-blue-500" />
             </div>
             <h1 className="text-3xl font-bold text-slate-900 tracking-tight">GMcontrol Pro</h1>
             <p className="text-slate-500 mt-2 text-sm font-medium">Gestão Inteligente de Frotas</p>
           </div>
           
           <form onSubmit={handleLogin} className="px-10 pb-10 space-y-5">
             <div className="space-y-4">
               
               {/* Role Selector for Demo */}
               <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                  <label className="block text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Nível de Acesso (Simulação)</label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-2.5 h-4 w-4 text-blue-400" />
                    <select 
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value as UserLevel)}
                      className="w-full pl-9 pr-8 py-2 bg-white border border-blue-200 rounded-lg text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-400 appearance-none cursor-pointer"
                    >
                      <option value="JUNIOR">JUNIOR (Operacional)</option>
                      <option value="PLENO">PLENO (Gestão)</option>
                      <option value="SENIOR">SENIOR (Admin)</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-blue-400 pointer-events-none" />
                  </div>
               </div>

               <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">E-mail Corporativo</label>
                 <div className="relative">
                   <Mail className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                   <input 
                     type="email"
                     className="w-full pl-11 pr-4 py-3.5 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-slate-800 bg-slate-50/50 focus:bg-white font-medium placeholder-slate-400"
                     placeholder="usuario@empresa.com"
                     value={email}
                     onChange={(e) => setEmail(e.target.value)}
                     required
                   />
                 </div>
               </div>

               <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Senha de Acesso</label>
                 <div className="relative">
                   <Lock className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                   <input 
                     type="password"
                     className="w-full pl-11 pr-4 py-3.5 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-slate-800 bg-slate-50/50 focus:bg-white font-medium placeholder-slate-400"
                     placeholder="••••••••"
                     value={password}
                     onChange={(e) => setPassword(e.target.value)}
                     required
                   />
                 </div>
               </div>

               {loginError && (
                 <div className="flex items-center gap-3 text-red-600 text-sm bg-red-50 p-4 rounded-xl border border-red-100 animate-in fade-in slide-in-from-top-2">
                   <AlertCircle className="h-5 w-5 flex-shrink-0" />
                   <span className="font-medium">{loginError}</span>
                 </div>
               )}

               <button 
                 type="submit"
                 className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-xl font-bold shadow-xl shadow-slate-900/20 transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 mt-2"
               >
                 Acessar Painel
                 <ArrowRight className="h-5 w-5" />
               </button>
               
               <div className="text-center pt-4">
                 <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 border border-green-100">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-[10px] font-bold text-green-700 uppercase tracking-wide">Servidor Online</span>
                 </div>
               </div>
             </div>
           </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 font-sans overflow-x-hidden relative">
      
      {/* Scanner Modal Overlay */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-[60] bg-black/90 flex flex-col items-center justify-center p-6">
           <button 
             onClick={() => setIsScannerOpen(false)}
             className="absolute top-6 right-6 text-white/70 hover:text-white"
           >
             <X className="h-8 w-8" />
           </button>
           
           <div className="w-full max-w-sm aspect-square border-4 border-white/30 rounded-3xl relative overflow-hidden flex flex-col items-center justify-center mb-8">
              <div className="absolute inset-0 animate-pulse bg-gradient-to-b from-transparent via-blue-500/20 to-transparent h-full w-full"></div>
              <div className="absolute h-1 w-[80%] bg-red-500/80 shadow-[0_0_15px_rgba(239,68,68,0.8)] animate-[scan_2s_ease-in-out_infinite]"></div>
              <p className="text-white/50 text-sm font-medium relative z-10">Centralize o QR Code / Código de Barras</p>
              
              <style>{`
                @keyframes scan {
                  0% { top: 10%; opacity: 0; }
                  10% { opacity: 1; }
                  90% { opacity: 1; }
                  100% { top: 90%; opacity: 0; }
                }
              `}</style>
           </div>

           <form onSubmit={handleScanSubmit} className="w-full max-w-sm">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  autoFocus
                  placeholder="Digite o código manualmente..." 
                  className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus:border-blue-500"
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                />
                <button type="submit" className="bg-blue-600 text-white px-4 rounded-xl font-bold">OK</button>
              </div>
           </form>
        </div>
      )}

      {/* Floating Sidebar */}
      <Sidebar 
        currentTab={currentTab} 
        onTabChange={setCurrentTab} 
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
        onLogout={handleLogout}
        onExportData={handleExportData}
        onImportData={handleImportData}
        userLevel={userLevel}
      />

      {/* Main Content Area - Adjusted Margins for Floating Sidebar */}
      <main className="flex-1 flex flex-col min-w-0 transition-all duration-300 lg:pl-80">
        
        {/* Top Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 h-20 flex items-center justify-between px-6 sticky top-0 z-30 lg:bg-transparent lg:border-none lg:pt-4 lg:px-8">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsMobileOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-slate-200 text-slate-600">
              <Menu className="h-6 w-6" />
            </button>
            
            {/* Breadcrumbish Title */}
            <div className="flex flex-col">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-400 uppercase tracking-wider">
                 <span>GMcontrol</span>
                 <ChevronRight className="h-3 w-3" />
                 <span className="text-slate-600">{getPageTitle()}</span>
              </div>
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{getPageTitle()}</h2>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-white/60 backdrop-blur-md p-2 rounded-full border border-white/40 shadow-sm lg:bg-white lg:shadow-sm lg:border-slate-200">
             {/* Mobile Scanner Button */}
             <button 
               onClick={() => setIsScannerOpen(true)}
               className="flex items-center justify-center p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-full transition-colors"
               title="Ler Código de Barras/QR"
             >
               <ScanLine className="h-5 w-5" />
             </button>

             {/* Search Bar */}
             <div className="hidden md:flex items-center px-3 py-1 gap-2 border-r border-slate-200">
               <Search className="h-4 w-4 text-slate-400" />
               <input type="text" placeholder="Buscar..." className="bg-transparent border-none focus:ring-0 text-sm outline-none w-48 placeholder-slate-400 text-slate-700" />
             </div>

             <button className="relative p-2 text-slate-400 hover:text-blue-600 transition-colors rounded-full hover:bg-slate-100">
               <Bell className="h-5 w-5" />
               <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full border-2 border-white"></span>
             </button>
             
             <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 p-[2px] cursor-pointer shadow-lg shadow-blue-600/20">
               <div className="h-full w-full rounded-full bg-white p-0.5">
                 <div className="h-full w-full rounded-full bg-slate-100 flex items-center justify-center overflow-hidden">
                    <User className="h-5 w-5 text-slate-500 mt-1" />
                 </div>
               </div>
             </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="p-4 md:p-8 pb-20">
          <div className="max-w-7xl mx-auto">
            {currentTab === 'dashboard' && (
              <Dashboard tires={tires} />
            )}
            
            {currentTab === 'fleet' && (
              <VehicleManager 
                vehicles={vehicles} 
                onAddVehicle={handleAddVehicle} 
                onDeleteVehicle={handleDeleteVehicle}
                onUpdateVehicle={handleUpdateVehicle}
                userLevel={userLevel}
              />
            )}

            {currentTab === 'movement' && (
              <TireMovement tires={tires} vehicles={vehicles} onUpdateTire={handleUpdateTire} userLevel={userLevel} />
            )}

            {currentTab === 'maintenance' && (
               <MaintenanceHub tires={tires} vehicles={vehicles} onUpdateTire={handleUpdateTire} userLevel={userLevel} />
            )}

            {currentTab === 'inventory' && (
              <InventoryList 
                tires={tires} 
                onDelete={handleDeleteTire} 
                onUpdateTire={handleUpdateTire} 
                userLevel={userLevel}
              />
            )}
            
            {currentTab === 'register' && (
              <TireForm 
                onAddTire={handleAddTire} 
                onCancel={() => setCurrentTab('inventory')} 
                onFinish={() => setCurrentTab('inventory')}
              />
            )}
            
            {currentTab === 'ai-insights' && (
              <AIAssistant inventory={tires} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;