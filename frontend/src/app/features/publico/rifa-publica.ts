import { Component, computed, DestroyRef, inject, input, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { AvisosService } from '../../core/avisos.service';
import { mensajeError } from '../../core/errores';
import { listaNumeros } from '../../core/formato';
import { RifaPublicaDetalle } from '../../core/modelos';
import { escucharCambios, PublicoService } from '../../core/publico.service';
import { enlaceWhatsApp, mensajePedido } from '../../core/whatsapp';
import { Celda, Leyenda, MatrizBoletas } from '../../shared/matriz-boletas';
import { DosCifrasPipe, FechaPipe, PesosPipe, TelefonoPipe } from '../../shared/pipes';

// Vista pública de una rifa: el comprador ve qué números siguen libres y los pide por WhatsApp
@Component({
  selector: 'app-rifa-publica',
  imports: [RouterLink, MatrizBoletas, Leyenda, DosCifrasPipe, FechaPipe, PesosPipe, TelefonoPipe],
  template: `
    @if (rifa(); as r) {
      <div class="grid gap-5 lg:grid-cols-[20rem_1fr]" [class.pb-24]="seleccion().length">
        <!-- Premio y condiciones -->
        <aside class="space-y-4">
          <div class="tarjeta overflow-hidden">
            <div class="flex h-52 items-center justify-center bg-gradient-to-br from-marca-100 to-fuchsia-100">
              @if (r.premioImagenUrl) {
                <img [src]="r.premioImagenUrl" [alt]="r.premioNombre" class="h-full w-full object-contain p-4" />
              } @else {
                <span class="text-7xl" aria-hidden="true">🏆</span>
              }
            </div>
            <div class="space-y-2 p-4">
              <p class="text-xs font-semibold tracking-wide text-marca-700 uppercase">{{ r.nombre }}</p>
              <h1 class="text-2xl font-extrabold text-slate-900">{{ r.premioNombre }}</h1>
              @if (r.premioDescripcion) {
                <p class="text-sm whitespace-pre-line text-slate-600">{{ r.premioDescripcion }}</p>
              }
              @if (r.premioUrl) {
                <a [href]="r.premioUrl" target="_blank" rel="noopener" class="inline-block text-sm font-semibold text-marca-700 hover:underline"
                  >Ver ficha técnica ↗</a
                >
              }
              <div class="flex items-end justify-between border-t border-slate-100 pt-3">
                <div>
                  <p class="text-xs text-slate-500">Valor por boleta</p>
                  <p class="text-2xl font-extrabold text-marca-700">{{ r.valorBoleta | pesos }}</p>
                </div>
                <p class="text-right text-sm text-slate-600">
                  <b class="text-lg text-emerald-700">{{ r.disponibles }}</b><br />disponibles
                </p>
              </div>
            </div>
          </div>

          <div class="tarjeta space-y-2 p-4 text-sm text-slate-700">
            <p>📅 <b>Sorteo:</b> {{ r.fechaSorteo | fecha }}</p>
            @if (faltan(); as f) {
              <p class="rounded-lg bg-marca-50 px-3 py-1.5 text-center font-semibold text-marca-800">⏳ Faltan {{ f }}</p>
            }
            <p>🎰 <b>Lotería:</b> {{ r.loteria }}</p>
            <p>Gana el número igual a las <b>dos últimas cifras</b> del resultado de la lotería.</p>
            <p class="rounded-lg bg-amber-50 px-3 py-2 text-amber-900">
              ⚠️ Las boletas que <b>no estén pagadas</b> antes del sorteo <b>no juegan</b>.
            </p>
            <p class="text-xs text-slate-500">Responsable: {{ r.responsableNombre }} · {{ r.responsableTelefono | telefono }}</p>
          </div>
        </aside>

        <!-- Matriz -->
        <section class="space-y-4">
          @if (r.estado === 'FINALIZADA') {
            <div class="tarjeta border-2 border-fuchsia-300 bg-fuchsia-50 p-4 text-center">
              <p class="text-sm text-fuchsia-900">Resultado de la {{ r.loteria }}: <b>{{ r.resultadoLoteria }}</b></p>
              <p class="text-5xl font-extrabold text-fuchsia-900 tabular-nums">{{ r.numeroGanador | dosCifras }}</p>
              <p class="text-sm text-fuchsia-800">
                {{ r.resultado === 'GANADOR' ? '¡Felicitaciones al ganador! 🎉' : 'El número ganador no estaba pagado: el premio queda para el vendedor.' }}
              </p>
            </div>
          } @else if (!r.ventasAbiertas) {
            <p class="tarjeta p-4 text-center text-sm text-slate-600">La venta de boletas cerró. Pronto se publicará el resultado.</p>
          }

          <div class="tarjeta p-3 sm:p-5">
            <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 class="font-bold text-slate-900">
                {{ r.ventasAbiertas ? 'Elige tus números' : 'Números' }}
              </h2>
              <app-leyenda [items]="leyenda" />
            </div>
            <app-matriz-boletas [celdas]="celdas()" (elegir)="alternar($event)" />
            @if (r.ventasAbiertas) {
              <p class="mt-3 text-xs text-slate-500">
                Toca los números libres que quieras y pídelos por WhatsApp. Quedan apartados cuando el responsable los registre.
              </p>
            }
          </div>

          <a routerLink="/consulta" class="tarjeta flex items-center justify-between p-4 text-sm hover:bg-marca-50">
            <span><b class="text-slate-900">¿Ya compraste?</b> Consulta el estado de tus boletas con tu WhatsApp.</span>
            <span class="text-marca-700" aria-hidden="true">→</span>
          </a>
        </section>
      </div>

      @if (seleccion().length) {
        <div class="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur">
          <div class="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-semibold text-slate-900">{{ listaNumeros(seleccion()) }}</p>
              <p class="text-xs text-slate-500">
                {{ seleccion().length }} × {{ r.valorBoleta | pesos }} = <b>{{ seleccion().length * r.valorBoleta | pesos }}</b>
              </p>
            </div>
            <button type="button" class="btn btn-secundario hidden sm:inline-flex" (click)="seleccion.set([])">Limpiar</button>
            <a [href]="enlacePedido()" target="_blank" rel="noopener" class="btn btn-whatsapp">Pedir por WhatsApp</a>
          </div>
        </div>
      }
    } @else if (error()) {
      <div class="tarjeta p-10 text-center">
        <p class="text-slate-600">{{ error() }}</p>
        <a routerLink="/" class="btn btn-secundario mt-4">Ver rifas</a>
      </div>
    } @else {
      <p class="py-10 text-center text-slate-500">Cargando…</p>
    }
  `,
})
export class RifaPublicaPagina implements OnInit {
  private readonly publico = inject(PublicoService);
  private readonly avisos = inject(AvisosService);
  private readonly destroyRef = inject(DestroyRef);

  readonly id = input.required<string>();

  protected readonly rifa = signal<RifaPublicaDetalle | null>(null);
  protected readonly seleccion = signal<number[]>([]);
  protected readonly error = signal('');
  private readonly ahora = signal(Date.now());

  protected readonly listaNumeros = listaNumeros;
  protected readonly leyenda = [
    { tono: 'disponible' as const, etiqueta: 'Disponible' },
    { tono: 'ocupada' as const, etiqueta: 'Vendida' },
    { tono: 'seleccionada' as const, etiqueta: 'Tu selección' },
  ];

  protected readonly celdas = computed<Celda[]>(() => {
    const r = this.rifa();
    if (!r) return [];
    const seleccion = new Set(this.seleccion());
    return r.boletas.map((b) => ({
      numero: b.numero,
      tono: b.ocupada ? 'ocupada' : 'disponible',
      interactiva: r.ventasAbiertas && !b.ocupada,
      seleccionada: seleccion.has(b.numero),
      ganadora: r.estado === 'FINALIZADA' && r.numeroGanador === b.numero,
      titulo: b.ocupada ? 'Vendida' : 'Disponible',
    }));
  });

  protected readonly enlacePedido = computed(() => {
    const r = this.rifa();
    return r ? enlaceWhatsApp(r.responsableTelefono, mensajePedido(r, this.seleccion())) : '';
  });

  protected readonly faltan = computed(() => {
    const r = this.rifa();
    if (!r || !r.ventasAbiertas) return '';
    const ms = new Date(r.fechaSorteo).getTime() - this.ahora();
    if (ms <= 0) return '';
    const dias = Math.floor(ms / 86_400_000);
    const horas = Math.floor((ms % 86_400_000) / 3_600_000);
    const minutos = Math.floor((ms % 3_600_000) / 60_000);
    if (dias > 0) return `${dias} ${dias === 1 ? 'día' : 'días'} y ${horas} h`;
    if (horas > 0) return `${horas} h y ${minutos} min`;
    return `${minutos} min`;
  });

  ngOnInit() {
    this.cargar();
    escucharCambios(this.id(), this.destroyRef)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.cargar());
    const reloj = setInterval(() => this.ahora.set(Date.now()), 30_000);
    this.destroyRef.onDestroy(() => clearInterval(reloj));
  }

  private cargar() {
    this.publico.rifa(this.id()).subscribe({
      next: (r) => {
        this.rifa.set(r);
        // Si alguien compró un número que estaba en la selección, se quita y se avisa
        const ocupadas = new Set(r.boletas.filter((b) => b.ocupada).map((b) => b.numero));
        const perdidas = this.seleccion().filter((n) => ocupadas.has(n));
        if (perdidas.length) {
          this.seleccion.update((s) => s.filter((n) => !ocupadas.has(n)));
          this.avisos.info(`Ya no están disponibles: ${listaNumeros(perdidas)}.`);
        }
        if (!r.ventasAbiertas) this.seleccion.set([]);
      },
      error: (e) => this.error.set(mensajeError(e, 'No se encontró la rifa.')),
    });
  }

  alternar(numero: number) {
    this.seleccion.update((s) => (s.includes(numero) ? s.filter((n) => n !== numero) : [...s, numero].sort((a, b) => a - b)));
  }
}
