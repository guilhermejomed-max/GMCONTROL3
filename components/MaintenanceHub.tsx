import React, { useState, useMemo, useEffect } from 'react';
import { Tire, Vehicle, UserLevel } from '../types';
import { generateInspectionReport } from '../services/geminiService';
import { 
  Truck, AlertTriangle, Save, Activity, AlertOctagon, 
  History, X, FileDown, Flame, ClipboardCheck, Loader2, Info, Sparkles, Layers, CheckCircle2, Container
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface MaintenanceHubProps {
  tires: Tire[];
  vehicles: Vehicle[];
  onUpdateTire: (updatedTire: Tire) => void;
  userLevel?: UserLevel;
}

export const MaintenanceHub: React.FC<MaintenanceHubProps> = ({ tires, vehicles, onUpdateTire, userLevel }) => {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(vehicles[0]?.id || '');
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
  
  // AI Report States
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportContent, setReportContent] = useState<string>('');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [hasAutoOpenedReport, setHasAutoOpenedReport] = useState(false); // Track auto-open

  // Form state for the side panel (Now supports 4 grooves)
  const [editValues, setEditValues] = useState({ 
    depth1: 0, 
    depth2: 0, 
    depth3: 0, 
    depth4: 0, 
    pressure: 0 
  });

  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
  const mountedTires = tires.filter(t => t.vehicleId === selectedVehicleId);

  const getTireAtPosition = (pos: string) => mountedTires.find(t => t.position === pos);
  const selectedTire = selectedPosition ? getTireAtPosition(selectedPosition) : null;

  // Update form values when selection changes
  useEffect(() => {
    if (selectedTire) {
      setEditValues({
        depth1: selectedTire.treadReadings?.depth1 ?? selectedTire.currentTreadDepth,
        depth2: selectedTire.treadReadings?.depth2 ?? selectedTire.currentTreadDepth,
        depth3: selectedTire.treadReadings?.depth3 ?? selectedTire.currentTreadDepth,
        depth4: selectedTire.treadReadings?.depth4 ?? selectedTire.currentTreadDepth,
        pressure: selectedTire.pressure
      });
    }
  }, [selectedTire?.id]);

  // Reset auto-open flag when vehicle changes
  useEffect(() => {
    setHasAutoOpenedReport(false);
  }, [selectedVehicleId]);

  // Calculate Vehicle Stats & Progress
  const vehicleStats = useMemo(() => {
    if (mountedTires.length === 0) return null;
    const totalPressure = mountedTires.reduce((acc, t) => acc + t.pressure, 0);
    const avgPressure = Math.round(totalPressure / mountedTires.length);
    const minTread = Math.min(...mountedTires.map(t => t.currentTreadDepth));
    const criticalTires = mountedTires.filter(t => t.currentTreadDepth < 3).length;
    
    // Progress logic: Consider inspected if updated today
    const today = new Date().toISOString().slice(0, 10);
    const inspectedTodayCount = mountedTires.filter(t => t.lastInspectionDate && t.lastInspectionDate.startsWith(today)).length;
    const totalTires = selectedVehicle ? (selectedVehicle.axles === 2 ? 6 : selectedVehicle.axles === 3 ? 10 : 14) : 0;
    const progressPercent = totalTires > 0 ? (inspectedTodayCount / totalTires) * 100 : 0;

    return { avgPressure, minTread, criticalTires, inspectedTodayCount, totalTires, progressPercent };
  }, [mountedTires, selectedVehicle]);

  // Auto-trigger Report when Progress reaches 100%
  useEffect(() => {
    if (vehicleStats && vehicleStats.progressPercent === 100 && !hasAutoOpenedReport && !isReportModalOpen) {
      setHasAutoOpenedReport(true);
      handleGenerateReport();
    }
  }, [vehicleStats, hasAutoOpenedReport, isReportModalOpen]);

  // Logic to determine wear pattern
  const wearAnalysis = useMemo(() => {
    const { depth1, depth2, depth3, depth4 } = editValues;
    const avg = (depth1 + depth2 + depth3 + depth4) / 4;
    const maxDiff = Math.max(depth1, depth2, depth3, depth4) - Math.min(depth1, depth2, depth3, depth4);
    
    let status = "Desgaste Regular";
    let color = "text-green-600";
    let advice = "Pneu desgastando uniformemente.";

    if (maxDiff > 3) {
      status = "Desgaste Irregular Crítico";
      color = "text-red-600";
      advice = "Diferença acentuada entre sulcos. Verificar alinhamento/suspensão urgentemente.";
    } else if (maxDiff > 1.5) {
      status = "Desgaste Irregular Leve";
      color = "text-yellow-600";
      if ((depth1 < depth2) && (depth4 < depth3)) {
        advice = "Desgaste nos ombros (Baixa Pressão).";
      } else if ((depth2 < depth1) && (depth3 < depth4)) {
        advice = "Desgaste central (Excesso de Pressão).";
      } else if (depth1 < depth4) {
        advice = "Desgaste unilateral externo (Camber/Convergência).";
      } else {
        advice = "Desgaste unilateral interno (Camber/Divergência).";
      }
    }

    return { status, color, advice, avg };
  }, [editValues]);

  const handleSaveInspection = () => {
    if (!selectedTire) return;

    // Calculate weighted average or minimum for safety
    const minDepth = Math.min(editValues.depth1, editValues.depth2, editValues.depth3, editValues.depth4);

    const updatedTire: Tire = {
      ...selectedTire,
      currentTreadDepth: Number(minDepth.toFixed(1)), // Store strict minimum as main stat
      treadReadings: {
        depth1: editValues.depth1,
        depth2: editValues.depth2,
        depth3: editValues.depth3,
        depth4: editValues.depth4,
      },
      pressure: editValues.pressure,
      lastInspectionDate: new Date().toISOString(),
      history: [
        ...(selectedTire.history || []),
        {
          date: new Date().toISOString(),
          action: 'INSPECAO',
          details: `Insp. Completa: Ext:${editValues.depth1}mm / Cen1:${editValues.depth2}mm / Cen2:${editValues.depth3}mm / Int:${editValues.depth4}mm - Pressão: ${editValues.pressure} PSI`
        }
      ]
    };
    onUpdateTire(updatedTire);
  };

  const handleGenerateReport = async () => {
    if (!selectedVehicle) return;
    
    setIsReportModalOpen(true);
    setIsGeneratingReport(true);
    setReportContent('');

    const report = await generateInspectionReport(selectedVehicle, mountedTires);
    
    setReportContent(report);
    setIsGeneratingReport(false);
  };

  const handleDownloadReport = () => {
    if (!selectedVehicle || !reportContent) return;
    
    const file = new Blob([reportContent], {type: 'text/plain'});
    const url = URL.createObjectURL(file);
    
    const element = document.createElement("a");
    element.href = url;
    element.download = `Inspecao-${selectedVehicle.plate}-${new Date().toISOString().slice(0, 10)}.md`;
    element.target = "_blank"; // Prevents navigating to the blob URL in the same window (Black Screen fix)
    element.rel = "noopener noreferrer";
    
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    
    // Clean up URL object after a small delay to ensure download started
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  // --- 3D VISUALIZATION HELPERS ---
  const getTreadColor = (depth: number) => {
    if (depth >= 6) return '#10b981'; // green-500
    if (depth >= 3) return '#eab308'; // yellow-500
    return '#ef4444'; // red-500
  };

  // Component for the Clickable Tire on the Diagram
  const TireNode = ({ pos, label, isInner = false }: { pos: string, label?: string, isInner?: boolean }) => {
    const tire = getTireAtPosition(pos);
    const isSelected = selectedPosition === pos;

    if (!tire) return (
      <div className={`
        h-28 w-12 flex-shrink-0 rounded-sm border-2 border-dashed border-slate-700 bg-slate-800/30 
        flex flex-col items-center justify-center text-slate-600
        ${isInner ? 'opacity-70' : ''}
      `}>
        <span className="text-[9px] font-bold">{label || pos}</span>
      </div>
    );

    // Health Logic
    const isCriticalTread = tire.currentTreadDepth < 3;
    const isLowPressure = tire.pressure < (tire.targetPressure * 0.9);
    // Check if inspected today
    const today = new Date().toISOString().slice(0, 10);
    const isInspectedToday = tire.lastInspectionDate?.startsWith(today);

    let borderColor = 'border-slate-600';
    let bgColor = 'bg-slate-700';
    let treadColor = 'bg-emerald-500';

    if (tire.currentTreadDepth < 5) treadColor = 'bg-yellow-500';
    if (isCriticalTread) {
      borderColor = 'border-red-500 animate-pulse';
      treadColor = 'bg-red-500';
    } else if (isLowPressure) {
      borderColor = 'border-orange-500';
    }
    
    if (isInspectedToday && !isCriticalTread && !isLowPressure) {
       borderColor = 'border-green-500/50';
    }

    if (isSelected) {
      borderColor = 'border-blue-400 ring-2 ring-blue-400 ring-offset-2 ring-offset-slate-900';
      bgColor = 'bg-slate-700';
    }

    return (
      <div 
        onClick={() => setSelectedPosition(pos)}
        className={`
          relative cursor-pointer transition-all duration-200
          h-28 w-12 flex-shrink-0 rounded-sm border-2 ${borderColor} ${bgColor}
          flex flex-col items-center p-1 gap-1 group
          ${isInner ? 'opacity-90' : ''}
        `}
      >
        {isInspectedToday && (
           <div className="absolute -top-2 -left-2 bg-green-500 text-white rounded-full p-0.5 shadow-md z-10">
             <CheckCircle2 className="h-3 w-3" />
           </div>
        )}

        {isLowPressure && (
          <div className="absolute -top-2 -right-2 bg-orange-500 text-white rounded-full p-0.5 shadow-md z-10 animate-bounce">
            <AlertTriangle className="h-3 w-3" />
          </div>
        )}

        <div className={`w-full h-1 rounded-full ${treadColor} mb-1`}></div>
        
        <div className="flex-1 w-full flex flex-col gap-1 opacity-30">
           <div className="w-full h-[1px] bg-white"></div>
           <div className="w-full h-[1px] bg-white"></div>
           <div className="w-full h-[1px] bg-white"></div>
        </div>

        <span className="text-[9px] font-bold text-slate-300 group-hover:text-white">{label || pos}</span>
        
        <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 px-1 rounded border text-[8px] whitespace-nowrap
          ${isLowPressure ? 'bg-orange-900 border-orange-700 text-orange-200' : 'bg-slate-900 border-slate-600 text-slate-300'}
        `}>
           {tire.pressure} PSI
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-140px)] min-h-[600px]">
      
      {/* AI Report Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-2xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center gap-2 text-purple-700">
                <Sparkles className="h-5 w-5" />
                <h3 className="font-bold text-lg">Relatório Inteligente de Manutenção</h3>
              </div>
              <button onClick={() => setIsReportModalOpen(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
               {isGeneratingReport ? (
                 <div className="flex flex-col items-center justify-center h-64 text-slate-500 gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-purple-600" />
                    <p className="text-center">
                      <span className="block font-bold text-slate-700 mb-1">Analisando Banda de Rodagem...</span>
                      A IA está cruzando dados de 4 pontos de sulco por pneu para detectar<br/>desgaste irregular e problemas de geometria.
                    </p>
                 </div>
               ) : (
                 <div className="prose prose-slate prose-sm max-w-none">
                   <ReactMarkdown>{reportContent}</ReactMarkdown>
                 </div>
               )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button 
                onClick={handleDownloadReport}
                disabled={!reportContent || isGeneratingReport}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileDown className="h-4 w-4" />
                Salvar Relatório
              </button>
              <button 
                onClick={() => setIsReportModalOpen(false)}
                className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-medium transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LEFT PANEL: DIAGRAM & SELECTOR */}
      <div className="lg:col-span-8 flex flex-col gap-6">
        
        {/* Header & Progress */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
             <div className="p-2 bg-purple-600 text-white rounded-lg shadow-lg shadow-purple-900/20">
               {selectedVehicle?.type === 'CAVALO' ? <Truck className="h-6 w-6" /> : <Container className="h-6 w-6" />}
             </div>
             <div className="flex-1">
               <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider">Inspeção Veicular</label>
               <select 
                 value={selectedVehicleId} 
                 onChange={(e) => { setSelectedVehicleId(e.target.value); setSelectedPosition(null); }}
                 className="font-bold text-lg text-slate-800 bg-transparent outline-none cursor-pointer min-w-[200px]"
               >
                 {vehicles.map(v => (
                   <option key={v.id} value={v.id}>{v.plate} - {v.model}</option>
                 ))}
               </select>
             </div>
          </div>
          
          {/* Inspection Progress */}
          {vehicleStats && (
             <div className="flex items-center gap-4 w-full md:w-auto bg-slate-50 p-2 rounded-lg border border-slate-100">
               <div className="flex flex-col items-end">
                 <span className="text-xs text-slate-500 font-medium">Progresso Hoje</span>
                 <span className="text-sm font-bold text-slate-700">
                   {vehicleStats.inspectedTodayCount} <span className="text-slate-400">/ {vehicleStats.totalTires}</span>
                 </span>
               </div>
               <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                 <div 
                   className={`h-full transition-all duration-500 ${vehicleStats.progressPercent === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                   style={{ width: `${vehicleStats.progressPercent}%` }}
                 ></div>
               </div>
             </div>
          )}

          <button
            onClick={handleGenerateReport}
            disabled={!selectedVehicle}
            className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg font-bold shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed
               ${vehicleStats && vehicleStats.progressPercent === 100 
                 ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:scale-105 animate-pulse shadow-green-500/30' 
                 : 'bg-slate-700 hover:bg-slate-800'}`}
          >
            <ClipboardCheck className="h-4 w-4" />
            {vehicleStats && vehicleStats.progressPercent === 100 ? 'Gerar Laudo Final (IA)' : 'Relatório Parcial (IA)'}
          </button>
        </div>

        {/* Diagram Container */}
        <div className="bg-slate-900 rounded-xl shadow-lg border border-slate-800 flex-1 relative overflow-hidden flex items-center justify-center py-12 px-4">
            <div className="absolute inset-0 opacity-5 pointer-events-none" 
                 style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
            </div>

            {selectedVehicle ? (
               <div className="relative flex flex-col items-center w-full max-w-lg gap-12 scale-90 sm:scale-100 transition-transform">
                  
                  {selectedVehicle.type === 'CAVALO' ? (
                     // TRUCK DIAGRAM
                     <div className="flex flex-col gap-24 w-full">
                        <div className="relative w-full flex justify-between px-12">
                          <TireNode pos="1E" label="1E" />
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-40 opacity-20 border-2 border-slate-500 rounded-t-[40px]"></div>
                          <div className="absolute top-1/2 left-20 right-20 h-3 bg-slate-700 -z-10 rounded-full"></div>
                          <TireNode pos="1D" label="1D" />
                        </div>

                        <div className="relative w-full flex flex-col gap-4">
                          <div className="absolute -top-24 bottom-0 left-[40%] w-2 bg-slate-800 border-l border-slate-700"></div>
                          <div className="absolute -top-24 bottom-0 right-[40%] w-2 bg-slate-800 border-r border-slate-700"></div>

                          <div className="flex justify-between w-full relative">
                            <div className="flex gap-1">
                              <TireNode pos="2EO" label="2EO" />
                              <TireNode pos="2EI" label="2EI" isInner />
                            </div>
                            <div className="absolute top-1/2 left-0 right-0 h-4 bg-slate-700 -z-10 rounded"></div>
                            <div className="flex gap-1">
                              <TireNode pos="2DI" label="2DI" isInner />
                              <TireNode pos="2DO" label="2DO" />
                            </div>
                          </div>

                          {selectedVehicle.axles >= 3 && (
                              <div className="flex justify-between w-full relative mt-2">
                                <div className="flex gap-1">
                                  <TireNode pos="3EO" label="3EO" />
                                  <TireNode pos="3EI" label="3EI" isInner />
                                </div>
                                <div className="absolute top-1/2 left-0 right-0 h-4 bg-slate-700 -z-10 rounded"></div>
                                <div className="flex gap-1">
                                  <TireNode pos="3DI" label="3DI" isInner />
                                  <TireNode pos="3DO" label="3DO" />
                                </div>
                              </div>
                          )}
                        </div>
                     </div>
                  ) : (
                    // TRAILER DIAGRAM
                    <div className="flex flex-col gap-12 w-full">
                       <div className="relative w-full flex justify-center">
                         <div className="w-8 h-8 bg-slate-700 rounded-full border-4 border-slate-600 mb-12"></div>
                         <div className="absolute top-4 bottom-[-400px] left-[40%] w-2 bg-slate-800 border-l border-slate-700"></div>
                         <div className="absolute top-4 bottom-[-400px] right-[40%] w-2 bg-slate-800 border-r border-slate-700"></div>
                       </div>

                       <div className="flex justify-between w-full relative z-10">
                          <div className="flex gap-1">
                            <TireNode pos="1EO" label="1EO" />
                            <TireNode pos="1EI" label="1EI" isInner />
                          </div>
                          <div className="absolute top-1/2 left-0 right-0 h-4 bg-slate-700 -z-10 rounded"></div>
                          <div className="flex gap-1">
                            <TireNode pos="1DI" label="1DI" isInner />
                            <TireNode pos="1DO" label="1DO" />
                          </div>
                      </div>

                      <div className="flex justify-between w-full relative z-10">
                          <div className="flex gap-1">
                            <TireNode pos="2EO" label="2EO" />
                            <TireNode pos="2EI" label="2EI" isInner />
                          </div>
                          <div className="absolute top-1/2 left-0 right-0 h-4 bg-slate-700 -z-10 rounded"></div>
                          <div className="flex gap-1">
                            <TireNode pos="2DI" label="2DI" isInner />
                            <TireNode pos="2DO" label="2DO" />
                          </div>
                      </div>

                      {selectedVehicle.axles >= 3 && (
                        <div className="flex justify-between w-full relative z-10">
                            <div className="flex gap-1">
                              <TireNode pos="3EO" label="3EO" />
                              <TireNode pos="3EI" label="3EI" isInner />
                            </div>
                            <div className="absolute top-1/2 left-0 right-0 h-4 bg-slate-700 -z-10 rounded"></div>
                            <div className="flex gap-1">
                              <TireNode pos="3DI" label="3DI" isInner />
                              <TireNode pos="3DO" label="3DO" />
                            </div>
                        </div>
                      )}
                    </div>
                  )}
               </div>
            ) : (
               <div className="text-slate-600 flex flex-col items-center">
                 <Truck className="h-16 w-16 opacity-20 mb-4" />
                 <p>Selecione um veículo para visualizar</p>
               </div>
            )}
        </div>
      </div>

      {/* RIGHT PANEL: DETAILED INSPECTION */}
      <div className="lg:col-span-4 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden h-full">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            {selectedPosition ? (
               <>
                 <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded">Posição {selectedPosition}</span>
                 <span>Análise de Banda</span>
               </>
            ) : (
              <span>Resumo da Frota</span>
            )}
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50/50">
           {!selectedPosition || !selectedTire ? (
             <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 space-y-4">
               <Activity className="h-12 w-12 text-slate-300" />
               <p className="max-w-[200px]">Selecione um pneu no diagrama para lançar medição detalhada de sulcos.</p>
               {vehicleStats && vehicleStats.criticalTires > 0 && (
                 <div className="bg-red-50 border border-red-100 p-4 rounded-xl w-full text-left mt-8">
                   <h4 className="font-bold text-red-700 flex items-center gap-2 mb-2">
                     <AlertOctagon className="h-4 w-4" /> Ação Necessária
                   </h4>
                   <p className="text-xs text-red-600 mb-2">Existem {vehicleStats.criticalTires} pneus com sulco abaixo do limite (3mm).</p>
                 </div>
               )}
             </div>
           ) : (
             <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                
                {/* Info Header */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                   <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="text-xs font-bold text-orange-600 uppercase tracking-wider flex items-center gap-1">
                           <Flame className="h-3 w-3" /> {selectedTire.fireNumber}
                        </div>
                        <h4 className="font-bold text-slate-800 text-sm mt-1">{selectedTire.brand} {selectedTire.model}</h4>
                      </div>
                      <div className="text-right">
                        <span className="block text-[10px] text-slate-400">Medida</span>
                        <span className="font-mono text-xs text-slate-600">{selectedTire.width}/{selectedTire.profile} R{selectedTire.rim}</span>
                      </div>
                   </div>
                </div>

                {/* --- 3D TREAD VISUALIZATION (Cross-Section SVG) --- */}
                <div className="bg-slate-900 rounded-xl border border-slate-700 overflow-hidden shadow-2xl relative flex flex-col">
                   <div className="bg-slate-800 p-2 text-center text-white text-[10px] font-bold uppercase tracking-widest border-b border-slate-700 flex justify-between items-center px-4">
                     <span className="flex items-center gap-1"><Layers className="h-3 w-3"/> Perfil Transversal (3D)</span>
                     <span className="text-slate-500">Corte da Banda</span>
                   </div>
                   
                   <div className="relative h-48 w-full bg-slate-900 flex items-center justify-center overflow-hidden">
                      {/* Technical Background */}
                      <div className="absolute inset-0 opacity-5" 
                        style={{ backgroundImage: 'linear-gradient(0deg, #fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                      </div>

                      {/* The SVG 3D Render */}
                      <svg width="100%" height="100%" viewBox="0 0 400 150" preserveAspectRatio="none" className="w-full h-full filter drop-shadow-2xl">
                        <defs>
                           <linearGradient id="rubberGradient" x1="0" x2="0" y1="0" y2="1">
                             <stop offset="0%" stopColor="#334155" />
                             <stop offset="100%" stopColor="#0f172a" />
                           </linearGradient>
                           <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                             <feGaussianBlur stdDeviation="3" result="blur" />
                             <feComposite in="SourceGraphic" in2="blur" operator="over" />
                           </filter>
                        </defs>

                        {/* TWI Line (1.6mm limit) */}
                        <line x1="0" y1="111" x2="400" y2="111" stroke="#ef4444" strokeWidth="1" strokeDasharray="4 2" opacity="0.5" />
                        <text x="380" y="108" fill="#ef4444" fontSize="8" textAnchor="end" opacity="0.8">TWI (1.6mm)</text>

                        {/* Dynamic Ribs Generation */}
                        {(() => {
                           const scale = 5; 
                           const baseY = 120; 
                           const ribWidth = 60;
                           
                           // Calculate rib heights
                           const depths = [editValues.depth1, editValues.depth2, editValues.depth3, editValues.depth4];
                           const ribHeights = [
                              depths[0], // Left Shoulder
                              (depths[0] + depths[1]) / 2, // Center 1
                              (depths[1] + depths[2]) / 2, // Center 2
                              (depths[2] + depths[3]) / 2, // Center 3
                              depths[3] // Right Shoulder
                           ];

                           const ribCenters = [40, 120, 200, 280, 360];
                           const getY = (mm: number) => baseY - (Math.min(20, mm) * scale);

                           return ribHeights.map((h, i) => {
                              const topY = getY(h);
                              const height = baseY - topY;
                              const x = ribCenters[i] - (ribWidth/2);
                              const color = getTreadColor(h);

                              return (
                                <g key={i} className="transition-all duration-500 ease-out">
                                   <path d={`M ${x + ribWidth} ${baseY} L ${x + ribWidth + 10} ${baseY - 10} L ${x + ribWidth + 10} ${topY - 10} L ${x + ribWidth} ${topY} Z`} fill="#0f172a" opacity="0.6" />
                                   <path d={`M ${x} ${topY} L ${x + 10} ${topY - 10} L ${x + ribWidth + 10} ${topY - 10} L ${x + ribWidth} ${topY} Z`} fill={color} opacity="0.8" />
                                   <rect x={x} y={topY} width={ribWidth} height={height} fill="url(#rubberGradient)" stroke={color} strokeWidth="2" rx="2" />
                                   <rect x={x+5} y={topY+5} width={ribWidth-10} height={Math.max(0, height-10)} fill="white" opacity="0.05" rx="1" />
                                   <text x={x + ribWidth/2} y={topY - 15} textAnchor="middle" fill={color} fontSize="10" fontWeight="bold">
                                     {i === 0 ? depths[0] : i === 4 ? depths[3] : i === 1 ? depths[1] : i === 3 ? depths[2] : ''} 
                                     {i !== 2 ? 'mm' : ''}
                                   </text>
                                </g>
                              );
                           });
                        })()}

                        {/* Base Plate (Casing) */}
                        <rect x="10" y="120" width="390" height="10" fill="#1e293b" />
                        <path d="M 10 120 L 20 110 L 410 110 L 400 120 Z" fill="#334155" />

                      </svg>
                   </div>

                   {/* Input Controls synchronized with Visuals */}
                   <div className="bg-slate-800 p-3 border-t border-slate-700 flex justify-between gap-2 relative z-10">
                      {[1, 2, 3, 4].map((idx) => {
                         const key = `depth${idx}` as keyof typeof editValues;
                         return (
                           <div key={idx} className="flex flex-col items-center w-full">
                              <span className="text-[9px] text-slate-400 uppercase mb-1 font-bold">
                                {idx === 1 ? 'EXT' : idx === 4 ? 'INT' : `CEN ${idx-1}`}
                              </span>
                              <input 
                                type="number"
                                step="0.1"
                                min="0"
                                max="30"
                                value={editValues[key]}
                                onChange={(e) => setEditValues({...editValues, [key]: Math.max(0, Number(e.target.value))})}
                                className="w-full bg-slate-900 border border-slate-600 text-white text-center rounded-lg text-sm py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-mono"
                              />
                           </div>
                         );
                      })}
                   </div>
                </div>

                {/* Pressure Input Area */}
                <div className="p-3 bg-slate-50 border rounded-xl border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-white border border-slate-200 rounded shadow-sm">
                          <Activity className="h-4 w-4 text-slate-500" />
                        </div>
                        <span className="text-xs font-bold text-slate-600 uppercase">Calibragem Atual</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number"
                        value={editValues.pressure}
                        onChange={e => setEditValues({...editValues, pressure: Number(e.target.value)})}
                        className={`w-24 text-center py-2 text-lg font-bold border rounded-lg outline-none focus:ring-2 transition-colors
                            ${editValues.pressure < selectedTire.targetPressure * 0.9 
                              ? 'border-red-300 bg-red-50 text-red-700 focus:ring-red-500' 
                              : 'border-slate-300 text-slate-800 focus:ring-blue-500'}`}
                      />
                      <span className="text-xs font-bold text-slate-400">PSI</span>
                    </div>
                </div>

                {/* Analysis Box */}
                <div className={`p-4 rounded-xl border ${wearAnalysis.color === 'text-green-600' ? 'bg-green-50 border-green-100' : wearAnalysis.color === 'text-yellow-600' ? 'bg-yellow-50 border-yellow-100' : 'bg-red-50 border-red-100'}`}>
                   <div className="flex items-center gap-2 mb-2">
                      <Info className={`h-4 w-4 ${wearAnalysis.color}`} />
                      <h4 className={`text-sm font-bold ${wearAnalysis.color}`}>{wearAnalysis.status}</h4>
                   </div>
                   <p className="text-xs text-slate-600 leading-relaxed">
                     {wearAnalysis.advice}
                   </p>
                   <div className="mt-2 pt-2 border-t border-black/5 flex justify-between text-xs text-slate-500">
                      <span>Média: {wearAnalysis.avg.toFixed(1)}mm</span>
                      <span>Original: {selectedTire.originalTreadDepth}mm</span>
                   </div>
                </div>

                {/* Action Buttons */}
                <button 
                   onClick={handleSaveInspection}
                   className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/20 hover:scale-[1.02]"
                >
                   <Save className="h-5 w-5" />
                   Salvar Inspeção Detalhada
                </button>

                {/* History Mini View */}
                <div className="border-t border-slate-200 pt-4">
                   <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                     <History className="h-3 w-3" /> Histórico Recente
                   </h5>
                   <div className="space-y-2">
                      {selectedTire.history && selectedTire.history.slice().reverse().slice(0, 2).map((log, idx) => (
                        <div key={idx} className="text-xs p-2 bg-slate-50 rounded border border-slate-100">
                           <div className="flex justify-between text-slate-400 mb-1">
                              <span>{new Date(log.date).toLocaleDateString()}</span>
                              <span className="font-bold text-slate-600">{log.action}</span>
                           </div>
                           <p className="text-slate-600 line-clamp-1">{log.details}</p>
                        </div>
                      ))}
                   </div>
                </div>

             </div>
           )}
        </div>
        
        {selectedPosition && (
          <div className="p-4 border-t border-slate-200 bg-slate-50">
            <button 
              onClick={() => setSelectedPosition(null)}
              className="w-full py-2 text-sm font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <X className="h-4 w-4" /> Fechar Painel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};