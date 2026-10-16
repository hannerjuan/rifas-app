import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { startWith } from 'rxjs';
import { mensajeError } from '../../core/errores';
import { listaNumeros, normalizarTelefono } from '../../core/formato';
import { Rifa, Venta } from '../../core/modelos';
import { RifasService } from '../../core/rifas.service';
import { enlaceWhatsApp, mensajeComprador } from '../../core/whatsapp';
import { DosCifrasPipe, PesosPipe, TelefonoPipe } from '../../shared/pipes';

export interface DatosVenta {
  rifa: Rifa;
  numeros: number[];
  // Compradores ya registrados en la rifa (para sugerir el nombre al escribir el teléfono)
  compradores: { nombre: string; telefono: string; numeros: number[] }[];
}

function telefonoValido(control: AbstractControl): ValidationErrors | null {
  return control.value && !normalizarTelefono(control.value) ? { telefono: true } : null;
}

@Component({
  selector: 'app-venta-dialog',
  imports: [ReactiveFormsModule, DosCifrasPipe, PesosPipe, TelefonoPipe],
  template: `
    @if (venta(); as v) {
      <!-- Venta registrada: enviar la confirmación por WhatsApp -->
      <div class="dialogo">
        <div class="dialogo-cuerpo py-6 text-center">
          <div class="text-5xl" aria-hidden="true">{{ v.boletas[0].estado === 'PAGADA' ? '✅' : '📝' }}</div>
          <h2 class="mt-2 text-xl font-bold text-slate-900">Venta registrada</h2>
          <p class="mt-1 text-sm text-slate-600">
            {{ v.nombre }} · {{ v.telefono | telefono }}<br />
            Números <b>{{ lista(v) }}</b> ·
            {{ v.boletas[0].estado === 'PAGADA' ? 'pagados' : 'reservados (pendientes de pago)' }}
          </p>
          <a [href]="enlace()" target="_blank" rel="noopener" class="btn btn-whatsapp mt-5 w-full py-3 text-base">
            Enviar confirmación por WhatsApp
          </a>
          <p class="ayuda mt-2">Se abre WhatsApp con el mensaje listo; solo falta enviarlo.</p>
        </div>
        <div class="dialogo-pie">
          <button type="button" class="btn btn-secundario" (click)="ref.close(v)">Cerrar</button>
        </div>
      </div>
    } @else {
      <form class="dialogo" [formGroup]="form" (ngSubmit)="vender()">
        <div class="dialogo-encabezado">
          <div>
            <h2 class="text-lg font-bold">Vender {{ datos.numeros.length === 1 ? 'boleta' : datos.numeros.length + ' boletas' }}</h2>
            <p class="text-sm text-slate-500">{{ datos.rifa.nombre }}</p>
          </div>
          <button type="button" class="cursor-pointer text-slate-400 hover:text-slate-700" (click)="ref.close()" aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div class="dialogo-cuerpo space-y-4">
          <div class="flex flex-wrap gap-1.5">
            @for (n of datos.numeros; track n) {
              <span class="rounded-lg bg-marca-700 px-2.5 py-1 font-bold text-white tabular-nums">{{ n | dosCifras }}</span>
            }
          </div>
          <p class="text-sm text-slate-600">
            Total: {{ datos.numeros.length }} × {{ datos.rifa.valorBoleta | pesos }} =
            <b class="text-slate-900">{{ datos.numeros.length * datos.rifa.valorBoleta | pesos }}</b>
          </p>

          <div>
            <label class="etiqueta" for="telefono">WhatsApp del comprador *</label>
            <input
              id="telefono"
              type="tel"
              inputmode="numeric"
              class="campo"
              formControlName="telefono"
              placeholder="300 123 4567"
              autocomplete="off"
              cdkFocusInitial
            />
            @if (form.controls.telefono.touched && form.controls.telefono.invalid) {
              <p class="error">Celular colombiano de 10 dígitos (empieza por 3).</p>
            }
            @if (conocido(); as c) {
              <div class="mt-2 flex items-center justify-between gap-2 rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-900">
                <span
                  >Ya compró: <b>{{ c.nombre }}</b> ({{ listaNumeros(c.numeros) }})</span
                >
                @if (valores().nombre !== c.nombre) {
                  <button type="button" class="btn btn-sm btn-secundario" (click)="form.patchValue({ nombre: c.nombre })">
                    Usar nombre
                  </button>
                }
              </div>
            }
          </div>

          <div>
            <label class="etiqueta" for="nombre">Nombre completo *</label>
            <input id="nombre" class="campo" formControlName="nombre" autocomplete="off" />
            @if (form.controls.nombre.touched && form.controls.nombre.invalid) {
              <p class="error">Ingrese el nombre completo.</p>
            }
          </div>

          <fieldset>
            <legend class="etiqueta">Estado del pago *</legend>
            <div class="grid grid-cols-2 gap-2">
              <label
                class="flex cursor-pointer items-center gap-2 rounded-xl border-2 p-3 text-sm"
                [class]="valores().estado === 'RESERVADA' ? 'border-amber-400 bg-amber-50' : 'border-slate-200'"
              >
                <input type="radio" formControlName="estado" value="RESERVADA" class="accent-amber-500" />
                <span><b>Reservada</b><br /><span class="text-xs text-slate-500">Pendiente de pago</span></span>
              </label>
              <label
                class="flex cursor-pointer items-center gap-2 rounded-xl border-2 p-3 text-sm"
                [class]="valores().estado === 'PAGADA' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200'"
              >
                <input type="radio" formControlName="estado" value="PAGADA" class="accent-emerald-600" />
                <span><b>Pagada</b><br /><span class="text-xs text-slate-500">Pago recibido</span></span>
              </label>
            </div>
          </fieldset>

          @if (error()) {
            <p class="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">{{ error() }}</p>
          }
        </div>

        <div class="dialogo-pie">
          <button type="button" class="btn btn-secundario" (click)="ref.close()">Cancelar</button>
          <button type="submit" class="btn btn-primario" [disabled]="guardando()">
            {{ guardando() ? 'Registrando…' : 'Registrar venta' }}
          </button>
        </div>
      </form>
    }
  `,
})
export class VentaDialog {
  protected readonly datos = inject<DatosVenta>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<Venta>>(DialogRef);
  private readonly rifasService = inject(RifasService);

  protected readonly listaNumeros = listaNumeros;
  protected readonly guardando = signal(false);
  protected readonly error = signal('');
  protected readonly venta = signal<Venta | null>(null);

  protected readonly form = inject(NonNullableFormBuilder).group({
    telefono: ['', [Validators.required, telefonoValido]],
    nombre: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
    estado: ['RESERVADA' as 'RESERVADA' | 'PAGADA'],
  });
  protected readonly valores = toSignal(this.form.valueChanges.pipe(startWith(this.form.getRawValue())), {
    initialValue: this.form.getRawValue(),
  });

  protected readonly conocido = computed(() => {
    const tel = normalizarTelefono(this.valores().telefono ?? '');
    return tel ? (this.datos.compradores.find((c) => c.telefono === tel) ?? null) : null;
  });

  protected readonly enlace = computed(() => {
    const v = this.venta();
    return v ? enlaceWhatsApp(v.telefono, mensajeComprador(this.datos.rifa, v)) : '';
  });

  protected lista(v: Venta) {
    return listaNumeros(v.boletas.map((b) => b.numero));
  }

  vender() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { telefono, nombre, estado } = this.form.getRawValue();
    this.guardando.set(true);
    this.error.set('');
    this.rifasService
      .vender(this.datos.rifa.id, { numeros: this.datos.numeros, telefono, nombre: nombre.trim(), estado })
      .subscribe({
        next: (v) => this.venta.set(v),
        error: (e) => {
          this.error.set(mensajeError(e));
          this.guardando.set(false);
        },
      });
  }
}
