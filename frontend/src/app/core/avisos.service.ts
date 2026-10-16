import { Injectable, signal } from '@angular/core';

export interface Aviso {
  id: number;
  tipo: 'exito' | 'error' | 'info';
  texto: string;
}

// Mensajes flotantes ("toasts") que desaparecen solos
@Injectable({ providedIn: 'root' })
export class AvisosService {
  private siguienteId = 1;
  readonly avisos = signal<Aviso[]>([]);

  exito(texto: string) {
    this.mostrar('exito', texto);
  }

  error(texto: string) {
    this.mostrar('error', texto, 7000);
  }

  info(texto: string) {
    this.mostrar('info', texto);
  }

  cerrar(id: number) {
    this.avisos.update((lista) => lista.filter((a) => a.id !== id));
  }

  private mostrar(tipo: Aviso['tipo'], texto: string, duracion = 4000) {
    const id = this.siguienteId++;
    this.avisos.update((lista) => [...lista.slice(-3), { id, tipo, texto }]);
    setTimeout(() => this.cerrar(id), duracion);
  }
}
