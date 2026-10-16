import { HttpClient, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, tap } from 'rxjs';
import { Boleta, EstadoBoleta, Loteria, Metricas, Movimiento, Respuesta, Rifa, Usuario, Venta } from './modelos';

export interface RifaEntrada {
  nombre: string;
  premioNombre: string;
  premioDescripcion: string | null;
  premioUrl: string | null;
  premioImagenUrl: string | null;
  valorBoleta: number;
  fechaSorteo: string;
  loteria: string;
  responsableNombre: string;
  responsableTelefono: string;
}

const API = '/api/v1';

// Cliente de la API del panel de administración
@Injectable({ providedIn: 'root' })
export class RifasService {
  private readonly http = inject(HttpClient);

  private dato<T>(o: Observable<Respuesta<T>>): Observable<T> {
    return o.pipe(map((r) => r.data));
  }

  // Rifas
  listar(vista: 'activas' | 'historial') {
    return this.dato(this.http.get<Respuesta<Rifa[]>>(`${API}/rifas`, { params: { vista } }));
  }
  obtener(id: string) {
    return this.dato(this.http.get<Respuesta<Rifa>>(`${API}/rifas/${id}`));
  }
  crear(datos: RifaEntrada) {
    return this.dato(this.http.post<Respuesta<Rifa>>(`${API}/rifas`, datos));
  }
  actualizar(id: string, datos: Partial<RifaEntrada>) {
    return this.dato(this.http.patch<Respuesta<Rifa>>(`${API}/rifas/${id}`, datos));
  }
  cancelar(id: string) {
    return this.dato(this.http.post<Respuesta<Rifa>>(`${API}/rifas/${id}/cancelar`, {}));
  }
  finalizar(id: string, resultadoLoteria: string) {
    return this.dato(this.http.post<Respuesta<Rifa>>(`${API}/rifas/${id}/finalizar`, { resultadoLoteria }));
  }
  metricas(id: string) {
    return this.dato(this.http.get<Respuesta<Metricas>>(`${API}/rifas/${id}/metricas`));
  }

  // Boletas
  boletas(id: string) {
    return this.dato(this.http.get<Respuesta<Boleta[]>>(`${API}/rifas/${id}/boletas`));
  }
  cambiarEstado(id: string, numeros: number[], estado: EstadoBoleta, motivo?: string) {
    return this.dato(
      this.http.post<Respuesta<{ numeros: number[]; estado: EstadoBoleta }>>(`${API}/rifas/${id}/boletas/estado`, {
        numeros,
        estado,
        motivo,
      }),
    );
  }
  movimientos(id: string, numero: number) {
    return this.dato(this.http.get<Respuesta<Movimiento[]>>(`${API}/rifas/${id}/boletas/${numero}/movimientos`));
  }

  // Ventas
  ventas(id: string) {
    return this.dato(this.http.get<Respuesta<Venta[]>>(`${API}/rifas/${id}/ventas`));
  }
  venta(id: string, ventaId: string) {
    return this.dato(this.http.get<Respuesta<Venta>>(`${API}/rifas/${id}/ventas/${ventaId}`));
  }
  vender(id: string, datos: { numeros: number[]; nombre: string; telefono: string; estado: 'RESERVADA' | 'PAGADA' }) {
    return this.dato(this.http.post<Respuesta<Venta>>(`${API}/rifas/${id}/ventas`, datos));
  }
  editarVenta(id: string, ventaId: string, datos: { nombre: string; telefono: string }) {
    return this.dato(this.http.patch<Respuesta<Venta>>(`${API}/rifas/${id}/ventas/${ventaId}`, datos));
  }

  // Exportes: se descargan como archivo
  exportar(id: string, formato: 'pdf' | 'excel') {
    return this.http
      .get(`${API}/rifas/${id}/exportar/${formato}`, { responseType: 'blob', observe: 'response' })
      .pipe(tap((r) => descargar(r, formato === 'pdf' ? 'compradores.pdf' : 'compradores.xlsx')));
  }

  // Catálogos y usuarios
  loterias() {
    return this.dato(this.http.get<Respuesta<Loteria[]>>(`${API}/loterias`));
  }
  usuarios() {
    return this.dato(this.http.get<Respuesta<Usuario[]>>(`${API}/usuarios`));
  }
  crearUsuario(datos: { nombre: string; email: string; password: string }) {
    return this.dato(this.http.post<Respuesta<Usuario>>(`${API}/usuarios`, datos));
  }
  actualizarUsuario(id: string, datos: { nombre?: string; activo?: boolean; password?: string }) {
    return this.dato(this.http.patch<Respuesta<Usuario>>(`${API}/usuarios/${id}`, datos));
  }
}

function descargar(respuesta: HttpResponse<Blob>, nombrePorDefecto: string) {
  const disposicion = respuesta.headers.get('Content-Disposition') ?? '';
  const nombre = /filename="?([^";]+)"?/.exec(disposicion)?.[1] ?? nombrePorDefecto;
  const url = URL.createObjectURL(respuesta.body!);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  enlace.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
