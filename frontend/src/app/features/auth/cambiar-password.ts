import { DialogRef } from '@angular/cdk/dialog';
import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/auth.service';
import { AvisosService } from '../../core/avisos.service';
import { mensajeError } from '../../core/errores';

@Component({
  selector: 'app-cambiar-password',
  imports: [ReactiveFormsModule],
  template: `
    <form class="dialogo" [formGroup]="form" (ngSubmit)="guardar()">
      <div class="dialogo-encabezado">
        <h2 class="text-lg font-bold">Cambiar contraseña</h2>
      </div>
      <div class="dialogo-cuerpo space-y-4">
        <div>
          <label class="etiqueta" for="actual">Contraseña actual</label>
          <input id="actual" type="password" class="campo" formControlName="actual" autocomplete="current-password" />
        </div>
        <div>
          <label class="etiqueta" for="nueva">Nueva contraseña</label>
          <input id="nueva" type="password" class="campo" formControlName="nueva" autocomplete="new-password" />
          <p class="ayuda">Mínimo 8 caracteres, con letras y números.</p>
        </div>
        @if (error()) {
          <p class="error">{{ error() }}</p>
        }
      </div>
      <div class="dialogo-pie">
        <button type="button" class="btn btn-secundario" (click)="ref.close()">Cancelar</button>
        <button type="submit" class="btn btn-primario" [disabled]="guardando()">Guardar</button>
      </div>
    </form>
  `,
})
export class CambiarPassword {
  protected readonly ref = inject(DialogRef);
  private readonly auth = inject(AuthService);
  private readonly avisos = inject(AvisosService);
  protected readonly guardando = signal(false);
  protected readonly error = signal('');

  protected readonly form = inject(NonNullableFormBuilder).group({
    actual: ['', Validators.required],
    nueva: ['', [Validators.required, Validators.minLength(8)]],
  });

  guardar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Complete ambos campos (la nueva contraseña con mínimo 8 caracteres).');
      return;
    }
    this.guardando.set(true);
    const { actual, nueva } = this.form.getRawValue();
    this.auth.cambiarPassword(actual, nueva).subscribe({
      next: () => {
        this.avisos.exito('Contraseña actualizada.');
        this.ref.close();
      },
      error: (e) => {
        this.error.set(mensajeError(e));
        this.guardando.set(false);
      },
    });
  }
}
