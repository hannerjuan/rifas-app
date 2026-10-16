import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AvisosService } from '../../core/avisos.service';
import { mensajeError } from '../../core/errores';
import { Rifa } from '../../core/modelos';
import { RifasService } from '../../core/rifas.service';
import { DosCifrasPipe, FechaPipe, PesosPipe } from '../../shared/pipes';

@Component({
  selector: 'app-rifas-lista',
  imports: [RouterLink, FechaPipe, PesosPipe, DosCifrasPipe],
  template: `
    <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-2xl font-extrabold text-slate-900">Rifas</h1>
      <a routerLink="/admin/rifas/nueva" class="btn btn-primario">＋ Nueva rifa</a>
    </div>

    <div class="mb-5 inline-flex rounded-xl bg-slate-200 p-1 text-sm font-semibold" role="tablist">
      @for (t of pestanas; track t.valor) {
        <button
          type="button"
          role="tab"
          class="cursor-pointer rounded-lg px-4 py-1.5 transition"
          [class]="vista() === t.valor ? 'bg-white text-marca-800 shadow' : 'text-slate-600 hover:text-slate-900'"
          [attr.aria-selected]="vista() === t.valor"
          (click)="cambiarVista(t.valor)"
        >
          {{ t.etiqueta }}
        </button>
      }
    </div>

    @if (cargando()) {
      <p class="text-slate-500">Cargando…</p>
    } @else if (rifas().length === 0) {
      <div class="tarjeta p-10 text-center text-slate-500">
        @if (vista() === 'activas') {
          <p class="mb-4">No hay rifas activas.</p>
          <a routerLink="/admin/rifas/nueva" class="btn btn-primario">Crear la primera rifa</a>
        } @else {
          <p>Todavía no hay rifas finalizadas.</p>
        }
      </div>
    } @else {
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        @for (r of rifas(); track r.id) {
          <a
            [routerLink]="['/admin/rifas', r.id]"
            class="tarjeta group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div class="flex h-36 items-center justify-center bg-gradient-to-br from-marca-100 to-fuchsia-100">
              @if (r.premioImagenUrl) {
                <img [src]="r.premioImagenUrl" [alt]="r.premioNombre" class="h-full w-full object-contain p-3" loading="lazy" />
              } @else {
                <span class="text-5xl" aria-hidden="true">🏆</span>
              }
            </div>
            <div class="flex flex-1 flex-col gap-2 p-4">
              <div class="flex items-start justify-between gap-2">
                <h2 class="font-bold text-slate-900 group-hover:text-marca-700">{{ r.nombre }}</h2>
                <span class="shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold" [class]="claseEstado(r)">{{
                  etiquetaEstado(r)
                }}</span>
              </div>
              <p class="text-sm text-slate-600">🏆 {{ r.premioNombre }}</p>
              <p class="text-xs text-slate-500">📅 {{ r.fechaSorteo | fecha: 'corta' }} · {{ r.loteria }}</p>
              <p class="text-xs text-slate-500">💵 {{ r.valorBoleta | pesos }} por boleta</p>

              @if (r.estado === 'FINALIZADA') {
                <p class="mt-1 rounded-lg bg-fuchsia-50 px-3 py-2 text-sm text-fuchsia-900">
                  Resultado <b>{{ r.resultadoLoteria }}</b> → <b>{{ r.numeroGanador | dosCifras }}</b>:
                  {{ r.resultado === 'GANADOR' ? 'ganó ' + r.ganadorNombre : 'premio para el vendedor' }}
                </p>
              }

              <div class="mt-auto pt-2">
                <div class="flex h-2.5 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
                  <div class="bg-emerald-500" [style.width.%]="r.metricas.pagadas"></div>
                  <div class="bg-amber-400" [style.width.%]="r.metricas.reservadas"></div>
                </div>
                <div class="mt-1.5 flex justify-between text-xs text-slate-600">
                  <span
                    ><b class="text-emerald-700">{{ r.metricas.pagadas }}</b> pagadas ·
                    <b class="text-amber-700">{{ r.metricas.reservadas }}</b> reservadas</span
                  >
                  <span>{{ r.metricas.disponibles }} libres</span>
                </div>
              </div>
            </div>
          </a>
        }
      </div>
    }
  `,
})
export class RifasLista {
  private readonly rifasService = inject(RifasService);
  private readonly avisos = inject(AvisosService);

  protected readonly pestanas = [
    { valor: 'activas' as const, etiqueta: 'Activas' },
    { valor: 'historial' as const, etiqueta: 'Historial' },
  ];
  protected readonly vista = signal<'activas' | 'historial'>('activas');
  protected readonly rifas = signal<Rifa[]>([]);
  protected readonly cargando = signal(true);

  constructor() {
    this.cargar();
  }

  cambiarVista(vista: 'activas' | 'historial') {
    this.vista.set(vista);
    this.cargar();
  }

  private cargar() {
    this.cargando.set(true);
    this.rifasService.listar(this.vista()).subscribe({
      next: (r) => {
        this.rifas.set(r);
        this.cargando.set(false);
      },
      error: (e) => {
        this.avisos.error(mensajeError(e));
        this.cargando.set(false);
      },
    });
  }

  protected etiquetaEstado(r: Rifa) {
    if (r.estado === 'ACTIVA') return new Date(r.fechaSorteo) <= new Date() ? 'Por cerrar' : 'Activa';
    return r.estado === 'FINALIZADA' ? 'Finalizada' : 'Cancelada';
  }

  protected claseEstado(r: Rifa) {
    if (r.estado === 'ACTIVA') {
      return new Date(r.fechaSorteo) <= new Date() ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800';
    }
    return r.estado === 'FINALIZADA' ? 'bg-fuchsia-100 text-fuchsia-800' : 'bg-slate-200 text-slate-600';
  }
}
