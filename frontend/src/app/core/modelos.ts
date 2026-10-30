export type EstadoRifa = 'ACTIVA' | 'FINALIZADA' | 'CANCELADA';
export type EstadoBoleta = 'DISPONIBLE' | 'RESERVADA' | 'PAGADA';
export type ResultadoSorteo = 'GANADOR' | 'CASA';

export interface Respuesta<T> {
  success: boolean;
  data: T;
}

export interface Metricas {
  disponibles: number;
  reservadas: number;
  pagadas: number;
  recaudado: number;
  porCobrar: number;
  potencial: number;
}

// Datos que necesita el mensaje de WhatsApp (los tiene tanto la rifa del panel como la pública)
export interface DatosSorteo {
  nombre: string;
  premioNombre: string;
  premioUrl: string | null;
  valorBoleta: number;
  fechaSorteo: string;
  loteria: string;
  responsableNombre: string;
  responsableTelefono: string;
}

export interface RifaPublica extends DatosSorteo {
  id: string;
  premioDescripcion: string | null;
  premioImagenUrl: string | null;
  estado: EstadoRifa;
  resultadoLoteria: string | null;
  numeroGanador: number | null;
  resultado: ResultadoSorteo | null;
}

export interface Rifa extends RifaPublica {
  cuentasPago: string | null;
  ganadorNombre: string | null;
  ganadorTelefono: string | null;
  finalizadaEn: string | null;
  canceladaEn: string | null;
  createdAt: string;
  metricas: Metricas;
}

export interface Boleta {
  id: string;
  numero: number;
  estado: EstadoBoleta;
  reservadaEn: string | null;
  pagadaEn: string | null;
  venta: { id: string; nombre: string; telefono: string } | null;
}

export interface Venta {
  id: string;
  rifaId: string;
  nombre: string;
  telefono: string;
  createdAt: string;
  updatedAt: string;
  vendedor: { nombre: string };
  boletas: { numero: number; estado: EstadoBoleta; pagadaEn: string | null }[];
}

export interface Movimiento {
  id: string;
  estadoAnterior: EstadoBoleta;
  estadoNuevo: EstadoBoleta;
  nombre: string | null;
  telefono: string | null;
  motivo: string | null;
  createdAt: string;
  usuario: { nombre: string };
}

export interface Loteria {
  nombre: string;
  dia: number; // 0 = domingo
  hora: string; // HH:mm
}

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  activo: boolean;
  createdAt: string;
}

// Portal público
export interface RifaPublicaResumen extends RifaPublica {
  disponibles: number;
}

export interface RifaPublicaDetalle extends RifaPublicaResumen {
  ventasAbiertas: boolean;
  boletas: { numero: number; ocupada: boolean }[];
}

export interface ResultadoConsulta {
  rifa: RifaPublica;
  nombre: string;
  boletas: { numero: number; estado: EstadoBoleta }[];
  pagado: number;
  pendiente: number;
  gano: boolean;
}

export const ETIQUETA_ESTADO: Record<EstadoBoleta, string> = {
  DISPONIBLE: 'Disponible',
  RESERVADA: 'Reservada',
  PAGADA: 'Pagada',
};
