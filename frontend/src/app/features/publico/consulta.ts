import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { mensajeError } from '../../core/errores';
import { componerTelefono, normalizarTelefono, PAISES_TELEFONO, PaisTelefono } from '../../core/formato';
import { ResultadoConsulta } from '../../core/modelos';
import { PublicoService } from '../../core/publico.service';
import { enlaceWhatsApp, mensajeReportarPago } from '../../core/whatsapp';
import { DosCifrasPipe, FechaPipe, PesosPipe, TelefonoPipe } from '../../shared/pipes';

// Portal del comprador: ingresa su WhatsApp y ve sus boletas
@Component({
  selector: 'app-consulta',
  imports: [FormsModule, RouterLink, DosCifrasPipe, FechaPipe, PesosPipe, TelefonoPipe],
  template: `
    <div class="mx-auto max-w-xl">
      <div class="mb-6 text-center">
        <div class="text-4xl" aria-hidden="true">🔎</div>
        <h1 class="mt-2 text-2xl font-extrabold text-slate-900">Consulta tus boletas</h1>
        <p class="text-slate-500">Escribe el número de WhatsApp con el que compraste.</p>
      </div>

      <form class="tarjeta flex gap-2 p-3" (ngSubmit)="consultar()">
        <select class="campo w-24 shrink-0 px-2 sm:w-28" name="pais" aria-label="País del número" [(ngModel)]="pais">
          @for (p of paises; track p.codigo) {
            <option [value]="p.codigo">{{ p.etiqueta }}</option>
          }
        </select>
        <label for="telefono" class="sr-only">Número de WhatsApp</label>
        <input
          id="telefono"
          name="telefono"
          type="tel"
          inputmode="tel"
          class="campo min-w-0 text-lg"
          [placeholder]="placeholder()"
          autocomplete="tel-national"
          [(ngModel)]="telefono"
        />
        <button type="submit" class="btn btn-primario shrink-0" [disabled]="cargando()">
          {{ cargando() ? 'Buscando…' : 'Consultar' }}
        </button>
      </form>
      @if (error()) {
        <p class="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">{{ error() }}</p>
      }

      @if (resultados(); as lista) {
        @if (lista.length === 0) {
          <div class="tarjeta mt-5 p-8 text-center text-slate-600">
            <p>No encontramos boletas para <b>{{ consultado() | telefono }}</b> en las rifas vigentes.</p>
            <a routerLink="/" class="btn btn-primario mt-4">Ver números disponibles</a>
          </div>
        }

        <div class="mt-5 space-y-4">
          @for (res of lista; track res.rifa.id) {
            <article class="tarjeta overflow-hidden">
              <div class="bg-gradient-to-r from-marca-800 to-fuchsia-700 px-4 py-3 text-white">
                <p class="text-xs opacity-80">{{ res.rifa.nombre }}</p>
                <h2 class="text-lg font-bold">🏆 {{ res.rifa.premioNombre }}</h2>
              </div>
              <div class="space-y-4 p-4">
                <p class="text-slate-700">Hola <b>{{ res.nombre }}</b>, estos son tus números:</p>

                <div class="flex flex-wrap gap-2">
                  @for (b of res.boletas; track b.numero) {
                    <div
                      class="flex w-16 flex-col items-center rounded-xl py-2"
                      [class]="b.estado === 'PAGADA' ? 'bg-emerald-500 text-white' : 'bg-amber-300 text-amber-950'"
                      [class.ring-4]="res.rifa.numeroGanador === b.numero && res.rifa.estado === 'FINALIZADA'"
                      [class.ring-fuchsia-500]="res.rifa.numeroGanador === b.numero && res.rifa.estado === 'FINALIZADA'"
                    >
                      <span class="text-2xl font-extrabold tabular-nums">{{ b.numero | dosCifras }}</span>
                      <span class="text-[10px] font-bold uppercase">{{ b.estado === 'PAGADA' ? 'Pagada' : 'Sin pagar' }}</span>
                    </div>
                  }
                </div>

                <div class="grid grid-cols-2 gap-2 text-sm">
                  <div class="rounded-lg bg-emerald-50 px-3 py-2">
                    <p class="text-xs text-emerald-700">Pagado</p>
                    <p class="font-bold text-emerald-900">{{ res.pagado | pesos }}</p>
                  </div>
                  <div class="rounded-lg px-3 py-2" [class]="res.pendiente ? 'bg-amber-50' : 'bg-slate-50'">
                    <p class="text-xs" [class]="res.pendiente ? 'text-amber-700' : 'text-slate-500'">Pendiente</p>
                    <p class="font-bold" [class]="res.pendiente ? 'text-amber-900' : 'text-slate-700'">{{ res.pendiente | pesos }}</p>
                  </div>
                </div>

                @if (res.rifa.estado === 'FINALIZADA') {
                  <div class="rounded-xl p-3 text-center" [class]="res.gano ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-100 text-slate-700'">
                    <p class="text-sm">
                      Resultado {{ res.rifa.loteria }}: <b>{{ res.rifa.resultadoLoteria }}</b> → número
                      <b>{{ res.rifa.numeroGanador | dosCifras }}</b>
                    </p>
                    <p class="font-bold">{{ res.gano ? '🎉 ¡Ganaste! El responsable se comunicará contigo.' : 'Esta vez no ganaste. ¡Gracias por participar!' }}</p>
                  </div>
                } @else {
                  @if (res.pendiente) {
                    <div class="rounded-xl border-2 border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                      <p>
                        ⚠️ Tienes boletas <b>sin pagar</b>. Si no se pagan antes del sorteo, <b>no juegan</b>
                      </p>
                      <a [href]="enlacePago(res)" target="_blank" rel="noopener" class="btn btn-whatsapp btn-sm mt-2">
                        Enviar comprobante a {{ res.rifa.responsableNombre }}
                      </a>
                    </div>
                  } @else {
                    <p class="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">✅ Todas tus boletas están pagadas: ¡ya estás participando!</p>
                  }
                  <div class="space-y-1 text-sm text-slate-600">
                    <p>📅 <b>Sorteo:</b> {{ res.rifa.fechaSorteo | fecha }}</p>
                    <p>🎰 <b>Lotería:</b> {{ res.rifa.loteria }} (dos últimas cifras)</p>
                    @if (res.rifa.premioUrl) {
                      <a [href]="res.rifa.premioUrl" target="_blank" rel="noopener" class="text-marca-700 hover:underline">Ver ficha del premio ↗</a>
                    }
                  </div>
                }
                <a [routerLink]="['/rifa', res.rifa.id]" class="block text-sm font-semibold text-marca-700 hover:underline"
                  >Ver la rifa y comprar más números →</a
                >
              </div>
            </article>
          }
        </div>
      }
    </div>
  `,
})
export class Consulta {
  private readonly publico = inject(PublicoService);

  protected readonly paises = PAISES_TELEFONO;
  protected pais: PaisTelefono = 'CO';
  protected telefono = '';

  protected placeholder() {
    return PAISES_TELEFONO.find((p) => p.codigo === this.pais)?.placeholder ?? '';
  }
  protected readonly consultado = signal('');
  protected readonly cargando = signal(false);
  protected readonly error = signal('');
  protected readonly resultados = signal<ResultadoConsulta[] | null>(null);

  consultar() {
    const tel = normalizarTelefono(componerTelefono(this.pais, this.telefono));
    if (!tel) {
      this.error.set('Escribe un celular válido de Colombia (10 dígitos) o de España (9 dígitos).');
      return;
    }
    this.error.set('');
    this.cargando.set(true);
    this.publico.consulta(tel).subscribe({
      next: (r) => {
        this.consultado.set(tel);
        this.resultados.set(r);
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(mensajeError(e));
        this.cargando.set(false);
      },
    });
  }

  protected enlacePago(res: ResultadoConsulta) {
    const sinPagar = res.boletas.filter((b) => b.estado === 'RESERVADA').map((b) => b.numero);
    return enlaceWhatsApp(res.rifa.responsableTelefono, mensajeReportarPago(res.rifa, res.nombre, sinPagar));
  }
}
