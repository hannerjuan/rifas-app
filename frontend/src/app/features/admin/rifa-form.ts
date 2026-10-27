import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { startWith } from 'rxjs';
import { AvisosService } from '../../core/avisos.service';
import { DESFASE_COLOMBIA, RESPONSABLE_POR_DEFECTO } from '../../core/config';
import { mensajeError } from '../../core/errores';
import {
  componerTelefono,
  DIAS_SEMANA,
  ERROR_TELEFONO,
  PAISES_TELEFONO,
  PaisTelefono,
  pesos,
  separarTelefono,
} from '../../core/formato';
import { telefonoConPais } from '../../shared/telefono';
import { Loteria } from '../../core/modelos';
import { RifaEntrada, RifasService } from '../../core/rifas.service';

const OTRA = '__otra__';


function urlValida(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null;
  try {
    const url = new URL(control.value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? null : { url: true };
  } catch {
    return { url: true };
  }
}

// "2026-10-31" (fecha de Colombia) → día de la semana
function diaDeSemana(fecha: string): number {
  return new Date(`${fecha}T12:00:00${DESFASE_COLOMBIA}`).getUTCDay();
}

// Fecha y hora de Colombia a partir de un ISO (Colombia es UTC-5 fijo)
function partesColombia(iso: string) {
  const local = new Date(new Date(iso).getTime() - 5 * 60 * 60 * 1000).toISOString();
  return { fecha: local.slice(0, 10), hora: local.slice(11, 16) };
}

// Próxima fecha en que juega la lotería (hoy, si todavía no ha pasado la hora)
function proximaFecha(loteria: Loteria): string {
  const ahora = partesColombia(new Date().toISOString());
  const hoy = diaDeSemana(ahora.fecha);
  let dias = (loteria.dia - hoy + 7) % 7;
  if (dias === 0 && ahora.hora >= loteria.hora) dias = 7;
  const base = new Date(`${ahora.fecha}T12:00:00${DESFASE_COLOMBIA}`);
  base.setUTCDate(base.getUTCDate() + dias);
  return partesColombia(base.toISOString()).fecha;
}

@Component({
  selector: 'app-rifa-form',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="mx-auto max-w-3xl">
      <a [routerLink]="id() ? ['/admin/rifas', id()] : ['/admin']" class="text-sm text-slate-500 hover:text-marca-700"
        >← Volver</a
      >
      <h1 class="mt-1 mb-5 text-2xl font-extrabold text-slate-900">{{ id() ? 'Editar rifa' : 'Nueva rifa' }}</h1>

      <form [formGroup]="form" (ngSubmit)="guardar()" class="space-y-5">
        <!-- Evento y premio -->
        <section class="tarjeta space-y-4 p-5">
          <h2 class="font-bold text-slate-900">Evento y premio</h2>
          <div>
            <label class="etiqueta" for="nombre">Nombre del evento *</label>
            <input id="nombre" class="campo" formControlName="nombre" placeholder="Ej. Gran rifa de noviembre" />
            @if (invalido('nombre')) {
              <p class="error">Ingrese el nombre (mínimo 3 caracteres).</p>
            }
          </div>
          <div>
            <label class="etiqueta" for="premioNombre">Premio *</label>
            <input id="premioNombre" class="campo" formControlName="premioNombre" placeholder="Ej. Moto G05 128GB" />
            @if (invalido('premioNombre')) {
              <p class="error">Ingrese el premio.</p>
            }
          </div>
          <div>
            <label class="etiqueta" for="premioDescripcion">Descripción del premio</label>
            <textarea
              id="premioDescripcion"
              rows="2"
              class="campo"
              formControlName="premioDescripcion"
              placeholder="Color, características, garantía…"
            ></textarea>
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="etiqueta" for="premioUrl">Enlace a la ficha técnica</label>
              <input id="premioUrl" type="url" class="campo" formControlName="premioUrl" placeholder="https://…" />
              @if (invalido('premioUrl')) {
                <p class="error">Ingrese una URL válida (https://…).</p>
              }
            </div>
            <div>
              <label class="etiqueta" for="premioImagenUrl">URL de la imagen oficial</label>
              <input id="premioImagenUrl" type="url" class="campo" formControlName="premioImagenUrl" placeholder="https://…/imagen.jpg" />
              @if (invalido('premioImagenUrl')) {
                <p class="error">Ingrese una URL válida (https://…).</p>
              }
            </div>
          </div>
          @if (imagen()) {
            <div class="flex h-40 items-center justify-center rounded-xl bg-slate-100">
              <img [src]="imagen()" alt="Vista previa del premio" class="h-full object-contain p-2" />
            </div>
          }
        </section>

        <!-- Sorteo -->
        <section class="tarjeta space-y-4 p-5">
          <h2 class="font-bold text-slate-900">Sorteo</h2>
          <div>
            <label class="etiqueta" for="loteria">Lotería *</label>
            <select id="loteria" class="campo" formControlName="loteria" (change)="alElegirLoteria()">
              <option value="" disabled>Seleccione la lotería…</option>
              @for (dia of diasConLoterias(); track dia.dia) {
                <optgroup [label]="dia.nombre">
                  @for (l of dia.loterias; track l.nombre) {
                    <option [value]="l.nombre">{{ l.nombre }} · {{ formatoHora(l.hora) }}</option>
                  }
                </optgroup>
              }
              <option [value]="OTRA">Otra lotería…</option>
            </select>
            @if (loteriaElegida(); as l) {
              <p class="ayuda">Juega los {{ nombreDia(l.dia) }} a las {{ formatoHora(l.hora) }} (hora habitual).</p>
            }
            @if (invalido('loteria')) {
              <p class="error">Seleccione la lotería.</p>
            }
          </div>
          @if (valores().loteria === OTRA) {
            <div>
              <label class="etiqueta" for="loteriaOtra">Nombre de la lotería *</label>
              <input id="loteriaOtra" class="campo" formControlName="loteriaOtra" />
              @if (invalido('loteriaOtra')) {
                <p class="error">Ingrese el nombre de la lotería.</p>
              }
            </div>
          }
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="etiqueta" for="fecha">Fecha del sorteo *</label>
              <input id="fecha" type="date" class="campo" formControlName="fecha" />
              @if (invalido('fecha')) {
                <p class="error">Ingrese la fecha.</p>
              }
            </div>
            <div>
              <label class="etiqueta" for="hora">Hora del sorteo *</label>
              <input id="hora" type="time" class="campo" formControlName="hora" />
              <p class="ayuda">Desde esta hora se bloquean las ventas y los cambios de estado.</p>
            </div>
          </div>
          @if (avisoDia()) {
            <p class="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">⚠️ {{ avisoDia() }}</p>
          }
          <p class="rounded-lg bg-marca-50 px-3 py-2 text-sm text-marca-900">
            Gana el número igual a las <b>dos últimas cifras</b> del resultado de la lotería. Si ese número no está pagado,
            el premio queda para el vendedor.
          </p>
        </section>

        <!-- Valor -->
        <section class="tarjeta space-y-4 p-5">
          <h2 class="font-bold text-slate-900">Valor de la boleta</h2>
          <div class="max-w-xs">
            <label class="etiqueta" for="valorBoleta">Valor por boleta (COP) *</label>
            <div class="relative">
              <span class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">$</span>
              <input id="valorBoleta" type="number" min="100" step="100" class="campo pl-7" formControlName="valorBoleta" />
            </div>
            @if (valorBloqueado()) {
              <p class="ayuda">🔒 El valor quedó fijo porque ya hay boletas vendidas.</p>
            } @else if (invalido('valorBoleta')) {
              <p class="error">Ingrese un valor entero desde $100.</p>
            } @else if (valores().valorBoleta; as valor) {
              <p class="ayuda">Las 100 boletas suman {{ pesos(valor * 100) }}.</p>
            }
          </div>
          <p class="text-xs text-slate-500">
            Todas las boletas de esta rifa tienen el mismo valor. No se puede cambiar después de la primera venta.
          </p>
        </section>

        <!-- Responsable -->
        <section class="tarjeta space-y-4 p-5">
          <h2 class="font-bold text-slate-900">Responsable de la rifa</h2>
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="etiqueta" for="responsableNombre">Nombre *</label>
              <input id="responsableNombre" class="campo" formControlName="responsableNombre" />
              @if (invalido('responsableNombre')) {
                <p class="error">Ingrese el nombre del responsable.</p>
              }
            </div>
            <div>
              <label class="etiqueta" for="responsableTelefono">WhatsApp *</label>
              <div class="flex gap-2">
                <select
                  class="campo w-28 shrink-0"
                  formControlName="responsablePais"
                  aria-label="País del número"
                  (change)="form.controls.responsableTelefono.updateValueAndValidity()"
                >
                  @for (p of paises; track p.codigo) {
                    <option [value]="p.codigo">{{ p.etiqueta }}</option>
                  }
                </select>
                <input id="responsableTelefono" type="tel" inputmode="tel" class="campo" formControlName="responsableTelefono" />
              </div>
              @if (invalido('responsableTelefono')) {
                <p class="error">{{ errorTelefono }}</p>
              }
            </div>
          </div>
          <p class="text-xs text-slate-500">
            Los compradores le escriben a este número desde el portal público para pedir boletas.
          </p>
        </section>

        <div class="flex justify-end gap-2">
          <a [routerLink]="id() ? ['/admin/rifas', id()] : ['/admin']" class="btn btn-secundario">Cancelar</a>
          <button type="submit" class="btn btn-primario" [disabled]="guardando()">
            {{ guardando() ? 'Guardando…' : id() ? 'Guardar cambios' : 'Crear rifa' }}
          </button>
        </div>
      </form>
    </div>
  `,
})
export class RifaForm implements OnInit {
  private readonly rifasService = inject(RifasService);
  private readonly router = inject(Router);
  private readonly avisos = inject(AvisosService);

  readonly id = input<string>(); // ruta /admin/rifas/:id/editar

  protected readonly OTRA = OTRA;
  protected readonly paises = PAISES_TELEFONO;
  protected readonly errorTelefono = ERROR_TELEFONO;
  protected readonly pesos = pesos;
  protected readonly loterias = signal<Loteria[]>([]);
  protected readonly guardando = signal(false);
  protected readonly valorBloqueado = signal(false);

  protected readonly form = inject(NonNullableFormBuilder).group({
    nombre: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(120)]],
    premioNombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    premioDescripcion: ['', Validators.maxLength(1000)],
    premioUrl: ['', urlValida],
    premioImagenUrl: ['', urlValida],
    loteria: ['', Validators.required],
    loteriaOtra: [''],
    fecha: ['', Validators.required],
    hora: ['22:30', Validators.required],
    valorBoleta: [null as number | null, [Validators.required, Validators.min(100), Validators.pattern(/^\d+$/)]],
    responsableNombre: [RESPONSABLE_POR_DEFECTO.nombre, [Validators.required, Validators.minLength(3)]],
    responsablePais: ['CO' as PaisTelefono],
    responsableTelefono: [RESPONSABLE_POR_DEFECTO.telefono, [Validators.required, telefonoConPais('responsablePais')]],
  });

  protected readonly valores = toSignal(this.form.valueChanges.pipe(startWith(this.form.getRawValue())), {
    initialValue: this.form.getRawValue(),
  });

  protected readonly imagen = computed(() => {
    const url = this.valores().premioImagenUrl;
    return url && !urlValida({ value: url } as AbstractControl) ? url : null;
  });

  protected readonly loteriaElegida = computed(() => this.loterias().find((l) => l.nombre === this.valores().loteria));

  protected readonly diasConLoterias = computed(() => {
    const orden = [1, 2, 3, 4, 5, 6, 0];
    return orden
      .map((dia) => ({ dia, nombre: this.nombreDia(dia, true), loterias: this.loterias().filter((l) => l.dia === dia) }))
      .filter((d) => d.loterias.length > 0);
  });

  // Advierte si la fecha elegida no coincide con el día en que juega la lotería
  protected readonly avisoDia = computed(() => {
    const l = this.loteriaElegida();
    const fecha = this.valores().fecha;
    if (!l || !fecha || diaDeSemana(fecha) === l.dia) return '';
    return `La ${l.nombre} juega normalmente los ${this.nombreDia(l.dia)} y la fecha elegida es ${this.nombreDia(diaDeSemana(fecha))}. Verifique la fecha (puede ser un sorteo trasladado por festivo).`;
  });

  ngOnInit() {
    this.rifasService.loterias().subscribe((l) => {
      this.loterias.set(l);
      this.ajustarLoteriaGuardada();
    });

    const id = this.id();
    if (id) {
      this.rifasService.obtener(id).subscribe({
        next: (r) => {
          if (r.estado !== 'ACTIVA') {
            this.avisos.error('Solo se pueden editar rifas activas.');
            this.router.navigate(['/admin/rifas', id]);
            return;
          }
          const { fecha, hora } = partesColombia(r.fechaSorteo);
          this.form.patchValue({
            nombre: r.nombre,
            premioNombre: r.premioNombre,
            premioDescripcion: r.premioDescripcion ?? '',
            premioUrl: r.premioUrl ?? '',
            premioImagenUrl: r.premioImagenUrl ?? '',
            loteria: r.loteria,
            fecha,
            hora,
            valorBoleta: r.valorBoleta,
            responsableNombre: r.responsableNombre,
            responsablePais: separarTelefono(r.responsableTelefono).pais,
            responsableTelefono: separarTelefono(r.responsableTelefono).numero,
          });
          if (r.metricas.pagadas + r.metricas.reservadas > 0) {
            this.valorBloqueado.set(true);
            this.form.controls.valorBoleta.disable();
          }
          this.ajustarLoteriaGuardada();
        },
        error: (e) => this.avisos.error(mensajeError(e)),
      });
    }
  }

  // Si la rifa guardada usa una lotería que no está en la lista, se muestra como "Otra"
  private ajustarLoteriaGuardada() {
    const actual = this.form.controls.loteria.value;
    if (actual && actual !== OTRA && this.loterias().length && !this.loterias().some((l) => l.nombre === actual)) {
      this.form.patchValue({ loteria: OTRA, loteriaOtra: actual });
    }
  }

  alElegirLoteria() {
    const l = this.loteriaElegida();
    if (l) this.form.patchValue({ fecha: proximaFecha(l), hora: l.hora });
  }

  protected nombreDia(dia: number, mayuscula = false) {
    const n = DIAS_SEMANA[dia];
    return mayuscula ? n[0].toUpperCase() + n.slice(1) : n;
  }

  protected formatoHora(hora: string) {
    const [h, m] = hora.split(':').map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'a. m.' : 'p. m.'}`;
  }

  protected invalido(campo: string) {
    const c = this.form.get(campo);
    return !!c && c.invalid && c.touched;
  }

  guardar() {
    const v = this.form.getRawValue();
    const loteria = v.loteria === OTRA ? v.loteriaOtra.trim() : v.loteria;
    if (v.loteria === OTRA && loteria.length < 3) this.form.controls.loteriaOtra.setErrors({ required: true });

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.avisos.error('Revise los campos marcados.');
      return;
    }

    const fechaSorteo = new Date(`${v.fecha}T${v.hora}:00${DESFASE_COLOMBIA}`);
    const datos: RifaEntrada = {
      nombre: v.nombre.trim(),
      premioNombre: v.premioNombre.trim(),
      premioDescripcion: v.premioDescripcion.trim() || null,
      premioUrl: v.premioUrl.trim() || null,
      premioImagenUrl: v.premioImagenUrl.trim() || null,
      valorBoleta: Number(v.valorBoleta),
      fechaSorteo: fechaSorteo.toISOString(),
      loteria,
      responsableNombre: v.responsableNombre.trim(),
      responsableTelefono: componerTelefono(v.responsablePais, v.responsableTelefono),
    };

    this.guardando.set(true);
    const id = this.id();
    const peticion = id
      ? this.rifasService.actualizar(id, this.valorBloqueado() ? { ...datos, valorBoleta: undefined } : datos)
      : this.rifasService.crear(datos);
    peticion.subscribe({
      next: (r) => {
        this.avisos.exito(id ? 'Rifa actualizada.' : 'Rifa creada con sus 100 boletas.');
        this.router.navigate(['/admin/rifas', r.id]);
      },
      error: (e) => {
        this.avisos.error(mensajeError(e));
        this.guardando.set(false);
      },
    });
  }
}
