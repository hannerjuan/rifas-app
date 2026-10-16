import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { mensajeError } from '../../core/errores';
import { RifaPublicaResumen } from '../../core/modelos';
import { PublicoService } from '../../core/publico.service';
import { DosCifrasPipe, FechaPipe, PesosPipe } from '../../shared/pipes';

// Portada: si hay una sola rifa activa se entra directo a ella
@Component({
  selector: 'app-inicio',
  imports: [RouterLink, FechaPipe, PesosPipe, DosCifrasPipe],
  template: `
    @if (cargando()) {
      <p class="py-10 text-center text-slate-500">Cargando…</p>
    } @else if (error()) {
      <p class="py-10 text-center text-rose-600">{{ error() }}</p>
    } @else {
      <h1 class="mb-1 text-2xl font-extrabold text-slate-900">Rifas activas</h1>
      <p class="mb-5 text-slate-500">Elige una rifa para ver los números disponibles.</p>

      @if (activas().length === 0) {
        <div class="tarjeta p-10 text-center text-slate-500">No hay rifas activas en este momento.</div>
      }
      <div class="grid gap-4 sm:grid-cols-2">
        @for (r of activas(); track r.id) {
          <a [routerLink]="['/rifa', r.id]" class="tarjeta group overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg">
            <div class="flex h-44 items-center justify-center bg-gradient-to-br from-marca-100 to-fuchsia-100">
              @if (r.premioImagenUrl) {
                <img [src]="r.premioImagenUrl" [alt]="r.premioNombre" class="h-full w-full object-contain p-4" loading="lazy" />
              } @else {
                <span class="text-6xl" aria-hidden="true">🏆</span>
              }
            </div>
            <div class="p-4">
              <h2 class="text-lg font-bold text-slate-900 group-hover:text-marca-700">{{ r.premioNombre }}</h2>
              <p class="text-sm text-slate-500">{{ r.nombre }}</p>
              <p class="mt-2 text-sm text-slate-600">📅 {{ r.fechaSorteo | fecha }}</p>
              <p class="text-sm text-slate-600">🎰 {{ r.loteria }}</p>
              <div class="mt-3 flex items-center justify-between">
                <span class="text-lg font-extrabold text-marca-700">{{ r.valorBoleta | pesos }}</span>
                <span class="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800"
                  >{{ r.disponibles }} disponibles</span
                >
              </div>
            </div>
          </a>
        }
      </div>

      @if (finalizadas().length) {
        <h2 class="mt-10 mb-3 text-lg font-bold text-slate-900">Resultados recientes</h2>
        <ul class="space-y-2">
          @for (r of finalizadas(); track r.id) {
            <li class="tarjeta flex items-center gap-4 p-3">
              <span class="flex size-14 shrink-0 items-center justify-center rounded-xl bg-fuchsia-100 text-2xl font-extrabold text-fuchsia-800 tabular-nums">{{
                r.numeroGanador | dosCifras
              }}</span>
              <div class="min-w-0">
                <p class="font-semibold text-slate-900">{{ r.nombre }} · {{ r.premioNombre }}</p>
                <p class="text-xs text-slate-500">
                  {{ r.loteria }} {{ r.resultadoLoteria }} · {{ r.fechaSorteo | fecha: 'corta' }} ·
                  {{ r.resultado === 'GANADOR' ? 'Hubo ganador 🎉' : 'Número sin pagar: premio para el vendedor' }}
                </p>
              </div>
            </li>
          }
        </ul>
      }
    }
  `,
})
export class Inicio {
  private readonly publico = inject(PublicoService);
  private readonly router = inject(Router);

  protected readonly cargando = signal(true);
  protected readonly error = signal('');
  protected readonly activas = signal<RifaPublicaResumen[]>([]);
  protected readonly finalizadas = signal<RifaPublicaResumen[]>([]);

  constructor() {
    this.publico.rifas().subscribe({
      next: ({ activas, finalizadas }) => {
        if (activas.length === 1 && finalizadas.length === 0) {
          this.router.navigate(['/rifa', activas[0].id], { replaceUrl: true });
          return;
        }
        this.activas.set(activas);
        this.finalizadas.set(finalizadas);
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(mensajeError(e));
        this.cargando.set(false);
      },
    });
  }
}
