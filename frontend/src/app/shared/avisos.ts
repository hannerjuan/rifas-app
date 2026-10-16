import { Component, inject } from '@angular/core';
import { AvisosService } from '../core/avisos.service';

@Component({
  selector: 'app-avisos',
  template: `
    <div
      class="pointer-events-none fixed inset-x-0 bottom-4 z-[2000] flex flex-col items-center gap-2 px-4 sm:items-end"
      aria-live="polite"
    >
      @for (a of avisos.avisos(); track a.id) {
        <div
          class="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl px-4 py-3 text-sm text-white shadow-lg"
          [class.bg-emerald-600]="a.tipo === 'exito'"
          [class.bg-rose-600]="a.tipo === 'error'"
          [class.bg-slate-800]="a.tipo === 'info'"
          role="status"
        >
          <span class="flex-1">{{ a.texto }}</span>
          <button type="button" class="cursor-pointer opacity-80 hover:opacity-100" (click)="avisos.cerrar(a.id)" aria-label="Cerrar">
            ✕
          </button>
        </div>
      }
    </div>
  `,
})
export class Avisos {
  protected readonly avisos = inject(AvisosService);
}
