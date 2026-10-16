import { HttpClient } from '@angular/common/http';
import { DestroyRef, inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { Respuesta, ResultadoConsulta, RifaPublicaDetalle, RifaPublicaResumen } from './modelos';

const API = '/api/v1/publico';

@Injectable({ providedIn: 'root' })
export class PublicoService {
  private readonly http = inject(HttpClient);

  rifas() {
    return this.http
      .get<Respuesta<{ activas: RifaPublicaResumen[]; finalizadas: RifaPublicaResumen[] }>>(`${API}/rifas`)
      .pipe(map((r) => r.data));
  }

  rifa(id: string) {
    return this.http.get<Respuesta<RifaPublicaDetalle>>(`${API}/rifas/${id}`).pipe(map((r) => r.data));
  }

  consulta(telefono: string) {
    return this.http
      .get<Respuesta<ResultadoConsulta[]>>(`${API}/consulta`, { params: { telefono } })
      .pipe(map((r) => r.data));
  }
}

// Escucha los cambios de una rifa (Server-Sent Events). Se usa tanto en el panel como en el portal:
// el servidor solo avisa que algo cambió y cada pantalla vuelve a consultar lo suyo.
// Se cierra sola al destruirse el componente que la usa.
export function escucharCambios(rifaId: string, destroyRef: DestroyRef): Observable<void> {
  return new Observable<void>((suscriptor) => {
    if (typeof EventSource === 'undefined') return;
    let espera: ReturnType<typeof setTimeout> | undefined;
    const fuente = new EventSource(`${API}/rifas/${rifaId}/eventos`);
    // Varios cambios seguidos (p. ej. una venta de 5 números) generan una sola recarga
    fuente.addEventListener('cambio', () => {
      clearTimeout(espera);
      espera = setTimeout(() => suscriptor.next(), 300);
    });
    const cerrar = () => {
      clearTimeout(espera);
      fuente.close();
    };
    const quitar = destroyRef.onDestroy(cerrar);
    return () => {
      quitar();
      cerrar();
    };
  });
}
