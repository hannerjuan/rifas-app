import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, computed, inject, signal } from '@angular/core';
import { mensajeError } from '../../core/errores';
import { Boleta, ETIQUETA_ESTADO, Rifa } from '../../core/modelos';
import { RifasService } from '../../core/rifas.service';
import { DosCifrasPipe, FechaPipe } from '../../shared/pipes';

export interface DatosFinalizar {
  rifa: Rifa;
  boletas: Boleta[];
}

// Registro del resultado de la lotería: gana la boleta con las dos últimas cifras, solo si está pagada
@Component({
  selector: 'app-finalizar-dialog',
  imports: [DosCifrasPipe, FechaPipe],
  template: `
    <form class="dialogo" (submit)="$event.preventDefault(); finalizar()">
      <div class="dialogo-encabezado">
        <div>
          <h2 class="text-lg font-bold">Registrar resultado y finalizar</h2>
          <p class="text-sm text-slate-500">{{ datos.rifa.loteria }} · {{ datos.rifa.fechaSorteo | fecha: 'corta' }}</p>
        </div>
        <button type="button" class="cursor-pointer text-slate-400 hover:text-slate-700" (click)="ref.close()" aria-label="Cerrar">
          ✕
        </button>
      </div>

      <div class="dialogo-cuerpo space-y-4">
        <div>
          <label class="etiqueta" for="resultado">Número ganador de la lotería (4 cifras)</label>
          <input
            id="resultado"
            name="resultado"
            class="campo text-center text-3xl font-extrabold tracking-[0.4em] tabular-nums"
            inputmode="numeric"
            maxlength="4"
            autocomplete="off"
            placeholder="0000"
            #campo
            (input)="alEscribir(campo)"
            cdkFocusInitial
          />
        </div>

        @if (vista(); as v) {
          <div class="rounded-xl border-2 p-4 text-center" [class]="v.gana ? 'border-emerald-400 bg-emerald-50' : 'border-amber-400 bg-amber-50'">
            <p class="text-sm text-slate-600">
              {{ resultado().slice(0, 2) }}<b class="text-lg text-slate-900 underline">{{ resultado().slice(2) }}</b> →
              número ganador
            </p>
            <p class="my-1 text-5xl font-extrabold tabular-nums text-slate-900">{{ v.numero | dosCifras }}</p>
            @if (v.gana) {
              <p class="font-semibold text-emerald-800">🎉 Gana {{ v.boleta!.venta!.nombre }}</p>
              <p class="text-xs text-emerald-700">La boleta está pagada.</p>
            } @else if (v.boleta?.venta) {
              <p class="font-semibold text-amber-800">El premio queda para el vendedor</p>
              <p class="text-xs text-amber-700">
                La boleta de {{ v.boleta!.venta!.nombre }} está {{ etiqueta[v.boleta!.estado].toLowerCase() }} (sin pagar): no juega.
              </p>
            } @else {
              <p class="font-semibold text-amber-800">El premio queda para el vendedor</p>
              <p class="text-xs text-amber-700">Ese número no se vendió.</p>
            }
          </div>
        }

        <p class="text-xs text-slate-500">
          Al finalizar, la rifa pasa al historial y ya no se pueden hacer cambios. Verifique el resultado en la fuente oficial
          de la lotería.
        </p>
        @if (error()) {
          <p class="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">{{ error() }}</p>
        }
      </div>

      <div class="dialogo-pie">
        <button type="button" class="btn btn-secundario" (click)="ref.close()">Cancelar</button>
        <button type="submit" class="btn btn-primario" [disabled]="!vista() || guardando()">
          {{ guardando() ? 'Finalizando…' : 'Confirmar y finalizar' }}
        </button>
      </div>
    </form>
  `,
})
export class FinalizarDialog {
  protected readonly datos = inject<DatosFinalizar>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<Rifa>>(DialogRef);
  private readonly rifasService = inject(RifasService);

  protected readonly etiqueta = ETIQUETA_ESTADO;
  protected readonly resultado = signal('');
  protected readonly guardando = signal(false);
  protected readonly error = signal('');

  // Vista previa calculada en pantalla (el servidor vuelve a calcularlo al confirmar)
  protected readonly vista = computed(() => {
    const r = this.resultado();
    if (!/^\d{4}$/.test(r)) return null;
    const numero = Number(r.slice(2));
    const boleta = this.datos.boletas.find((b) => b.numero === numero);
    return { numero, boleta, gana: boleta?.estado === 'PAGADA' && !!boleta.venta };
  });

  // Solo dígitos, máximo 4
  alEscribir(campo: HTMLInputElement) {
    campo.value = campo.value.replace(/\D/g, '').slice(0, 4);
    this.resultado.set(campo.value);
  }

  finalizar() {
    if (!this.vista()) return;
    this.guardando.set(true);
    this.error.set('');
    this.rifasService.finalizar(this.datos.rifa.id, this.resultado()).subscribe({
      next: (rifa) => this.ref.close(rifa),
      error: (e) => {
        this.error.set(mensajeError(e));
        this.guardando.set(false);
      },
    });
  }
}
