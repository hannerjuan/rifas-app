import { Dialog, DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export interface DatosConfirmar {
  titulo: string;
  mensaje: string;
  confirmar?: string;
  peligro?: boolean;
}

@Component({
  selector: 'app-confirmar',
  template: `
    <div class="dialogo">
      <div class="dialogo-encabezado">
        <h2 class="text-lg font-bold">{{ datos.titulo }}</h2>
      </div>
      <div class="dialogo-cuerpo">
        <p class="text-sm whitespace-pre-line text-slate-600">{{ datos.mensaje }}</p>
      </div>
      <div class="dialogo-pie">
        <button type="button" class="btn btn-secundario" (click)="ref.close(false)">Volver</button>
        <button
          type="button"
          class="btn"
          [class.btn-peligro]="datos.peligro"
          [class.btn-primario]="!datos.peligro"
          (click)="ref.close(true)"
          cdkFocusInitial
        >
          {{ datos.confirmar ?? 'Confirmar' }}
        </button>
      </div>
    </div>
  `,
})
export class Confirmar {
  protected readonly datos = inject<DatosConfirmar>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<boolean>>(DialogRef);
}

export async function confirmar(dialog: Dialog, datos: DatosConfirmar): Promise<boolean> {
  const ref = dialog.open<boolean>(Confirmar, { data: datos, width: '100%', maxWidth: '26rem' });
  return (await firstValueFrom(ref.closed)) === true;
}
