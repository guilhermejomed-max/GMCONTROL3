import React, { useState } from 'react';
import { Tire, TireStatus } from '../types';
import { Save, XCircle, Flame, Loader2, CheckCircle2, Printer, ArrowRight } from 'lucide-react';
import QRCode from 'react-qr-code';

interface TireFormProps {
  onAddTire: (tire: Tire) => Promise<void>;
  onCancel: () => void;
  onFinish?: () => void; // Novo prop para sinalizar conclusão
}

export const TireForm: React.FC<TireFormProps> = ({ onAddTire, onCancel, onFinish }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [successTire, setSuccessTire] = useState<Tire | null>(null); // State for Success View

  const [formData, setFormData] = useState({
    fireNumber: '',
    brand: '',
    model: '',
    width: 295,
    profile: 80,
    rim: 22.5,
    dot: '',
    status: TireStatus.NEW,
    location: '',
    quantity: 1,
    price: 0,
    originalTreadDepth: 18.0,
    targetPressure: 110,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: ['width', 'profile', 'rim', 'quantity', 'price', 'originalTreadDepth', 'targetPressure'].includes(name)
        ? Number(value) 
        : value
    }));
  };

  const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const newTire: Tire = {
        id: generateId(),
        ...formData,
        currentTreadDepth: formData.originalTreadDepth,
        pressure: formData.targetPressure,
        history: [],
        totalKms: 0,
        totalInvestment: formData.price,
        costPerKm: 0,
        retreadCount: 0
      };
      
      await onAddTire(newTire);
      setSuccessTire(newTire); // Show success screen with QR
    } catch (error: any) {
      console.error("Erro ao salvar pneu:", error);
      alert(`Falha ao salvar: ${error.message || "Erro desconhecido"}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrintQr = () => {
    if (!successTire) return;
    
    const printWindow = window.open('', '', 'width=300,height=300');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${successTire.fireNumber}</title>
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
                 ${document.getElementById('generated-qr-code')?.innerHTML || ''}
               </div>
               <h1>${successTire.fireNumber}</h1>
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

  const inputClass = "w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-colors placeholder-slate-400";

  // --- Success View with QR Code ---
  if (successTire) {
    return (
      <div className="max-w-2xl mx-auto text-center animate-in fade-in slide-in-from-bottom-8">
         <div className="bg-white p-10 rounded-2xl shadow-xl border border-slate-200">
            <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            
            <h2 className="text-3xl font-bold text-slate-800 mb-2">Cadastro Realizado!</h2>
            <p className="text-slate-500 mb-8">O pneu foi registrado no sistema. Imprima a etiqueta abaixo.</p>

            <div className="flex flex-col items-center justify-center bg-slate-50 p-8 rounded-xl border border-slate-200 mb-8 max-w-xs mx-auto">
               <div className="bg-white p-4 rounded-lg shadow-sm mb-4" id="generated-qr-code">
                  <QRCode 
                    value={JSON.stringify({ id: successTire.id, fire: successTire.fireNumber })}
                    size={180}
                    level="M"
                  />
               </div>
               <div className="text-center">
                 <h3 className="text-2xl font-black text-slate-800">{successTire.fireNumber}</h3>
                 <p className="text-sm text-slate-600 font-medium">{successTire.brand} {successTire.model}</p>
                 <p className="text-xs text-slate-400 mt-1">{successTire.width}/{successTire.profile} R{successTire.rim}</p>
               </div>
            </div>

            <div className="flex gap-4 justify-center">
               <button 
                 onClick={handlePrintQr}
                 className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold shadow-lg shadow-slate-900/20 transition-all"
               >
                 <Printer className="h-5 w-5" />
                 Imprimir Etiqueta (2x2cm)
               </button>
               
               <button 
                 onClick={() => onFinish ? onFinish() : onCancel()}
                 className="flex items-center gap-2 px-6 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl font-bold border border-blue-200 transition-all"
               >
                 Concluir e Sair
                 <ArrowRight className="h-5 w-5" />
               </button>
            </div>
         </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Cadastro de Pneu</h2>
        <p className="text-slate-500 text-sm">Preencha os dados técnicos para controle total.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Identification */}
          <div className="space-y-4 md:col-span-2 border-b border-slate-100 pb-6">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-500" /> Identificação Principal
            </h3>
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
              <label className="block text-sm font-bold text-slate-700 mb-1">Numeração de Fogo (Obrigatório)</label>
              <input
                required
                type="text"
                name="fireNumber"
                placeholder="Ex: FOGO-001"
                value={formData.fireNumber}
                onChange={handleChange}
                className={`${inputClass} bg-white border-orange-300 focus:ring-orange-500 font-bold text-lg`}
              />
              <p className="text-xs text-orange-600 mt-1">Este número será usado para gerar o QR Code único do pneu.</p>
            </div>
          </div>

          {/* Brand & Model */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Informações Básicas</h3>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Marca</label>
              <input
                required
                type="text"
                name="brand"
                placeholder="Ex: Michelin, Pirelli"
                value={formData.brand}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Modelo</label>
              <input
                required
                type="text"
                name="model"
                placeholder="Ex: Primacy 4"
                value={formData.model}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
          </div>

          {/* Dimensions */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Dimensões</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Largura</label>
                <input
                  type="number"
                  name="width"
                  value={formData.width}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Perfil</label>
                <input
                  type="number"
                  name="profile"
                  value={formData.profile}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Aro</label>
                <input
                  type="number"
                  name="rim"
                  value={formData.rim}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* Technical Data */}
          <div className="space-y-4 md:col-span-2 border-t border-slate-100 pt-4 mt-2">
             <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Dados Técnicos</h3>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Sulco Inicial (mm)</label>
                  <input
                    type="number"
                    step="0.1"
                    name="originalTreadDepth"
                    value={formData.originalTreadDepth}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">PSI Padrão (Alvo)</label>
                  <input
                    type="number"
                    name="targetPressure"
                    value={formData.targetPressure}
                    onChange={handleChange}
                    className={inputClass}
                  />
                  <p className="text-xs text-slate-500 mt-1">Pressão ideal de trabalho.</p>
                </div>
                 <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Preço (R$)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>
             </div>
          </div>

          {/* Specifics */}
          <div className="space-y-4 md:col-span-2 border-t border-slate-100 pt-4">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Detalhes do Estoque</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">DOT (Fabricação)</label>
                <input
                  required
                  type="text"
                  name="dot"
                  placeholder="Ex: 3523"
                  maxLength={4}
                  value={formData.dot}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status Inicial</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className={inputClass}
                >
                  {Object.values(TireStatus).map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Localização Física</label>
                <input
                  required
                  type="text"
                  name="location"
                  placeholder="Ex: Almoxarifado"
                  value={formData.location}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium disabled:opacity-50"
          >
            <XCircle className="h-5 w-5" />
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 font-medium disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                Salvar e Gerar QR
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};