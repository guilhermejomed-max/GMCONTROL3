import React, { useState } from 'react';
import { Tire, Vehicle, TireStatus, UserLevel } from '../types';
import { Truck, ArrowRight, RotateCcw, AlertCircle, X, CheckCircle2, Hammer, Wrench, Flame, Gauge, ScanLine, QrCode, Zap, Container, Printer } from 'lucide-react';
import QRCode from 'react-qr-code';

interface TireMovementProps {
  tires: Tire[];
  vehicles: Vehicle[];
  onUpdateTire: (updatedTire: Tire) => void;
  userLevel?: UserLevel;
}

const ALL_POSITIONS = [
  { id: '1E', label: 'Eixo Dianteiro - Esquerdo' },
  { id: '1D', label: 'Eixo Dianteiro - Direito' },
  { id: '2EO', label: 'Tração 1 - Esquerdo Externo' },
  { id: '2EI', label: 'Tração 1 - Esquerdo Interno' },
  { id: '2DI', label: 'Tração 1 - Direito Interno' },
  { id: '2DO', label: 'Tração 1 - Direito Externo' },
  { id: '3EO', label: 'Tração 2 - Esquerdo Externo' },
  { id: '3EI', label: 'Tração 2 - Esquerdo Interno' },
  { id: '3DI', label: 'Tração 2 - Direito Interno' },
  { id: '3DO', label: 'Tração 2 - Direito Externo' },
];

export const TireMovement: React.FC<TireMovementProps> = ({ tires, vehicles, onUpdateTire, userLevel }) => {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(vehicles[0]?.id || '');
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
  
  // State for the mounting modal
  const [tireToMount, setTireToMount] = useState<Tire | null>(null);
  const [manualPosition, setManualPosition] = useState<string>('');
  const [successMountedTire, setSuccessMountedTire] = useState<Tire | null>(null); // NEW: Modal Success

  // State for Dismount Modal (CPK Logic)
  const [tireToDismount, setTireToDismount] = useState<Tire | null>(null);
  const [dismountOdometer, setDismountOdometer] = useState<number>(0);

  // State for Repair Modal
  const [isRepairModalOpen, setIsRepairModalOpen] = useState(false);
  const [repairDetails, setRepairDetails] = useState('');

  // State for Mount Scanner
  const [isMountScannerOpen, setIsMountScannerOpen] = useState(false);
  const [scanInput, setScanInput] = useState('');

  // --- JUNIOR QUICK SWAP STATES ---
  const [isQuickSwapOpen, setIsQuickSwapOpen] = useState(false);
  const [quickSwapStep, setQuickSwapStep] = useState<'PLATE' | 'DISMOUNT' | 'MOUNT'>('PLATE');
  const [quickSwapData, setQuickSwapData] = useState<{vehicleId?: string, position?: string}>({});

  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);

  // Filter tires currently on this vehicle
  const mountedTires = tires.filter(t => t.vehicleId === selectedVehicleId);
  
  // Filter available tires (stock) - STRICTLY tires with no vehicleId
  const availableTires = tires.filter(t => !t.vehicleId && t.status !== TireStatus.DAMAGED && t.status !== TireStatus.RETREADING);

  const getTireAtPosition = (pos: string) => mountedTires.find(t => t.position === pos);

  // Helper to check if a position is free
  const isPositionOccupied = (pos: string) => mountedTires.some(t => t.position === pos);

  const triggerMountFlow = (tire: Tire) => {
    if (!selectedVehicle) return;

    // Scenario A: User already selected a slot on the diagram
    if (selectedPosition) {
      executeMount(tire, selectedPosition);
    } 
    // Scenario B: User clicked the tire list first -> Open Modal
    else {
      setTireToMount(tire);
      setManualPosition('');
    }
  };

  const executeMount = (tire: Tire, position: string, overrideVehicleId?: string) => {
    const vehicleId = overrideVehicleId || selectedVehicle?.id;
    const vehicle = vehicles.find(v => v.id === vehicleId);
    
    if (!vehicle) return;

    const updatedTire: Tire = {
      ...tire,
      vehicleId: vehicle.id,
      position: position,
      location: `${vehicle.plate} - ${position}`,
      status: tire.status === TireStatus.NEW ? TireStatus.USED : tire.status, // Muda para usado se for novo
      installOdometer: vehicle.odometer, // CAPTURA O KM ATUAL DO VEÍCULO
      history: [
        ...(tire.history || []),
        {
          date: new Date().toISOString(),
          action: 'MONTADO',
          details: `Montado no veículo ${vehicle.plate} pos ${position} com KM ${vehicle.odometer}`
        }
      ]
    };
    onUpdateTire(updatedTire);
    
    // Show Success Modal
    setSuccessMountedTire(updatedTire);

    // Reset operational states
    setTireToMount(null);
    setManualPosition('');
    setIsMountScannerOpen(false);
    setScanInput('');
    // Note: We do NOT clear selectedPosition here to allow user to see the result behind modal,
    // but we will clear it when they close the modal.
  };

  const openDismountModal = (tire: Tire) => {
    setTireToDismount(tire);
    setDismountOdometer(selectedVehicle?.odometer || 0);
  };

  const confirmDismount = (tire: Tire, finalOdometer: number) => {
    const installKm = tire.installOdometer || finalOdometer; // Fallback logic
    const kmsRun = Math.max(0, finalOdometer - installKm);
    const newTotalKms = (tire.totalKms || 0) + kmsRun;
    
    // CPK Calculation
    const totalInvested = tire.totalInvestment || tire.price;
    const newCPK = newTotalKms > 0 ? (totalInvested / newTotalKms) : 0;

    const updatedTire: Tire = {
      ...tire,
      vehicleId: null,
      position: null,
      location: 'Estoque (Retorno)',
      installOdometer: undefined, // Reset installation odometer
      totalKms: newTotalKms,
      costPerKm: newCPK,
      history: [
        ...(tire.history || []),
        {
          date: new Date().toISOString(),
          action: 'DESMONTADO',
          details: `Desmontado. Rodou ${kmsRun}km. CPK Atual: R$ ${newCPK.toFixed(4)}`
        }
      ]
    };

    onUpdateTire(updatedTire);
    setTireToDismount(null);
    setSelectedPosition(null);
  };

  const handleSaveRepair = () => {
    if (!selectedPosition || !repairDetails.trim()) return;
    
    const tire = getTireAtPosition(selectedPosition);
    if (!tire) return;

    const updatedTire: Tire = {
      ...tire,
      history: [
        ...(tire.history || []),
        {
          date: new Date().toISOString(),
          action: 'REPARO',
          details: repairDetails
        }
      ]
    };

    onUpdateTire(updatedTire);
    setIsRepairModalOpen(false);
    setRepairDetails('');
    alert('Reparo registrado com sucesso!');
  };

  const handleMountScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPosition || !scanInput) return;

    let tireIdToFind = scanInput;
    
    try {
      const parsed = JSON.parse(scanInput);
      if (parsed.id) tireIdToFind = parsed.id;
      if (parsed.fire) tireIdToFind = parsed.fire;
    } catch (e) {}

    const foundTire = availableTires.find(t => 
      t.id === tireIdToFind || 
      t.fireNumber.toLowerCase() === scanInput.toLowerCase()
    );

    if (foundTire) {
      executeMount(foundTire, selectedPosition);
    } else {
      alert(`Pneu não encontrado no estoque disponível ou código inválido: ${scanInput}`);
      setScanInput('');
    }
  };

  // --- PRINT QR CODE ---
  const handlePrintQr = () => {
    if (!successMountedTire) return;
    const printWindow = window.open('', '', 'width=300,height=300');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${successMountedTire.fireNumber}</title>
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
                 ${document.getElementById('mount-success-qr')?.innerHTML || ''}
               </div>
               <h1>${successMountedTire.fireNumber}</h1>
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

  // --- QUICK SWAP HANDLER (JUNIOR) ---
  const handleQuickSwapSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const input = scanInput.trim().toUpperCase();

    if (quickSwapStep === 'PLATE') {
      const vehicle = vehicles.find(v => v.plate === input);
      if (vehicle) {
        setQuickSwapData({ ...quickSwapData, vehicleId: vehicle.id });
        setSelectedVehicleId(vehicle.id); // Sync UI
        setQuickSwapStep('DISMOUNT');
        setScanInput('');
      } else {
        alert("Veículo não encontrado.");
        setScanInput('');
      }
    } 
    else if (quickSwapStep === 'DISMOUNT') {
      let tireId = input;
      try {
         const p = JSON.parse(input);
         if(p.id) tireId = p.id;
      } catch(e){}

      // Find this tire ON the vehicle
      const tire = tires.find(t => 
        t.vehicleId === quickSwapData.vehicleId && 
        (t.id === tireId || t.fireNumber.toUpperCase() === tireId)
      );

      if (tire && tire.position) {
        // Auto dismount without prompt
        const vehicle = vehicles.find(v => v.id === quickSwapData.vehicleId);
        confirmDismount(tire, vehicle?.odometer || 0);
        
        setQuickSwapData({ ...quickSwapData, position: tire.position });
        setQuickSwapStep('MOUNT');
        setScanInput('');
      } else {
        alert("Pneu não encontrado neste veículo.");
        setScanInput('');
      }
    }
    else if (quickSwapStep === 'MOUNT') {
      let tireId = input;
      try {
         const p = JSON.parse(input);
         if(p.id) tireId = p.id;
      } catch(e){}

      // Find in STOCK
      const tire = availableTires.find(t => 
        t.id === tireId || t.fireNumber.toUpperCase() === tireId
      );

      if (tire && quickSwapData.position) {
        executeMount(tire, quickSwapData.position, quickSwapData.vehicleId);
        alert("Pneu montado com sucesso! Operação finalizada.");
        setIsQuickSwapOpen(false);
        setScanInput('');
      } else {
        alert("Pneu não encontrado no estoque.");
        setScanInput('');
      }
    }
  };

  // Visual Representation of a Tire Slot
  const TireSlot = ({ pos, label, isInner = false }: { pos: string, label?: string, isInner?: boolean }) => {
    const tire = getTireAtPosition(pos);
    const isSelected = selectedPosition === pos;

    return (
      <div 
        onClick={() => setSelectedPosition(pos)}
        className={`
          relative cursor-pointer transition-all duration-200
          h-28 w-12 flex-shrink-0
          ${tire 
            ? 'bg-slate-700 border-2 border-green-500 shadow-lg shadow-green-500/20' 
            : 'bg-slate-100/10 border-2 border-dashed border-slate-500 hover:border-blue-400'}
          ${isSelected ? 'ring-4 ring-blue-500 ring-offset-2 ring-offset-slate-900 scale-105 z-20' : ''}
          rounded-sm flex flex-col items-center justify-center
          ${isInner ? 'opacity-90' : ''}
        `}
      >
        {tire ? (
          <div className="flex flex-col items-center gap-1 w-full px-1">
            <div className="w-full h-[2px] bg-slate-600"></div>
            <div className="w-full h-[2px] bg-slate-600"></div>
            <div className="w-full h-[2px] bg-slate-600"></div>
            
            <span className="text-[9px] text-green-400 font-bold mt-2">{label || pos}</span>
            <span className="text-[7px] text-slate-400 bg-slate-800 px-1 rounded">{tire.fireNumber}</span>
          </div>
        ) : (
          <span className="text-[10px] font-bold text-slate-500">{label || pos}</span>
        )}
        {tire && (
           <div className="absolute top-1 right-1 h-2 w-2 bg-green-500 rounded-full"></div>
        )}
      </div>
    );
  };

  const renderTruckDiagram = (vehicle: Vehicle) => (
    <div className="relative flex flex-col items-center w-full max-w-lg gap-24">
      {/* Front Axle */}
      <div className="relative w-full flex justify-between px-12">
        <div className="flex flex-col items-center">
          <TireSlot pos="1E" label="1E" />
          <div className="h-8 w-[2px] bg-slate-600 mt-2"></div> 
        </div>

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-40 opacity-20 border-2 border-slate-500 rounded-t-[40px]"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-700 font-black text-5xl tracking-tighter select-none">
          CAVALO
        </div>

        <div className="flex flex-col items-center">
          <TireSlot pos="1D" label="1D" />
          <div className="h-8 w-[2px] bg-slate-600 mt-2"></div>
        </div>
        
        <div className="absolute top-[50%] left-20 right-20 h-3 bg-slate-700 -z-10 rounded-full"></div>
      </div>

      {/* Rear Drives */}
      <div className="relative w-full flex flex-col gap-4">
        <div className="absolute -top-24 bottom-0 left-[40%] w-2 bg-slate-800 border-l border-slate-700"></div>
        <div className="absolute -top-24 bottom-0 right-[40%] w-2 bg-slate-800 border-r border-slate-700"></div>

        <div className="flex justify-between w-full relative">
          <div className="flex gap-1">
            <TireSlot pos="2EO" label="2EO" />
            <TireSlot pos="2EI" label="2EI" isInner />
          </div>
          <div className="absolute top-1/2 left-0 right-0 h-4 bg-slate-700 -z-10 rounded"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-slate-800 rounded-full border-4 border-slate-700 -z-0"></div>
          <div className="flex gap-1">
            <TireSlot pos="2DI" label="2DI" isInner />
            <TireSlot pos="2DO" label="2DO" />
          </div>
        </div>

        {vehicle.axles >= 3 && (
          <div className="flex justify-between w-full relative mt-2">
            <div className="flex gap-1">
              <TireSlot pos="3EO" label="3EO" />
              <TireSlot pos="3EI" label="3EI" isInner />
            </div>
            <div className="absolute top-1/2 left-0 right-0 h-4 bg-slate-700 -z-10 rounded"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-slate-800 rounded-full border-4 border-slate-700 -z-0"></div>
            <div className="flex gap-1">
              <TireSlot pos="3DI" label="3DI" isInner />
              <TireSlot pos="3DO" label="3DO" />
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderTrailerDiagram = (vehicle: Vehicle) => (
    <div className="relative flex flex-col items-center w-full max-w-lg gap-12">
      {/* Kingpin Area */}
      <div className="relative w-full flex justify-center">
         <div className="w-8 h-8 bg-slate-700 rounded-full border-4 border-slate-600 mb-24"></div>
         <div className="absolute top-4 bottom-[-400px] left-[40%] w-2 bg-slate-800 border-l border-slate-700"></div>
         <div className="absolute top-4 bottom-[-400px] right-[40%] w-2 bg-slate-800 border-r border-slate-700"></div>
         
         <div className="absolute top-0 left-1/2 -translate-x-1/2 text-slate-700 font-black text-5xl tracking-tighter select-none opacity-20">
            CARRETA
         </div>
      </div>

      {/* Trailer Axles (Generic mapping for simplicity: Using existing IDs but visualizing differently) */}
      {/* Assuming Carreta uses positions 1, 2, 3 (mapped to 1xx, 2xx, 3xx IDs) */}
      
      <div className="flex justify-between w-full relative z-10">
          <div className="flex gap-1">
            <TireSlot pos="1EO" label="1EO" />
            <TireSlot pos="1EI" label="1EI" isInner />
          </div>
          <div className="absolute top-1/2 left-0 right-0 h-4 bg-slate-700 -z-10 rounded"></div>
          <div className="flex gap-1">
            <TireSlot pos="1DI" label="1DI" isInner />
            <TireSlot pos="1DO" label="1DO" />
          </div>
      </div>

      <div className="flex justify-between w-full relative z-10">
          <div className="flex gap-1">
            <TireSlot pos="2EO" label="2EO" />
            <TireSlot pos="2EI" label="2EI" isInner />
          </div>
          <div className="absolute top-1/2 left-0 right-0 h-4 bg-slate-700 -z-10 rounded"></div>
          <div className="flex gap-1">
            <TireSlot pos="2DI" label="2DI" isInner />
            <TireSlot pos="2DO" label="2DO" />
          </div>
      </div>

      {vehicle.axles >= 3 && (
        <div className="flex justify-between w-full relative z-10">
            <div className="flex gap-1">
              <TireSlot pos="3EO" label="3EO" />
              <TireSlot pos="3EI" label="3EI" isInner />
            </div>
            <div className="absolute top-1/2 left-0 right-0 h-4 bg-slate-700 -z-10 rounded"></div>
            <div className="flex gap-1">
              <TireSlot pos="3DI" label="3DI" isInner />
              <TireSlot pos="3DO" label="3DO" />
            </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-140px)] min-h-[600px] relative">
      
      {/* SUCCESS MODAL WITH QR CODE */}
      {successMountedTire && (
        <div className="absolute inset-0 z-[80] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
           <div className="bg-white w-full max-w-sm p-8 rounded-2xl shadow-xl animate-in zoom-in-95 text-center relative">
              <button 
                onClick={() => { setSuccessMountedTire(null); setSelectedPosition(null); }}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              >
                <X className="h-6 w-6" />
              </button>
              
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                 <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              
              <h3 className="text-2xl font-bold text-slate-800 mb-2">Pneu Montado!</h3>
              <p className="text-slate-500 text-sm mb-6">
                O pneu <strong>{successMountedTire.fireNumber}</strong> foi instalado na posição <strong>{successMountedTire.position}</strong> com sucesso.
              </p>
              
              <div className="bg-white p-2 inline-block mb-4" id="mount-success-qr">
                <QRCode 
                  value={JSON.stringify({ id: successMountedTire.id, fire: successMountedTire.fireNumber })}
                  size={180}
                  level="M"
                />
              </div>

              <div className="flex gap-3">
                 <button 
                   onClick={handlePrintQr}
                   className="flex-1 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold shadow-lg shadow-slate-900/20 transition-all flex items-center justify-center gap-2"
                 >
                   <Printer className="h-5 w-5" />
                   Imprimir
                 </button>
                 <button 
                   onClick={() => { setSuccessMountedTire(null); setSelectedPosition(null); }}
                   className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all"
                 >
                   Fechar
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* JUNIOR: Quick Swap Modal */}
      {isQuickSwapOpen && (
         <div className="absolute inset-0 z-[70] bg-slate-900 flex flex-col items-center justify-center p-6">
            <button 
              onClick={() => { setIsQuickSwapOpen(false); setScanInput(''); setQuickSwapStep('PLATE'); }}
              className="absolute top-6 right-6 text-white/70 hover:text-white"
            >
              <X className="h-8 w-8" />
            </button>

            <div className="text-center mb-8">
               <h2 className="text-3xl font-bold text-white mb-2">Troca Rápida (Scanner)</h2>
               <p className="text-blue-400 text-lg font-medium">
                 {quickSwapStep === 'PLATE' && 'Passo 1: Leia a PLACA do Veículo'}
                 {quickSwapStep === 'DISMOUNT' && 'Passo 2: Leia o Pneu a RETIRAR'}
                 {quickSwapStep === 'MOUNT' && 'Passo 3: Leia o Pneu a COLOCAR'}
               </p>
            </div>
            
            <div className="w-full max-w-sm aspect-square border-4 border-white/20 rounded-3xl relative overflow-hidden flex flex-col items-center justify-center mb-8 bg-black/40">
               <div className={`absolute h-1 w-[80%] shadow-[0_0_15px] animate-[scan_2s_ease-in-out_infinite]
                  ${quickSwapStep === 'PLATE' ? 'bg-blue-500 shadow-blue-500' : 
                    quickSwapStep === 'DISMOUNT' ? 'bg-red-500 shadow-red-500' : 'bg-green-500 shadow-green-500'}`}>
               </div>
               <ScanLine className="h-16 w-16 text-white/50" />
            </div>

            <form onSubmit={handleQuickSwapSubmit} className="w-full max-w-md">
               <input 
                 type="text" 
                 autoFocus
                 placeholder={
                    quickSwapStep === 'PLATE' ? "Digite a PLACA..." :
                    quickSwapStep === 'DISMOUNT' ? "Bipe o pneu antigo..." : "Bipe o pneu novo..."
                 }
                 className="w-full bg-white/10 border border-white/20 rounded-xl px-6 py-4 text-white text-xl placeholder-white/30 outline-none focus:border-blue-500 text-center mb-4 uppercase"
                 value={scanInput}
                 onChange={(e) => setScanInput(e.target.value)}
               />
               <button className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg shadow-lg">
                 Confirmar
               </button>
            </form>
         </div>
      )}

      {/* Standard Scanner Modal (Existing) */}
      {isMountScannerOpen && (
        <div className="absolute inset-0 z-[60] bg-slate-900/90 flex flex-col items-center justify-center p-6 rounded-xl">
           <button 
             onClick={() => setIsMountScannerOpen(false)}
             className="absolute top-6 right-6 text-white/70 hover:text-white"
           >
             <X className="h-8 w-8" />
           </button>
           
           <div className="w-full max-w-xs aspect-square border-4 border-white/30 rounded-3xl relative overflow-hidden flex flex-col items-center justify-center mb-8">
              <div className="absolute inset-0 animate-pulse bg-gradient-to-b from-transparent via-blue-500/20 to-transparent h-full w-full"></div>
              <div className="absolute h-1 w-[80%] bg-green-500/80 shadow-[0_0_15px_rgba(34,197,94,0.8)] animate-[scan_2s_ease-in-out_infinite]"></div>
              <p className="text-white/80 text-sm font-medium relative z-10 text-center px-4">
                Bipe o QR Code do pneu para montar na posição <strong>{selectedPosition}</strong>
              </p>
              
              <style>{`
                @keyframes scan {
                  0% { top: 10%; opacity: 0; }
                  10% { opacity: 1; }
                  90% { opacity: 1; }
                  100% { top: 90%; opacity: 0; }
                }
              `}</style>
           </div>

           <form onSubmit={handleMountScanSubmit} className="w-full max-w-xs">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  autoFocus
                  placeholder="Aguardando leitura..." 
                  className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus:border-green-500"
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                />
                <button type="submit" className="bg-green-600 text-white px-4 rounded-xl font-bold">OK</button>
              </div>
           </form>
        </div>
      )}

      {/* Dismount Modal (CPK) */}
      {tireToDismount && selectedVehicle && (
         <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm rounded-xl p-4">
          <div className="bg-white w-full max-w-md p-6 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200">
             <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <RotateCcw className="h-5 w-5 text-orange-600" />
                  Confirmar Desmontagem
                </h3>
                <button onClick={() => setTireToDismount(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-6 w-6" />
                </button>
             </div>
             
             <div className="bg-blue-50 p-4 rounded-xl mb-4 border border-blue-100">
               <div className="text-xs text-blue-600 uppercase font-bold mb-1">Cálculo de Performance</div>
               <div className="flex justify-between text-sm mb-1">
                 <span className="text-slate-600">KM na Instalação:</span>
                 <span className="font-mono font-bold">{tireToDismount.installOdometer || 0} km</span>
               </div>
               <div className="flex justify-between text-sm mb-1">
                 <span className="text-slate-600">Custo Total Investido:</span>
                 <span className="font-mono font-bold">R$ {(tireToDismount.totalInvestment || tireToDismount.price).toFixed(2)}</span>
               </div>
             </div>

             <div className="mb-6">
               <label className="block text-sm font-medium text-slate-700 mb-2">Hodômetro Atual do Veículo</label>
               <div className="relative">
                 <Gauge className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                 <input
                   type="number"
                   value={dismountOdometer}
                   onChange={(e) => setDismountOdometer(Number(e.target.value))}
                   className="w-full pl-10 p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-lg"
                 />
               </div>
               <p className="text-xs text-slate-500 mt-2">
                 Será calculado: <span className="font-mono font-bold text-slate-700">{Math.max(0, dismountOdometer - (tireToDismount.installOdometer || 0))} km</span> rodados neste ciclo.
               </p>
             </div>

             <div className="flex gap-3">
                <button 
                  onClick={() => setTireToDismount(null)}
                  className="flex-1 py-3 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => confirmDismount(tireToDismount, dismountOdometer)}
                  className="flex-1 py-3 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="h-5 w-5" />
                  Confirmar
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Repair Modal */}
      {isRepairModalOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm rounded-xl p-4">
          <div className="bg-white w-full max-w-md p-6 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200">
             <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Hammer className="h-5 w-5 text-amber-600" />
                  Registrar Reparo
                </h3>
                <button onClick={() => setIsRepairModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-6 w-6" />
                </button>
             </div>
             
             <div className="mb-4">
               <label className="block text-sm font-medium text-slate-700 mb-2">Detalhes do Serviço</label>
               <textarea
                 value={repairDetails}
                 onChange={(e) => setRepairDetails(e.target.value)}
                 placeholder="Ex: Vulcanização, Troca de Válvula, Remendo a frio..."
                 className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none h-32 resize-none"
               />
             </div>

             <div className="flex gap-3">
                <button 
                  onClick={() => setIsRepairModalOpen(false)}
                  className="flex-1 py-3 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveRepair}
                  disabled={!repairDetails.trim()}
                  className="flex-1 py-3 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="h-5 w-5" />
                  Salvar
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Modal for Manual Position Selection */}
      {tireToMount && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm rounded-xl">
          <div className="bg-white w-full max-w-md p-6 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Montar Pneu</h3>
                <p className="text-sm text-slate-500">Selecione onde deseja instalar este pneu.</p>
              </div>
              <button onClick={() => setTireToMount(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl mb-6 border border-slate-100">
               <div className="flex items-center gap-2 mb-1">
                  <Flame className="h-4 w-4 text-orange-500" />
                  <span className="font-black text-slate-800">{tireToMount.fireNumber}</span>
               </div>
               <div className="text-sm text-slate-600">{tireToMount.brand} {tireToMount.model}</div>
               <div className="text-xs text-slate-500 mt-1">
                  DOT: {tireToMount.dot} • {tireToMount.width}/{tireToMount.profile} R{tireToMount.rim}
               </div>
            </div>

            <div className="space-y-2 mb-6">
              <label className="block text-sm font-medium text-slate-700">Posição no Veículo</label>
              <select
                value={manualPosition}
                onChange={(e) => setManualPosition(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              >
                <option value="">Selecione uma posição...</option>
                {ALL_POSITIONS.map((pos) => {
                  const isOccupied = isPositionOccupied(pos.id);
                  return (
                    <option key={pos.id} value={pos.id} disabled={isOccupied} className={isOccupied ? 'text-red-300' : ''}>
                      {pos.id} - {pos.label} {isOccupied ? '(Ocupado)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setTireToMount(null)}
                className="flex-1 py-3 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button 
                disabled={!manualPosition}
                onClick={() => executeMount(tireToMount, manualPosition)}
                className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="h-5 w-5" />
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Left Panel: Vehicle Selection & Diagram */}
      <div className="lg:col-span-8 flex flex-col gap-6">
        
        {/* Vehicle Selector Header */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
             {vehicles.length > 0 ? (
              <>
                <div className="p-2 bg-slate-900 text-white rounded-lg">
                  {selectedVehicle?.type === 'CAVALO' ? <Truck className="h-6 w-6" /> : <Container className="h-6 w-6" />}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider">Veículo</label>
                  <select 
                    value={selectedVehicleId} 
                    onChange={(e) => setSelectedVehicleId(e.target.value)}
                    className="font-bold text-lg text-slate-800 bg-transparent outline-none cursor-pointer min-w-[200px]"
                  >
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>{v.plate} - {v.model}</option>
                    ))}
                  </select>
                </div>
              </>
             ) : (
               <div className="flex items-center gap-2 text-amber-600">
                 <AlertCircle className="h-5 w-5" />
                 <span>Nenhum veículo cadastrado. Vá em "Minha Frota" para adicionar.</span>
               </div>
             )}
          </div>
          
          <div className="flex items-center gap-4">
            {selectedVehicle && (
              <div className="text-right hidden sm:block bg-slate-50 px-4 py-2 rounded-lg border border-slate-100">
                <p className="text-xs text-slate-500 uppercase">Pneus Montados</p>
                <p className="text-xl font-bold text-slate-800">{mountedTires.length} <span className="text-sm font-normal text-slate-400">/ {selectedVehicle.axles === 2 ? 6 : selectedVehicle.axles === 3 ? 10 : 14}</span></p>
              </div>
            )}
            
            {/* Junior Quick Swap Button */}
            {userLevel === 'JUNIOR' && (
               <button 
                 onClick={() => { setIsQuickSwapOpen(true); setScanInput(''); setQuickSwapStep('PLATE'); }}
                 className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-bold shadow-md shadow-blue-600/20 transition-all"
               >
                 <Zap className="h-4 w-4" />
                 Troca Rápida
               </button>
            )}
          </div>
        </div>

        {/* Dark Chassis Diagram */}
        {selectedVehicle && (
          <div className="bg-slate-900 rounded-xl shadow-lg border border-slate-800 flex-1 relative overflow-hidden flex items-center justify-center py-12 px-4">
            
            {/* Blueprint Grid Background */}
            <div className="absolute inset-0 opacity-5 pointer-events-none" 
                 style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
            </div>

            {/* Render Truck or Trailer based on type */}
            {selectedVehicle.type === 'CAVALO' 
                ? renderTruckDiagram(selectedVehicle) 
                : renderTrailerDiagram(selectedVehicle)
            }
          </div>
        )}
      </div>

      {/* Right Panel: Action Context */}
      <div className="lg:col-span-4 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden h-full">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <h3 className="font-bold text-slate-800">
            {selectedPosition ? (
              <span className="flex items-center gap-2">
                <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded">Posição {selectedPosition}</span>
                <span>Selecionada</span>
              </span>
            ) : 'Painel de Ações'}
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {!selectedPosition ? (
            <div className="h-full flex flex-col">
              {/* If no position selected, show list of tires that can be mounted */}
               <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-bold text-slate-700 uppercase tracking-wide">Estoque Disponível</p>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">{availableTires.length}</span>
                </div>

                {availableTires.length === 0 ? (
                   <div className="text-center p-6 bg-slate-50 rounded-lg border border-dashed border-slate-200 mt-4">
                     <p className="text-sm text-slate-500 italic">
                      Nenhum pneu disponível no estoque para montagem.
                     </p>
                   </div>
                ) : (
                  <div className="space-y-3">
                    {availableTires.map(tire => (
                      <div 
                        key={tire.id}
                        onClick={() => triggerMountFlow(tire)}
                        className="group p-4 border border-slate-200 rounded-xl hover:border-blue-500 hover:shadow-md cursor-pointer transition-all bg-white relative overflow-hidden"
                      >
                        <div className="flex justify-between items-center relative z-10">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="bg-orange-100 text-orange-700 text-xs font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                                <Flame className="h-3 w-3" /> {tire.fireNumber}
                              </span>
                              {tire.retreadCount > 0 && (
                                <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-1.5 py-0.5 rounded">
                                  {tire.retreadCount}ª Vida
                                </span>
                              )}
                            </div>
                            <div className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{tire.brand} {tire.model}</div>
                            <div className="text-xs text-slate-500 mt-1 flex gap-2">
                              <span className="bg-slate-100 px-1.5 py-0.5 rounded">{tire.width}/{tire.profile} R{tire.rim}</span>
                              <span className="bg-slate-100 px-1.5 py-0.5 rounded">DOT {tire.dot}</span>
                            </div>
                          </div>
                          <div className="bg-blue-50 text-blue-600 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                            <ArrowRight className="h-4 w-4" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="mt-auto pt-6 text-center px-4">
                   <p className="text-xs text-slate-400">
                     Dica: Clique em uma posição no caminhão para filtrar, ou clique diretamente em um pneu acima para montar.
                   </p>
                </div>
            </div>
          ) : (
            <>
              {getTireAtPosition(selectedPosition) ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                  <div className="bg-blue-50 p-5 rounded-xl border border-blue-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                      <Truck className="h-24 w-24 text-blue-600" />
                    </div>
                    <div className="text-xs text-blue-600 font-bold uppercase tracking-wider mb-2">Pneu Instalado</div>
                    
                    <div className="flex items-center gap-2 mb-2">
                      <Flame className="h-5 w-5 text-orange-500" />
                      <h4 className="text-2xl font-black text-slate-800">{getTireAtPosition(selectedPosition)?.fireNumber}</h4>
                    </div>

                    <p className="text-md font-medium text-slate-600 mb-4">
                      {getTireAtPosition(selectedPosition)?.brand} {getTireAtPosition(selectedPosition)?.model}
                    </p>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-white/60 p-2 rounded">
                        <span className="block text-xs text-slate-400">Instalado em</span>
                        <span className="font-mono text-slate-700">{getTireAtPosition(selectedPosition)?.installOdometer || 0} km</span>
                      </div>
                      <div className="bg-white/60 p-2 rounded">
                         <span className="block text-xs text-slate-400">Vidas</span>
                         <span className="font-mono text-slate-700">{(getTireAtPosition(selectedPosition)?.retreadCount || 0) + 1}ª Vida</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <button
                      onClick={() => setIsRepairModalOpen(true)}
                      className="w-full py-3 flex items-center justify-center gap-3 bg-amber-50 border-2 border-amber-100 text-amber-700 hover:bg-amber-100 hover:border-amber-200 rounded-xl transition-all font-bold shadow-sm"
                    >
                      <Wrench className="h-5 w-5" />
                      Registrar Reparo
                    </button>

                    <button
                      onClick={() => {
                        const t = getTireAtPosition(selectedPosition);
                        if (t) openDismountModal(t);
                      }}
                      className="w-full py-3 flex items-center justify-center gap-3 bg-white border-2 border-red-100 text-red-600 hover:bg-red-50 hover:border-red-200 rounded-xl transition-all font-bold shadow-sm"
                    >
                      <RotateCcw className="h-5 w-5" />
                      Desmontar Pneu
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                   {/* BUTTON FOR QR SCANNER */}
                   <button
                      onClick={() => setIsMountScannerOpen(true)}
                      className="w-full py-5 bg-slate-800 text-white rounded-xl font-bold flex items-center justify-center gap-3 shadow-lg hover:bg-slate-900 hover:scale-[1.02] transition-all"
                   >
                      <QrCode className="h-6 w-6 text-green-400" />
                      Ler QR Code para Montar
                   </button>

                   <div className="relative flex items-center py-2">
                      <div className="flex-grow border-t border-slate-200"></div>
                      <span className="flex-shrink-0 mx-4 text-xs font-medium text-slate-400 uppercase">Ou selecione abaixo</span>
                      <div className="flex-grow border-t border-slate-200"></div>
                   </div>
                  
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-bold text-slate-700 uppercase tracking-wide">Estoque Disponível</p>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">{availableTires.length}</span>
                  </div>

                  {availableTires.length === 0 ? (
                     <div className="text-center p-6 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                       <p className="text-sm text-slate-500 italic">
                        Nenhum pneu disponível no estoque para montagem.
                       </p>
                     </div>
                  ) : (
                    <div className="space-y-3">
                      {availableTires.map(tire => (
                        <div 
                          key={tire.id}
                          onClick={() => executeMount(tire, selectedPosition)}
                          className="group p-4 border border-slate-200 rounded-xl hover:border-blue-500 hover:shadow-md cursor-pointer transition-all bg-white relative overflow-hidden"
                        >
                          <div className="flex justify-between items-center relative z-10">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="bg-orange-100 text-orange-700 text-xs font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                                  <Flame className="h-3 w-3" /> {tire.fireNumber}
                                </span>
                              </div>
                              <div className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{tire.brand} {tire.model}</div>
                              <div className="text-xs text-slate-500 mt-1 flex gap-2">
                                <span className="bg-slate-100 px-1.5 py-0.5 rounded">{tire.width}/{tire.profile} R{tire.rim}</span>
                                <span className="bg-slate-100 px-1.5 py-0.5 rounded">DOT {tire.dot}</span>
                              </div>
                            </div>
                            <div className="bg-blue-50 text-blue-600 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                              <ArrowRight className="h-4 w-4" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
        
        {selectedPosition && (
          <div className="p-4 border-t border-slate-100 bg-slate-50">
            <button 
              onClick={() => setSelectedPosition(null)}
              className="w-full py-3 text-sm font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancelar Seleção
            </button>
          </div>
        )}
      </div>
    </div>
  );
};