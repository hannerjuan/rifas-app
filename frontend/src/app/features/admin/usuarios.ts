import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/auth.service';
import { AvisosService } from '../../core/avisos.service';
import { mensajeError } from '../../core/errores';
import { Usuario } from '../../core/modelos';
import { RifasService } from '../../core/rifas.service';
import { FechaPipe } from '../../shared/pipes';

// Administradores de la app (único rol)
@Component({
  selector: 'app-usuarios',
  imports: [ReactiveFormsModule, FechaPipe],
  template: `
    <h1 class="mb-5 text-2xl font-extrabold text-slate-900">Administradores</h1>

    <div class="grid gap-5 lg:grid-cols-[1fr_22rem]">
      <section class="tarjeta overflow-hidden">
        <ul class="divide-y divide-slate-100">
          @for (u of usuarios(); track u.id) {
            <li class="flex flex-wrap items-center gap-3 px-4 py-3">
              <div class="min-w-0 flex-1">
                <p class="font-semibold text-slate-900" [class.line-through]="!u.activo">
                  {{ u.nombre }}
                  @if (u.id === auth.usuario()?.id) {
                    <span class="ml-1 rounded-full bg-marca-100 px-2 py-0.5 text-xs text-marca-800">Usted</span>
                  }
                </p>
                <p class="text-xs text-slate-500">{{ u.email }} · desde {{ u.createdAt | fecha: 'corta' }}</p>
              </div>
              @if (u.id !== auth.usuario()?.id) {
                <button type="button" class="btn btn-sm btn-secundario" (click)="restablecer(u)">Nueva contraseña</button>
                <button type="button" class="btn btn-sm btn-secundario" (click)="alternarActivo(u)">
                  {{ u.activo ? 'Desactivar' : 'Activar' }}
                </button>
              }
            </li>
          }
        </ul>
      </section>

      <form class="tarjeta space-y-4 self-start p-5" [formGroup]="form" (ngSubmit)="crear()">
        <h2 class="font-bold text-slate-900">Nuevo administrador</h2>
        <div>
          <label class="etiqueta" for="nombre">Nombre</label>
          <input id="nombre" class="campo" formControlName="nombre" />
        </div>
        <div>
          <label class="etiqueta" for="email">Correo</label>
          <input id="email" type="email" class="campo" formControlName="email" autocomplete="off" />
        </div>
        <div>
          <label class="etiqueta" for="password">Contraseña inicial</label>
          <input id="password" type="password" class="campo" formControlName="password" autocomplete="new-password" />
          <p class="ayuda">Mínimo 8 caracteres, con letras y números.</p>
        </div>
        <button type="submit" class="btn btn-primario w-full" [disabled]="guardando()">Crear</button>
      </form>
    </div>
  `,
})
export class Usuarios {
  protected readonly auth = inject(AuthService);
  private readonly rifasService = inject(RifasService);
  private readonly avisos = inject(AvisosService);

  protected readonly usuarios = signal<Usuario[]>([]);
  protected readonly guardando = signal(false);
  protected readonly form = inject(NonNullableFormBuilder).group({
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  constructor() {
    this.cargar();
  }

  private cargar() {
    this.rifasService.usuarios().subscribe({
      next: (u) => this.usuarios.set(u),
      error: (e) => this.avisos.error(mensajeError(e)),
    });
  }

  crear() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.avisos.error('Complete nombre, correo y una contraseña de mínimo 8 caracteres.');
      return;
    }
    this.guardando.set(true);
    this.rifasService.crearUsuario(this.form.getRawValue()).subscribe({
      next: () => {
        this.avisos.exito('Administrador creado.');
        this.form.reset();
        this.guardando.set(false);
        this.cargar();
      },
      error: (e) => {
        this.avisos.error(mensajeError(e));
        this.guardando.set(false);
      },
    });
  }

  alternarActivo(u: Usuario) {
    this.rifasService.actualizarUsuario(u.id, { activo: !u.activo }).subscribe({
      next: () => this.cargar(),
      error: (e) => this.avisos.error(mensajeError(e)),
    });
  }

  restablecer(u: Usuario) {
    const password = prompt(`Nueva contraseña para ${u.nombre} (mínimo 8 caracteres, con letras y números):`);
    if (!password) return;
    this.rifasService.actualizarUsuario(u.id, { password }).subscribe({
      next: () => this.avisos.exito('Contraseña restablecida.'),
      error: (e) => this.avisos.error(mensajeError(e)),
    });
  }
}
