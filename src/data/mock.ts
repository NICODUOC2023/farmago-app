export type Pharmacy = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  medicine: string;
};

export type HistorialStatus = 'comprada' | 'pasada';

export type HistorialRecord = {
  id: string;
  pharmacy: string;
  medicine: string;
  time: string;
  status: HistorialStatus;
  date: string;
};

export type TratamientoItem = {
  id: string;
  pharmacy: string;
  medicine: string;
  dose: string;
  frequency: string;
  duration: string;
  taken: boolean[];
};

export type TratamientoSource = 'escaneado' | 'manual';

export type TratamientoGroup = {
  id: string;
  title: string;
  source: TratamientoSource;
  medico: string | null;
  institucion: string | null;
  notas: string;
  items: TratamientoItem[];
};

export type HistorialFilter = 'todo' | HistorialStatus;

export const SANTIAGO_CENTER = {
  latitude: -33.4489,
  longitude: -70.6693,
};

export const RECORDS_ROUTE_HISTORIAL = '/recetas';
export const RECORDS_ROUTE_TRATAMIENTO = '/recetas/tratamiento';

export const pharmacies: Pharmacy[] = [
  { id: 'pharmaflo', name: 'Pharmaflo', latitude: -33.4476, longitude: -70.6653, medicine: 'Enalapril 5mg' },
  { id: 'farmastock', name: 'Farmastock', latitude: -33.4521, longitude: -70.6711, medicine: 'Enalapril 5mg' },
  { id: 'pharmacystore', name: 'Pharmacy Store', latitude: -33.4444, longitude: -70.6739, medicine: 'Clotiazepam 5mg' },
  { id: 'farmanorte', name: 'FarmaNorte', latitude: -33.4554, longitude: -70.6638, medicine: 'Losartán 50mg' },
];

export const activePharmacyId = 'pharmaflo';

const today = new Date();
const iso = (d: Date) => d.toISOString().slice(0, 10);

export const historialRecords: HistorialRecord[] = [
  { id: 'h1', pharmacy: 'Pharmaflo', medicine: 'Enalapril 5mg', time: '08:30', status: 'comprada', date: iso(today) },
  { id: 'h2', pharmacy: 'Farmastock', medicine: 'Clotiazepam 5mg', time: '12:45', status: 'comprada', date: iso(today) },
  { id: 'h3', pharmacy: 'Pharmacy Store', medicine: 'Losartán 50mg', time: '19:10', status: 'pasada', date: iso(today) },
  {
    id: 'h4',
    pharmacy: 'Pharmaflo',
    medicine: 'Metformina 500mg',
    time: '11:20',
    status: 'comprada',
    date: iso(new Date(today.getTime() - 86400000)),
  },
  {
    id: 'h5',
    pharmacy: 'FarmaNorte',
    medicine: 'Enalapril 5mg',
    time: '18:00',
    status: 'comprada',
    date: iso(new Date(today.getTime() - 86400000)),
  },
  {
    id: 'h6',
    pharmacy: 'Farmastock',
    medicine: 'Paracetamol 500mg',
    time: '09:15',
    status: 'pasada',
    date: iso(new Date(today.getTime() - 2 * 86400000)),
  },
  {
    id: 'h7',
    pharmacy: 'Pharmaflo',
    medicine: 'Clotiazepam 5mg',
    time: '14:40',
    status: 'comprada',
    date: iso(new Date(today.getTime() - 3 * 86400000)),
  },
  {
    id: 'h8',
    pharmacy: 'Pharmacy Store',
    medicine: 'Atorvastatina 20mg',
    time: '16:05',
    status: 'comprada',
    date: iso(new Date(today.getTime() - 4 * 86400000)),
  },
  {
    id: 'h9',
    pharmacy: 'FarmaNorte',
    medicine: 'Losartán 50mg',
    time: '10:30',
    status: 'pasada',
    date: iso(new Date(today.getTime() - 5 * 86400000)),
  },
  {
    id: 'h10',
    pharmacy: 'Farmastock',
    medicine: 'Enalapril 5mg',
    time: '20:50',
    status: 'comprada',
    date: iso(new Date(today.getTime() - 6 * 86400000)),
  },
];

export const tratamientos: TratamientoGroup[] = [
  {
    id: 'g1',
    title: 'Tratamiento 1',
    source: 'manual',
    medico: 'Dr. Andrés Fuentes',
    institucion: 'Clínica Andes',
    notas: 'Tomar en ayunas. Controlar la presión semanalmente.',
    items: [
      {
        id: 't1',
        pharmacy: 'Pharmaflo',
        medicine: 'Enalapril 5mg',
        dose: '1 comprimido',
        frequency: 'cada 24 horas',
        duration: '30 días',
        taken: [true],
      },
      {
        id: 't2',
        pharmacy: 'FarmaNorte',
        medicine: 'Losartán 50mg',
        dose: '50 mg',
        frequency: 'cada 12 horas',
        duration: '30 días',
        taken: [true, false],
      },
    ],
  },
  {
    id: 'g2',
    title: 'Tratamiento 2',
    source: 'manual',
    medico: 'Dra. Valeria Rojas',
    institucion: 'RedSalud',
    notas: 'Evitar alcohol mientras dure el tratamiento.',
    items: [
      {
        id: 't3',
        pharmacy: 'Farmastock',
        medicine: 'Clotiazepam 5mg',
        dose: '1 comprimido',
        frequency: 'cada 8 horas',
        duration: '5 días',
        taken: [true, true, false],
      },
      {
        id: 't4',
        pharmacy: 'Pharmaflo',
        medicine: 'Atorvastatina 20mg',
        dose: '20 mg',
        frequency: 'cada 24 horas',
        duration: '90 días',
        taken: [false],
      },
    ],
  },
];

export const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
export const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export type DayItem = {
  date: string;
  day: number;
  weekday: string;
  month: string;
};

export function buildWeekDays(from: Date = new Date()): DayItem[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(from);
    d.setDate(from.getDate() + i);
    return {
      date: iso(d),
      day: d.getDate(),
      weekday: WEEKDAYS[d.getDay()],
      month: MONTHS_SHORT[d.getMonth()],
    };
  });
}