import React, { useMemo } from 'react';
import { Tire, TireStatus } from '../types';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Package, AlertCircle, DollarSign, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface DashboardProps {
  tires: Tire[];
}

export const Dashboard: React.FC<DashboardProps> = ({ tires }) => {
  
  const stats = useMemo(() => {
    const totalTires = tires.reduce((acc, t) => acc + t.quantity, 0);
    const totalValue = tires.reduce((acc, t) => acc + (t.price * t.quantity), 0);
    const lowStock = tires.filter(t => t.quantity < 4).length;
    const newTires = tires.filter(t => t.status === TireStatus.NEW).reduce((acc, t) => acc + t.quantity, 0);

    const statusData = [
      { name: 'Novos', value: tires.filter(t => t.status === TireStatus.NEW).reduce((acc, t) => acc + t.quantity, 0), color: '#22c55e' },
      { name: 'Usados', value: tires.filter(t => t.status === TireStatus.USED).reduce((acc, t) => acc + t.quantity, 0), color: '#eab308' },
      { name: 'Recauchutados', value: tires.filter(t => t.status === TireStatus.RETREADED).reduce((acc, t) => acc + t.quantity, 0), color: '#f97316' },
      { name: 'Danificados', value: tires.filter(t => t.status === TireStatus.DAMAGED).reduce((acc, t) => acc + t.quantity, 0), color: '#ef4444' },
    ].filter(d => d.value > 0);

    const brandDataMap: Record<string, number> = {};
    tires.forEach(t => {
      brandDataMap[t.brand] = (brandDataMap[t.brand] || 0) + t.quantity;
    });
    const brandData = Object.keys(brandDataMap).map(k => ({ name: k, value: brandDataMap[k] }));

    return { totalTires, totalValue, lowStock, newTires, statusData, brandData };
  }, [tires]);

  const StatCard = ({ title, value, icon: Icon, colorClass, bgClass, trend }: any) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-shadow duration-300">
       <div className="flex justify-between items-start relative z-10">
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
            <h3 className="text-3xl font-bold text-slate-800 tracking-tight">{value}</h3>
            {trend && (
               <div className="flex items-center gap-1 mt-2 text-xs font-medium text-emerald-600">
                 <span className="bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                   <TrendingUp className="h-3 w-3" /> +12%
                 </span>
                 <span className="text-slate-400">vs mês anterior</span>
               </div>
            )}
          </div>
          <div className={`p-3 rounded-xl ${bgClass} ${colorClass} bg-opacity-20`}>
            <Icon className="h-6 w-6" />
          </div>
       </div>
       {/* Decorator Icon */}
       <Icon className={`absolute -bottom-4 -right-4 h-32 w-32 opacity-5 transform -rotate-12 group-hover:scale-110 transition-transform duration-500 ${colorClass}`} />
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Special Card for Total Value */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-2xl shadow-lg shadow-blue-900/20 text-white relative overflow-hidden group">
           <div className="relative z-10">
              <div className="flex justify-between items-start mb-4">
                 <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm border border-white/10">
                   <DollarSign className="h-6 w-6 text-blue-100" />
                 </div>
                 <span className="flex items-center gap-1 text-xs font-medium bg-white/20 px-2 py-1 rounded-full text-blue-50">
                   <ArrowUpRight className="h-3 w-3" /> Patrimônio
                 </span>
              </div>
              <p className="text-blue-100 text-sm font-medium">Valor Estimado em Estoque</p>
              <h3 className="text-3xl font-bold mt-1 tracking-tight">
                 {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalValue)}
              </h3>
           </div>
           <DollarSign className="absolute -bottom-6 -right-6 h-40 w-40 text-white opacity-10 transform rotate-12 group-hover:scale-110 transition-transform duration-500" />
           <div className="absolute inset-0 bg-gradient-to-tr from-transparent to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        </div>

        <StatCard 
           title="Total de Pneus" 
           value={stats.totalTires} 
           icon={Package} 
           colorClass="text-blue-600" 
           bgClass="bg-blue-50"
           trend={true}
        />

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-shadow duration-300">
            <div className="flex justify-between items-start relative z-10">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Estoque Baixo</p>
                <h3 className="text-3xl font-bold text-slate-800 tracking-tight">{stats.lowStock}</h3>
                <div className="mt-2 text-xs text-slate-400">
                   Modelos com &lt; 4 unidades
                </div>
              </div>
              <div className={`p-3 rounded-xl bg-red-50 text-red-600`}>
                <AlertCircle className="h-6 w-6" />
              </div>
            </div>
            {stats.lowStock > 0 && (
               <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-500"></div>
            )}
             <AlertCircle className={`absolute -bottom-4 -right-4 h-32 w-32 opacity-5 transform -rotate-12 group-hover:scale-110 transition-transform duration-500 text-red-600`} />
        </div>

         <StatCard 
           title="Pneus Novos" 
           value={stats.newTires} 
           icon={TrendingUp} 
           colorClass="text-emerald-600" 
           bgClass="bg-emerald-50"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-800">Distribuição por Status</h3>
            <button className="text-xs text-blue-600 hover:text-blue-700 font-medium bg-blue-50 px-3 py-1 rounded-full transition-colors">Ver Detalhes</button>
          </div>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  cornerRadius={5}
                >
                  {stats.statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-6 flex-wrap">
            {stats.statusData.map((entry, index) => (
              <div key={index} className="flex items-center gap-2 text-xs font-medium text-slate-600">
                <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: entry.color }}></span>
                <span>{entry.name} ({entry.value})</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center justify-between mb-6">
             <h3 className="text-lg font-bold text-slate-800">Estoque por Marca</h3>
             <div className="flex gap-2">
                <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 cursor-pointer transition-colors">
                   <ArrowDownRight className="h-4 w-4" />
                </div>
             </div>
          </div>
          <div className="flex-1 min-h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.brandData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  stroke="#94a3b8" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                  dy={10}
                />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                />
                <Bar 
                  dataKey="value" 
                  fill="#3b82f6" 
                  radius={[6, 6, 0, 0]} 
                  barSize={40}
                >
                   {stats.brandData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#3b82f6' : '#60a5fa'} />
                    ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};