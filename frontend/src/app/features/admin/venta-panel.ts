import { Dialog, DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { AvisosService } from '../../core/avisos.service';
import { mensajeError } from '../../core/errores';
import { listaNumeros, normalizarTelefono } from '../../core/formato';
import { ETIQUETA_ESTADO, EstadoBoleta, Movimiento, Rifa, Venta } from '../../core/modelos';
import { RifasService } from '../../core/rifas.service';
import { enlaceWhatsApp, mensajeComprador } from '../../core/whatsapp';
import { confirmar } from '../../shared/confirmar';
import { DosCifrasPipe, FechaPipe, PesosPipe, TelefonoPipe } from '../../shared/pipes';

export interface DatosPanelVenta {
  rifa: Rifa;
  ventaId: string;
  numero?: number; // número que se tocó en la matriz
}

function telefonoValido(control: AbstractControl): ValidationErrors | null {
  return control.value && !normalizarTelefono(control.value) ? { telefono: true } : null;
}

// Detalle de un comprador: sus números, cambio de estado, liberación, corrección de datos y WhatsApp
@Component({
  selector: 'app-venta-panel',
  imports: [ReactiveFormsModule, DosCifrasPipe, PesosPipe, TelefonoPipe, FechaPipe],
  template: `
    <div class="dialogo">
      <div class="dialogo-encabezado">
        @if (venta(); as v) {
          @if (editando()) {
            <h2 class="text-lg font-bold">Corregir datos del comprador</h2>
          } @else {
            <div class="min-w-0">
              <h2 class="truncate text-lg font-bold text-slate-900">{{ v.nombre }}</h2>
              <p class="text-sm text-slate-500">
                {{ v.telefono | telefono }} · vendida por {{ v.vendedor.nombre }} el {{ v.createdAt | fecha: 'corta' }}
              </p>
            </div>
          }
        } @else {
          <h2 class="text-lg font-bold">Cargando…</h2>
        }
        <button type="button" class="cursor-pointer text-slate-400 hover:text-slate-700" (click)="ref.close()" aria-label="Cerrar">
          ✕
        </button>
      </div>

      @if (venta(); as v) {
        @if (editando()) {
          <form class="contents" [formGroup]="form" (ngSubmit)="guardarDatos()">
            <div class="dialogo-cuerpo space-y-4">
              <div>
                <label class="etiqueta" for="nombre">Nombre completo</label>
                <input id="nombre" class="campo" formControlName="nombre" />
                @if (form.controls.nombre.touched && form.controls.nombre.invalid) {
                  <p class="error">Ingrese el nombre completo.</p>
                }
              </div>
              <div>
                <label class="etiqueta" for="telefono">WhatsApp</label>
                <input id="telefono" type="tel" class="campo" formControlName="telefono" />
                @if (form.controls.telefono.touched && form.controls.telefono.invalid) {
                  <p class="error">Celular colombiano de 10 dígitos.</p>
                }
              </div>
            </div>
            <div class="dialogo-pie">
              <button type="button" class="btn btn-secundario" (click)="editando.set(false)">Cancelar</button>
              <button type="submit" class="btn btn-primario" [disabled]="trabajando()">Guardar</button>
            </div>
          </form>
        } @else {
          <div class="dialogo-cuerpo space-y-5">
            <!-- Números del comprador -->
            <div>
              <div class="mb-2 flex items-center justify-between">
                <h3 class="text-sm font-semibold text-slate-700">Números ({{ v.boletas.length }})</h3>
                @if (abierta() && v.boletas.length > 1) {
                  <button type="button" class="cursor-pointer text-xs font-semibold text-marca-700 hover:underline" (click)="alternarTodos()">
                    {{ seleccion().length === v.boletas.length ? 'Quitar selección' : 'Seleccionar todos' }}
                  </button>
                }
              </div>
              <div class="flex flex-wrap gap-2">
                @for (b of v.boletas; track b.numero) {
                  <button
                    type="button"
                    class="flex cursor-pointer flex-col items-center rounded-xl border-2 px-3 py-1.5 transition disabled:cursor-default"
                    [class]="claseChip(b.numero, b.estado)"
                    [disabled]="!abierta()"
                    (click)="alternar(b.numero)"
                    [attr.aria-pressed]="seleccion().includes(b.numero)"
                  >
                    <span class="text-lg font-extrabold tabular-nums">{{ b.numero | dosCifras }}</span>
                    <span class="text-[10px] font-semibold uppercase">{{ etiqueta[b.estado] }}</span>
                  </button>
                }
              </div>
              <p class="mt-3 text-sm text-slate-600">
                Total {{ v.boletas.length * datos.rifa.valorBoleta | pesos }}
                @if (pendiente() > 0) {
                  · <b class="text-amber-700">Pendiente {{ pendiente() | pesos }}</b>
                } @else {
                  · <b class="text-emerald-700">Pagado completo</b>
                }
              </p>
            </div>

            <!-- Acciones sobre los seleccionados -->
            @if (abierta()) {
              <div class="rounded-xl bg-slate-50 p-3">
                <p class="mb-2 text-xs text-slate-500">
                  @if (seleccion().length) {
                    Seleccionados: <b class="text-slate-700">{{ lista(seleccion()) }}</b>
                  } @else {
                    Toque los números para seleccionarlos.
                  }
                </p>
                <div class="flex flex-wrap gap-2">
                  <button type="button" class="btn btn-sm bg-emerald-600 text-white hover:bg-emerald-700" [disabled]="!puede('PAGADA') || trabajando()" (click)="cambiar('PAGADA')">
                    ✔ Marcar pagadas
                  </button>
                  <button type="button" class="btn btn-sm bg-amber-400 text-amber-950 hover:bg-amber-500" [disabled]="!puede('RESERVADA') || trabajando()" (click)="cambiar('RESERVADA')">
                    ↺ Volver a reservadas
                  </button>
                  <button type="button" class="btn btn-sm btn-secundario text-rose-700!" [disabled]="!seleccion().length || trabajando()" (click)="cambiar('DISPONIBLE')">
                    Liberar
                  </button>
                </div>
              </div>
            } @else {
              <p class="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600">
                {{ datos.rifa.estado === 'ACTIVA' ? 'El sorteo ya se jugó: los estados no se pueden cambiar.' : 'La rifa está cerrada.' }}
              </p>
            }

            <!-- Historial -->
            <details class="group" (toggle)="alAbrirHistorial($event)">
              <summary class="cursor-pointer text-sm font-semibold text-slate-700">Historial de cambios</summary>
              <div class="mt-2">
                <select class="campo mb-2 w-auto" [value]="numeroHistorial()" (change)="cargarHistorial(+$any($event.target).value)">
                  @for (b of v.boletas; track b.numero) {
                    <option [value]="b.numero">Número {{ b.numero | dosCifras }}</option>
                  }
                </select>
                <ol class="space-y-1.5 text-xs">
                  @for (m of historial(); track m.id) {
                    <li class="rounded-lg border border-slate-200 px-3 py-2">
                      <b>{{ etiqueta[m.estadoAnterior] }} → {{ etiqueta[m.estadoNuevo] }}</b>
                      @if (m.motivo) {
                        · {{ m.motivo }}
                      }
                      <br />
                      <span class="text-slate-500"
                        >{{ m.createdAt | fecha: 'corta' }} · {{ m.usuario.nombre }}
                        @if (m.nombre) {
                          · {{ m.nombre }}
                        }
                      </span>
                    </li>
                  } @empty {
                    <li class="text-slate-500">Sin movimientos.</li>
                  }
                </ol>
              </div>
            </details>
          </div>

          <div class="dialogo-pie justify-between!">
            @if (datos.rifa.estado === 'ACTIVA') {
              <button type="button" class="btn btn-secundario" (click)="editar()">✎ Corregir datos</button>
            } @else {
              <span></span>
            }
            <a [href]="enlace()" target="_blank" rel="noopener" class="btn btn-whatsapp">Enviar estado por WhatsApp</a>
          </div>
        }
      } @else {
        <div class="dialogo-cuerpo text-sm text-slate-500">Cargando…</div>
      }
    </div>
  `,
})
export class VentaPanel implements OnInit {
  protected readonly datos = inject<DatosPanelVenta>(DIALOG_DATA);
  protected readonly ref = inject(DialogRef);
  private readonly rifasService = inject(RifasService);
  private readonly avisos = inject(AvisosService);
  private readonly dialog = inject(Dialog);

  protected readonly etiqueta = ETIQUETA_ESTADO;
  protected readonly venta = signal<Venta | null>(null);
  protected readonly seleccion = signal<number[]>([]);
  protected readonly editando = signal(false);
  protected readonly trabajando = signal(false);
  protected readonly historial = signal<Movimiento[]>([]);
  protected readonly numeroHistorial = signal(0);

  protected readonly abierta = computed(
    () => this.datos.rifa.estado === 'ACTIVA' && new Date(this.datos.rifa.fechaSorteo) > new Date(),
  );
  protected readonly pendiente = computed(
    () => (this.venta()?.boletas.filter((b) => b.estado === 'RESERVADA').length ?? 0) * this.datos.rifa.valorBoleta,
  );
  protected readonly enlace = computed(() => {
    const v = this.venta();
    return v ? enlaceWhatsApp(v.telefono, mensajeComprador(this.datos.rifa, v)) : '';
  });

  protected readonly form = inject(NonNullableFormBuilder).group({
    nombre: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
    telefono: ['', [Validators.required, telefonoValido]],
  });

  ngOnInit() {
    this.cargar(true);
  }

  private cargar(inicial = false) {
    this.rifasService.venta(this.datos.rifa.id, this.datos.ventaId).subscribe({
      next: (v) => {
        this.venta.set(v);
        if (inicial) {
          // Preselecciona el número que se tocó en la matriz (o todos si era uno solo)
          const tocado = this.datos.numero;
          this.seleccion.set(tocado !== undefined ? [tocado] : v.boletas.map((b) => b.numero));
          this.numeroHistorial.set(tocado ?? v.boletas[0]?.numero ?? 0);
        } else {
          const vigentes = new Set(v.boletas.map((b) => b.numero));
          this.seleccion.update((s) => s.filter((n) => vigentes.has(n)));
        }
      },
      error: (e: HttpErrorResponse) => {
        // Al liberar todos los números la venta desaparece
        if (e.status === 404) this.ref.close(true);
        else this.avisos.error(mensajeError(e));
      },
    });
  }

  protected lista(numeros: number[]) {
    return listaNumeros(numeros);
  }

  protected alternar(numero: number) {
    this.seleccion.update((s) => (s.includes(numero) ? s.filter((n) => n !== numero) : [...s, numero]));
  }

  protected alternarTodos() {
    const v = this.venta()!;
    this.seleccion.set(this.seleccion().length === v.boletas.length ? [] : v.boletas.map((b) => b.numero));
  }

  // Se puede aplicar el estado si al menos un seleccionado está en otro estado
  protected puede(estado: EstadoBoleta) {
    const v = this.venta();
    return !!v && v.boletas.some((b) => this.seleccion().includes(b.numero) && b.estado !== estado);
  }

  protected claseChip(numero: number, estado: EstadoBoleta) {
    const seleccionado = this.seleccion().includes(numero) && this.abierta();
    const base = estado === 'PAGADA' ? 'bg-emerald-500 text-white' : 'bg-amber-300 text-amber-950';
    return `${base} ${seleccionado ? 'border-marca-700 ring-2 ring-marca-300' : 'border-transparent'}`;
  }

  async cambiar(estado: EstadoBoleta) {
    const numeros = this.seleccion();
    if (!numeros.length) return;
    if (estado === 'DISPONIBLE') {
      const ok = await confirmar(this.dialog, {
        titulo: 'Liberar boletas',
        mensaje: `Los números ${listaNumeros(numeros)} quedarán disponibles para venderse a otra persona.`,
        confirmar: 'Liberar',
        peligro: true,
      });
      if (!ok) return;
    }
    this.trabajando.set(true);
    this.rifasService.cambiarEstado(this.datos.rifa.id, numeros, estado).subscribe({
      next: (r) => {
        const textos: Record<EstadoBoleta, string> = {
          PAGADA: 'marcados como pagados',
          RESERVADA: 'devueltos a reservados',
          DISPONIBLE: 'liberados',
        };
        this.avisos.exito(`Números ${listaNumeros(r.numeros)} ${textos[estado]}.`);
        this.trabajando.set(false);
        this.cargar();
        if (this.historial().length) this.cargarHistorial(this.numeroHistorial());
      },
      error: (e) => {
        this.avisos.error(mensajeError(e));
        this.trabajando.set(false);
      },
    });
  }

  editar() {
    const v = this.venta()!;
    this.form.reset({ nombre: v.nombre, telefono: v.telefono.slice(2) });
    this.editando.set(true);
  }

  guardarDatos() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.trabajando.set(true);
    const { nombre, telefono } = this.form.getRawValue();
    this.rifasService.editarVenta(this.datos.rifa.id, this.datos.ventaId, { nombre: nombre.trim(), telefono }).subscribe({
      next: (v) => {
        this.venta.set(v);
        this.editando.set(false);
        this.trabajando.set(false);
        this.avisos.exito('Datos del comprador actualizados.');
      },
      error: (e) => {
        this.avisos.error(mensajeError(e));
        this.trabajando.set(false);
      },
    });
  }

  alAbrirHistorial(evento: Event) {
    if ((evento.target as HTMLDetailsElement).open) this.cargarHistorial(this.numeroHistorial());
  }

  cargarHistorial(numero: number) {
    this.numeroHistorial.set(numero);
    this.rifasService.movimientos(this.datos.rifa.id, numero).subscribe({
      next: (m) => this.historial.set(m),
      error: (e) => this.avisos.error(mensajeError(e)),
    });
  }
}
