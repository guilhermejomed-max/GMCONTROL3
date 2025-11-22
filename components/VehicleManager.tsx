import React, { useState } from 'react';
import { Vehicle, UserLevel } from '../types';
import { Bus, Save, Plus, Trash2, X, Truck, Container, Gauge, Check, PenLine, Loader2, Lock } from 'lucide-react';

interface VehicleManagerProps {
  vehicles: Vehicle[];
  onAddVehicle: (vehicle: Vehicle) => Promise<void>;
  onDeleteVehicle: (id: string) => Promise<void>;
  onUpdateVehicle: (vehicle: Vehicle) => Promise<void>;
  userLevel: UserLevel;
}

export const VehicleManager: React.FC<VehicleManagerProps> = ({ vehicles, onAddVehicle, onDeleteVehicle, onUpdateVehicle, userLevel }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    plate: '',
    model: '',
    axles: 3,
    type: 'CAVALO' as 'CAVALO' | 'CARRETA',
    odometer: 0
  });

  // State for editing odometer
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newOdometer, setNewOdometer] = useState<number>(0);

  const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const newVehicle: Vehicle = {
        id: generateId(),
        plate: formData.plate.toUpperCase(),
        model: formData.model,
        axles: Number(formData.axles),
        type: formData.type,
        odometer: Number(formData.odometer)
      };
      await onAddVehicle(newVehicle);
      setIsAdding(false);
      setFormData({ plate: '', model: '', axles: 3, type: 'CAVALO', odometer: 0 });
    } catch (error: any) {
      console.error("Erro ao salvar veículo:", error);
      alert("Erro ao salvar veículo: " + (error.message || "Erro desconhecido"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartEdit = (vehicle: Vehicle) => {
    if (userLevel === 'JUNIOR') return;
    setEditingId(vehicle.id);
    setNewOdometer(vehicle.odometer);
  };

  const handleSaveOdometer = async (vehicle: Vehicle) => {
    try {
      await onUpdateVehicle({ ...vehicle, odometer: newOdometer });
      setEditingId(null);
    } catch (error: any) {
      alert("Erro ao atualizar KM: " + error.message);
    }
  };

  const handleDelete = async (id: string) => {
     try {
       await onDeleteVehicle(id);
     } catch (error: any) {
       alert("Erro ao excluir: " + error.message);
     }
  }

  const inputClass = "w-full p-2 bg-slate-50 border border-slate-200 text-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-colors placeholder-slate-400";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Minha Frota</h2>
          <p className="text-slate-500 text-sm mt-1">Gerencie Cavalos Mecânicos e Carretas.</p>
        </div>
        {userLevel !== 'JUNIOR' && (
          <button
            onClick={() => setIsAdding(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium shadow-sm"
          >
            <Plus className="h-5 w-5" />
            Novo Veículo
          </button>
        )}
      </div>

      {/* Form Modal / Inline */}
      {isAdding && (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-blue-100 mb-6 animate-in fade-in slide-in-from-top-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-slate-800">Cadastrar Veículo</h3>
            <button onClick={() => setIsAdding(false)} disabled={isSaving} className="text-slate-400 hover:text-slate-600">
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Type Selection */}
            <div className="md:col-span-4 grid grid-cols-2 gap-4 mb-2">
              <div 
                onClick={() => setFormData({...formData, type: 'CAVALO'})}
                className={`cursor-pointer p-4 rounded-lg border-2 flex items-center justify-center gap-2 transition-all
                  ${formData.type === 'CAVALO' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 hover:border-slate-300 bg-slate-50 text-slate-600'}`}
              >
                <Truck className="h-6 w-6" />
                <span className="font-bold">Cavalo Mecânico</span>
              </div>
              <div 
                onClick={() => setFormData({...formData, type: 'CARRETA'})}
                className={`cursor-pointer p-4 rounded-lg border-2 flex items-center justify-center gap-2 transition-all
                  ${formData.type === 'CARRETA' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 hover:border-slate-300 bg-slate-50 text-slate-600'}`}
              >
                <Container className="h-6 w-6" />
                <span className="font-bold">Carreta / Reboque</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Placa</label>
              <input
                required
                type="text"
                placeholder="ABC-1234"
                className={`${inputClass} uppercase`}
                value={formData.plate}
                onChange={e => setFormData({...formData, plate: e.target.value})}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Modelo</label>
              <input
                required
                type="text"
                placeholder={formData.type === 'CAVALO' ? "Ex: Volvo FH 540" : "Ex: Randon Graneleira"}
                className={inputClass}
                value={formData.model}
                onChange={e => setFormData({...formData, model: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Eixos</label>
              <select
                className={inputClass}
                value={formData.axles}
                onChange={e => setFormData({...formData, axles: Number(e.target.value)})}
              >
                <option value="2">2 Eixos</option>
                <option value="3">3 Eixos</option>
                <option value="4">4 Eixos</option>
              </select>
            </div>

             <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Hodômetro (KM)</label>
              <div className="relative">
                <Gauge className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  className={`${inputClass} pl-9`}
                  value={formData.odometer}
                  onChange={e => setFormData({...formData, odometer: Number(e.target.value)})}
                />
              </div>
            </div>
            
            <div className="md:col-span-4 flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
              <button 
                type="button" 
                onClick={() => setIsAdding(false)}
                disabled={isSaving}
                className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                disabled={isSaving}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 shadow-md shadow-green-600/20 disabled:opacity-70"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Salvar Veículo
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {vehicles.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center h-48 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl text-slate-500">
            <Truck className="h-10 w-10 mb-2 opacity-50" />
            <p>Nenhum veículo cadastrado.</p>
          </div>
        ) : (
          vehicles.map(vehicle => (
            <div key={vehicle.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:border-blue-400 transition-all group relative">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="bg-slate-100 p-2 rounded-lg text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                    {vehicle.type === 'CAVALO' ? <Truck className="h-6 w-6" /> : <Container className="h-6 w-6" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-800">{vehicle.plate}</h3>
                    <p className="text-xs text-slate-500">{vehicle.model}</p>
                  </div>
                </div>
                {userLevel === 'SENIOR' && (
                  <button 
                    onClick={() => handleDelete(vehicle.id)}
                    className="text-slate-300 hover:text-red-500 p-1 rounded-md transition-colors"
                    title="Remover veículo"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 text-sm">
                <div className="flex-1 pr-2">
                   {editingId === vehicle.id ? (
                     <div className="flex items-center gap-1 animate-in fade-in zoom-in duration-200">
                       <input 
                         type="number"
                         autoFocus
                         className="w-24 px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                         value={newOdometer}
                         onChange={(e) => setNewOdometer(Number(e.target.value))}
                       />
                       <button 
                         onClick={() => handleSaveOdometer(vehicle)}
                         className="p-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                         title="Salvar KM"
                       >
                         <Check className="h-4 w-4" />
                       </button>
                       <button 
                         onClick={() => setEditingId(null)}
                         className="p-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                         title="Cancelar"
                       >
                         <X className="h-4 w-4" />
                       </button>
                     </div>
                   ) : (
                     <div className="flex items-center gap-2 text-slate-600 group/odometer">
                        <Gauge className="h-4 w-4 text-slate-400" />
                        <span className="font-mono">{vehicle.odometer.toLocaleString('pt-BR')} km</span>
                        {userLevel !== 'JUNIOR' && (
                          <button 
                            onClick={() => handleStartEdit(vehicle)}
                            className="opacity-0 group-hover/odometer:opacity-100 text-blue-600 hover:text-blue-800 p-0.5 transition-opacity"
                            title="Atualizar KM"
                          >
                            <PenLine className="h-3 w-3" />
                          </button>
                        )}
                     </div>
                   )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <span className="text-xs font-medium bg-slate-100 px-2 py-1 rounded text-slate-600">
                    {vehicle.axles} Eixos
                  </span>
                  <span className={`text-xs font-bold px-2 py-1 rounded uppercase
                    ${vehicle.type === 'CAVALO' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                    {vehicle.type}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};