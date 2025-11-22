export enum TireStatus {
  NEW = 'Novo',
  USED = 'Usado',
  RETREADING = 'Em Recapagem', // Novo Status
  RETREADED = 'Recauchutado',
  DAMAGED = 'Danificado/Descarte'
}

export type UserLevel = 'JUNIOR' | 'PLENO' | 'SENIOR';

export interface TireHistoryLog {
  date: string;
  action: 'CADASTRADO' | 'MONTADO' | 'DESMONTADO' | 'EDITADO' | 'INSPECAO' | 'REPARO' | 'ENVIADO_RECAPAGEM' | 'RETORNO_RECAPAGEM';
  details: string;
}

export interface Tire {
  id: string;
  fireNumber: string; // Numeração de Fogo (ID VISUAL)
  brand: string;
  model: string;
  width: number;
  profile: number;
  rim: number;
  dot: string; // Manufacturing date code
  status: TireStatus;
  location: string; // Physical location or Vehicle Plate
  quantity: number; // Usually 1 for tracked tires, but keeping for bulk
  price: number; // Preço de Compra
  notes?: string;
  
  // New fields for movement & CPK
  vehicleId?: string | null;
  position?: string | null; // e.g., '1L', '2RO', etc.
  installOdometer?: number; // KM do veículo no momento da montagem
  
  // Lifecycle & Financials
  totalKms: number; // KM total rodado na vida do pneu
  totalInvestment: number; // Preço Compra + Custo Reformas
  costPerKm: number; // CPK calculado
  retreadCount: number; // Número de vidas (0 = novo, 1 = 1ª reforma...)

  // Maintenance & Health
  originalTreadDepth: number; // mm (e.g. 18mm when new)
  currentTreadDepth: number; // mm (Average or lowest point)
  
  // Detailed readings for 4 grooves (Outer -> Inner)
  treadReadings?: {
    depth1: number; // Exterior
    depth2: number; // Central 1
    depth3: number; // Central 2
    depth4: number; // Interior
  };

  pressure: number; // PSI (Current)
  targetPressure: number; // PSI (Standard/Ideal)
  lastInspectionDate?: string;

  // History tracking
  history: TireHistoryLog[];
}

export interface Vehicle {
  id: string;
  plate: string;
  model: string;
  axles: number; // 2, 3, 4
  type: 'CAVALO' | 'CARRETA';
  odometer: number; // KM
}

export type TabView = 'dashboard' | 'inventory' | 'register' | 'movement' | 'fleet' | 'maintenance' | 'ai-insights';