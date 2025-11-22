import React, { useState, useMemo } from 'react';
import { Tire, TireStatus, UserLevel } from '../types';
import { Search, Trash2, MapPin, AlertTriangle, Truck, History, ChevronDown, ChevronUp, Box, Flame, Recycle, CheckCircle2, DollarSign, Lock, QrCode, Printer, X } from 'lucide-react';
import QRCode from 'react-qr-code';

interface InventoryListProps {
  tires: Tire[];
  onDelete: (id: string) => void;
  onUpdateTire?: (tire: Tire) => void; 
  userLevel: UserLevel;
}

export const InventoryList: React.FC<InventoryListProps> = ({ tires, onDelete, onUpdateTire, userLevel }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'stock' | 'all' | 'retread'>('stock');
  const [expandedTireId, setExpandedTireId] = useState<string | null>(null);

  // Retread Modal States
  const [retreadModal, setRetreadModal] = useState<{ open: boolean, type: 'SEND' | 'RECEIVE', tireId: string | null }>({ open: false, type: 'SEND', tireId: null });
  const [retreadData, setRetreadData] = useState({ cost: 0, newTreadDepth: 15 });

  // QR Code Modal State
  const [qrTire, setQrTire] = useState<Tire | null>(null);

  const filteredTires = useMemo(() => {
    let data = tires;

    // Filter by Tab
    if (activeTab === 'stock') {
      // Only show tires NOT mounted on a vehicle and NOT in retreading
      data = data.filter(t => !t.vehicleId && t.status !== TireStatus.RETREADING);
    } else if (activeTab === 'retread') {
      data = data.filter(t => t.status === TireStatus.RETREADING);
    }
    // 'all' shows everything

    // Filter by Search Term
    return data.filter(tire => 
      (tire.fireNumber && tire.fireNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      tire.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tire.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tire.dot.includes(searchTerm) ||
      tire.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tire.vehicleId && tire.location.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [tires, searchTerm, activeTab]);

  const toggleExpand = (id: string) => {
    if (expandedTireId === id) {
      setExpandedTireId(null);
    } else {
      setExpandedTireId(id);
    }
  };

  const getHealthColor = (percent: number) => {
    if (percent > 70) return 'bg-green-500';
    if (percent > 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const handlePrintQr = () => {
    if (!qrTire) return;
    const printWindow = window.open('', '', 'width=300,height=300');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${qrTire.fireNumber}</title>
            <style>
              @page { size: 2.2cm 2.2cm; margin: 0; }
              body { font-family: sans-serif; margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; height: 100vh; overflow: hidden; }
              .qr-wrapper { 
                width: 76px; /* ~2cm at 96dpi */
                height: 76px; 
                display: flex; 
                flex-direction: column; 
                align-items: center; 
                justify-content: center; 
                text-align: center;
              }
              h1 { margin: 0; font-size: 7px; font-weight: 900; line-height: 1.1; margin-top: 2px; }
              .qr-code { line-height: 0; }
              .qr-code svg { width: 58px !important; height: 58px !important; }
            </style>
          </head>
          <body>
             <div class="qr-wrapper">
               <div class="qr-code">
                 ${document.getElementById('inventory-qr-code')?.innerHTML || ''}
               </div>
               <h1>${qrTire.fireNumber}</h1>
             </div>
             <script>
               window.onload = () => { window.print(); window.close(); }
             </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  // --- Retread Logic ---
  const openRetreadModal = (tireId: string, type: 'SEND' | 'RECEIVE') => {
    setRetreadModal({ open: true, type, tireId });
    setRetreadData({ cost: 0, newTreadDepth: 15 });
  };

  const handleRetreadSubmit = () => {
    if (!onUpdateTire || !retreadModal.tireId) return;
    const tire = tires.find(t => t.id === retreadModal.tireId);
    if (!tire) return;

    let updatedTire: Tire;

    if (retreadModal.type === 'SEND') {
      updatedTire = {
        ...tire,
        status: TireStatus.RETREADING,
        location: 'Reformadora',
        history: [
          ...(tire.history || []),
          { date: new Date().toISOString(), action: 'ENVIADO_RECAPAGEM', details: 'Enviado para recauchutagem' }
        ]
      };
    } else {
      // RECEIVE
      const newInvestment = (tire.totalInvestment || tire.price) + retreadData.cost;
      const newCount = (tire.retreadCount || 0) + 1;
      
      updatedTire = {
        ...tire,
        status: TireStatus.RETREADED,
        location: 'Estoque (Recapado)',
        currentTreadDepth: retreadData.newTreadDepth,
        totalInvestment: newInvestment,
        retreadCount: newCount,
        history: [
          ...(tire.history || []),
          { 
            date: new Date().toISOString(), 
            action: 'RETORNO_RECAPAGEM', 
            details: `Retornou da reforma. Custo: R$${retreadData.cost}. Sulco: ${retreadData.newTreadDepth}mm. Vida: ${newCount}` 
          }
        ]
      };
    }

    onUpdateTire(updatedTire);
    setRetreadModal({ open: false, type: 'SEND', tireId: null });
  };

  return (
    <div className="space-y-6 relative">
      
      {/* QR Code Modal */}
      {qrTire && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm p-8 rounded-2xl shadow-xl animate-in zoom-in-95 text-center relative">
             <button 
               onClick={() => setQrTire(null)}
               className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
             >
               <X className="h-6 w-6" />
             </button>
             
             <h3 className="text-xl font-bold text-slate-800 mb-6">Etiqueta do Pneu</h3>
             
             <div className="bg-white p-2 inline-block mb-4" id="inventory-qr-code">
               <QRCode 
                 value={JSON.stringify({ id: qrTire.id, fire: qrTire.fireNumber })}
                 size={180}
                 level="M"
               />
             </div>

             <h2 className="text-2xl font-black text-slate-800 mb-1">{qrTire.fireNumber}</h2>
             <p className="text-slate-500 text-sm mb-6">{qrTire.brand} {qrTire.model}</p>

             <button 
               onClick={handlePrintQr}
               className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold shadow-lg shadow-slate-900/20 transition-all flex items-center justify-center gap-2"
             >
               <Printer className="h-5 w-5" />
               Imprimir Etiqueta (2x2cm)
             </button>
          </div>
        </div>
      )}

      {/* Retread Modal */}
      {retreadModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
           <div className="bg-white w-full max-w-md p-6 rounded-2xl shadow-xl animate-in zoom-in-95">
              <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Recycle className="h-6 w-6 text-purple-600" />
                {retreadModal.type === 'SEND' ? 'Enviar para Recapagem' : 'Receber da Recapagem'}
              </h3>
              
              {retreadModal.type === 'SEND' ? (
                <p className="text-slate-600 mb-6">
                  O pneu será movido para o status <strong>Em Recapagem</strong> e ficará indisponível para uso até o retorno.
                </p>
              ) : (
                <div className="space-y-4 mb-6">
                  <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">Custo da Reforma (R$)</label>
                     <input 
                       type="number" 
                       className="w-full p-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-purple-500"
                       value={retreadData.cost}
                       onChange={e => setRetreadData({...retreadData, cost: Number(e.target.value)})}
                     />
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">Novo Sulco (mm)</label>
                     <input 
                       type="number" 
                       className="w-full p-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-purple-500"
                       value={retreadData.newTreadDepth}
                       onChange={e => setRetreadData({...retreadData, newTreadDepth: Number(e.target.value)})}
                     />
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button 
                  onClick={() => setRetreadModal({...retreadModal, open: false})}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleRetreadSubmit}
                  className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium"
                >
                  Confirmar
                </button>
              </div>
           </div>
        </div>
      )}

      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-start sm:items-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Gerenciamento de Pneus</h2>
            <p className="text-slate-500 text-sm mt-1">
              {activeTab === 'stock' 
                ? 'Visualizando apenas pneus disponíveis no almoxarifado.' 
                : activeTab === 'retread' ? 'Pneus atualmente na reformadora.' 
                : 'Histórico completo de todos os pneus cadastrados.'}
            </p>
          </div>
        </div>
        
        {/* Tabs and Search Row */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-1 rounded-lg border border-slate-200">
          <div className="flex bg-slate-100 rounded-lg p-1 w-full sm:w-auto overflow-x-auto">
             <button
                onClick={() => setActiveTab('stock')}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
                  activeTab === 'stock' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
             >
               <Box className="h-4 w-4" />
               Em Estoque
             </button>
             <button
                onClick={() => setActiveTab('retread')}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
                  activeTab === 'retread' 
                    ? 'bg-white text-purple-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
             >
               <Recycle className="h-4 w-4" />
               Em Reforma
             </button>
             <button
                onClick={() => setActiveTab('all')}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
                  activeTab === 'all' 
                    ? 'bg-white text-slate-800 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
             >
               <History className="h-4 w-4" />
               Histórico Geral
             </button>
          </div>

          <div className="relative w-full sm:w-72">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar por N° Fogo, marca, DOT..."
              className="pl-10 pr-4 py-2 w-full border-none bg-transparent focus:ring-0 text-sm outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {filteredTires.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl border-2 border-dashed border-slate-300 text-slate-500">
          <AlertTriangle className="h-12 w-12 mb-3 text-slate-400" />
          <p className="text-lg font-medium">Nenhum pneu encontrado</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-800 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 w-10"></th>
                  <th className="px-6 py-4">N° Fogo / Info</th>
                  <th className="px-6 py-4 text-center">Performance (CPK)</th>
                  <th className="px-6 py-4 text-center">Saúde (Sulco)</th>
                  <th className="px-6 py-4 text-center">Status / Vida</th>
                  <th className="px-6 py-4 text-center">Localização Atual</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTires.map((tire) => {
                   const healthPercent = Math.min(100, Math.max(0, (tire.currentTreadDepth / tire.originalTreadDepth) * 100));
                   const cpk = tire.costPerKm || 0;
                   
                   return (
                  <React.Fragment key={tire.id}>
                    <tr 
                      className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${expandedTireId === tire.id ? 'bg-slate-50' : ''}`}
                      onClick={() => toggleExpand(tire.id)}
                    >
                      <td className="px-6 py-5 text-center">
                        {expandedTireId === tire.id ? <ChevronUp className="h-4 w-4 text-slate-400"/> : <ChevronDown className="h-4 w-4 text-slate-400"/>}
                      </td>
                      <td className="px-6 py-5">
                         <div className="flex items-center gap-3">
                            <div className="bg-orange-50 p-2 rounded-lg border border-orange-100">
                               <Flame className="h-5 w-5 text-orange-600" />
                            </div>
                            <div>
                               <span className="font-black text-slate-800 text-base block">{tire.fireNumber}</span>
                               <span className="text-xs text-slate-500 font-medium">{tire.brand} - {tire.model}</span>
                            </div>
                         </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col items-center justify-center h-full">
                          {userLevel !== 'JUNIOR' ? (
                             <>
                                {cpk > 0 ? (
                                  <div className="flex items-center gap-1.5 text-emerald-700 font-bold bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 shadow-sm w-fit">
                                     <DollarSign className="h-3.5 w-3.5" />
                                     {cpk.toFixed(4)} <span className="text-[9px] text-emerald-500 font-normal uppercase">/km</span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 w-fit">
                                    Sem dados CPK
                                  </span>
                                )}
                             </>
                          ) : (
                             <span className="flex items-center gap-1 text-xs text-slate-400">
                               <Lock className="h-3 w-3" /> Restrito
                             </span>
                          )}
                          <span className="text-[10px] font-semibold text-slate-400 mt-1.5">
                             {tire.totalKms > 0 ? `Rodou ${tire.totalKms.toLocaleString()} km` : 'Sem rodagem'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="w-full max-w-[120px] mx-auto">
                          <div className="flex justify-between text-xs mb-1.5">
                            <span className="font-bold text-slate-700">{tire.currentTreadDepth}mm</span>
                            <span className="text-slate-400 font-medium">{Math.round(healthPercent)}%</span>
                          </div>
                          <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                            <div 
                              className={`h-full ${getHealthColor(healthPercent)} transition-all duration-500`} 
                              style={{ width: `${healthPercent}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-sm
                               ${tire.status === 'Novo' ? 'bg-green-50 text-green-700 border-green-100' : 
                                 tire.status === 'Em Recapagem' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                 tire.status === 'Recauchutado' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                                 'bg-yellow-50 text-yellow-700 border-yellow-100'}`}>
                               <div className={`h-1.5 w-1.5 rounded-full ${
                                 tire.status === 'Novo' ? 'bg-green-500' : 
                                 tire.status === 'Em Recapagem' ? 'bg-purple-500' :
                                 tire.status === 'Recauchutado' ? 'bg-orange-500' :
                                 'bg-yellow-500'
                               }`}></div>
                               {tire.status}
                          </div>
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md">
                            {(tire.retreadCount || 0) === 0 ? '1ª Vida' : `${(tire.retreadCount || 0) + 1}ª Vida`}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex justify-center">
                          {tire.vehicleId ? (
                            <div className="flex items-center justify-center gap-1.5 text-blue-600 font-medium bg-blue-50 px-3 py-1 rounded-full w-fit border border-blue-100 shadow-sm">
                              <Truck className="h-3.5 w-3.5" />
                              <span className="text-xs">{tire.location}</span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-1.5 text-slate-600 bg-slate-100 px-3 py-1 rounded-full w-fit border border-slate-200">
                              <MapPin className="h-3.5 w-3.5 text-slate-400" />
                              <span className="text-xs">{tire.location}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex justify-end items-center gap-2">
                           {/* QR Code Action */}
                           <button 
                              onClick={(e) => { e.stopPropagation(); setQrTire(tire); }}
                              className="text-slate-500 hover:text-slate-800 hover:bg-slate-200 p-2 rounded-full transition-colors"
                              title="Ver QR Code / Etiqueta"
                           >
                              <QrCode className="h-4 w-4" />
                           </button>

                           {/* Lifecycle Actions (Not for Junior) */}
                           {userLevel !== 'JUNIOR' && tire.status !== TireStatus.RETREADING && onUpdateTire && !tire.vehicleId && (
                             <button 
                               onClick={(e) => { e.stopPropagation(); openRetreadModal(tire.id, 'SEND'); }}
                               className="text-purple-500 hover:text-purple-700 hover:bg-purple-50 p-2 rounded-full transition-colors"
                               title="Enviar para Recapagem"
                             >
                               <Recycle className="h-4 w-4" />
                             </button>
                           )}
                           
                           {userLevel !== 'JUNIOR' && tire.status === TireStatus.RETREADING && onUpdateTire && (
                             <button 
                               onClick={(e) => { e.stopPropagation(); openRetreadModal(tire.id, 'RECEIVE'); }}
                               className="text-green-500 hover:text-green-700 hover:bg-green-50 p-2 rounded-full transition-colors"
                               title="Receber da Recapagem"
                             >
                               <CheckCircle2 className="h-4 w-4" />
                             </button>
                           )}

                          {/* Delete only for Senior */}
                          {userLevel === 'SENIOR' && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); onDelete(tire.id); }}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-full transition-colors"
                                title="Excluir"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    
                    {/* Expanded History View */}
                    {expandedTireId === tire.id && (
                      <tr className="bg-slate-50/50">
                        <td colSpan={7} className="px-6 py-4">
                          <div className="ml-8 border-l-2 border-slate-200 pl-6 space-y-4">
                            <div className="grid grid-cols-3 gap-4 mb-4">
                               <div className="bg-white p-3 rounded border border-slate-100 shadow-sm">
                                 <span className="text-xs text-slate-400 uppercase block font-bold mb-1">Investimento Total</span>
                                 {userLevel !== 'JUNIOR' ? (
                                   <span className="font-bold text-slate-700 text-lg">R$ {(tire.totalInvestment || tire.price).toFixed(2)}</span>
                                 ) : (
                                   <span className="font-bold text-slate-400 text-xs flex items-center gap-1"><Lock className="h-3 w-3"/> Oculto</span>
                                 )}
                               </div>
                               <div className="bg-white p-3 rounded border border-slate-100 shadow-sm">
                                 <span className="text-xs text-slate-400 uppercase block font-bold mb-1">Sulco Original</span>
                                 <span className="font-bold text-slate-700 text-lg">{tire.originalTreadDepth}mm</span>
                               </div>
                               <div className="bg-white p-3 rounded border border-slate-100 shadow-sm">
                                 <span className="text-xs text-slate-400 uppercase block font-bold mb-1">DOT</span>
                                 <span className="font-bold text-slate-700 text-lg">{tire.dot}</span>
                               </div>
                            </div>

                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                <History className="h-3 w-3" /> Histórico de Movimentação
                              </h4>
                            </div>
                            
                            {(!tire.history || tire.history.length === 0) ? (
                              <p className="text-sm text-slate-400 italic">Sem histórico registrado.</p>
                            ) : (
                              <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                {tire.history.slice().reverse().map((log, idx) => (
                                  <div key={idx} className="flex items-start gap-3 text-sm relative group">
                                    <div className={`absolute left-[5.5rem] top-0 bottom-0 w-px bg-slate-200 group-last:hidden`}></div>
                                    <span className="text-slate-400 text-xs w-20 flex-shrink-0 font-mono pt-0.5">
                                      {new Date(log.date).toLocaleDateString('pt-BR')}
                                    </span>
                                    <div className={`relative z-10 h-2.5 w-2.5 rounded-full border-2 border-white ring-1 mt-1
                                      ${log.action === 'MONTADO' ? 'bg-blue-500 ring-blue-200' : 
                                        log.action === 'DESMONTADO' ? 'bg-orange-500 ring-orange-200' : 
                                        log.action === 'INSPECAO' ? 'bg-purple-500 ring-purple-200' :
                                        log.action.includes('RECAPAGEM') ? 'bg-green-500 ring-green-200' :
                                        log.action === 'REPARO' ? 'bg-red-500 ring-red-200' :
                                        'bg-slate-500 ring-slate-200'}`}>
                                    </div>
                                    <div className="flex flex-col bg-white p-2 rounded border border-slate-100 flex-1 shadow-sm">
                                      <span className="font-bold text-xs text-slate-700 mb-0.5">
                                        {log.action.replace('_', ' ')}
                                      </span>
                                      <span className="text-slate-600 text-xs leading-relaxed">{log.details}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );})}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};