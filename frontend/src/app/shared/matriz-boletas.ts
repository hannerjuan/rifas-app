import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DosCifrasPipe } from './pipes';

export type TonoCelda = 'disponible' | 'reservada' | 'pagada' | 'ocupada';

export interface Celda {
  numero: number;
  tono: TonoCelda;
  interactiva: boolean;
  seleccionada?: boolean;
  ganadora?: boolean;
  atenuada?: boolean;
  titulo?: string;
}

const TONOS: Record<TonoCelda, string> = {
  disponible: 'bg-white border-slate-300 text-slate-700',
  reservada: 'bg-amber-300 border-amber-400 text-amber-950',
  pagada: 'bg-emerald-500 border-emerald-600 text-white',
  ocupada: 'bg-slate-200 border-slate-200 text-slate-400',
};

// Cuadrícula 10 × 10 con los números del 00 al 99. Solo dibuja; la pantalla que la usa decide
// el color de cada número y qué pasa al tocarlo.
@Component({
  selector: 'app-matriz-boletas',
  imports: [DosCifrasPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto grid max-w-2xl grid-cols-10 gap-1 sm:gap-1.5" role="group" aria-label="Boletas del 00 al 99">
      @for (c of celdas(); track c.numero) {
        <button
          type="button"
          class="relative flex aspect-square items-center justify-center rounded-md border text-xs font-bold tabular-nums transition select-none sm:rounded-lg sm:text-base"
          [class]="clases(c)"
          [disabled]="!c.interactiva"
          [attr.aria-pressed]="c.interactiva ? !!c.seleccionada : null"
          [attr.title]="c.titulo || null"
          (click)="elegir.emit(c.numero)"
        >
          {{ c.numero | dosCifras }}
          @if (c.ganadora) {
            <span class="absolute -top-2 -right-1.5 text-xs sm:text-sm" aria-label="Número ganador">🏆</span>
          }
        </button>
      }
    </div>
  `,
})
export class MatrizBoletas {
  readonly celdas = input.required<Celda[]>();
  readonly elegir = output<number>();

  clases(c: Celda): string {
    const partes = [
      c.seleccionada ? 'bg-marca-700 border-marca-800 text-white ring-2 ring-marca-300 scale-105 z-10' : TONOS[c.tono],
    ];
    if (c.interactiva) {
      partes.push('cursor-pointer hover:-translate-y-0.5 hover:shadow-md');
      if (c.tono === 'disponible' && !c.seleccionada) partes.push('hover:border-marca-500 hover:bg-marca-50');
    } else {
      partes.push('cursor-default');
    }
    if (c.ganadora) partes.push('ring-4 ring-fuchsia-500 ring-offset-1 z-10');
    if (c.atenuada) partes.push('opacity-25');
    return partes.join(' ');
  }
}

// Leyenda de colores
@Component({
  selector: 'app-leyenda',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul class="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-600">
      @for (i of items(); track i.etiqueta) {
        <li class="flex items-center gap-1.5">
          <span class="inline-block size-3.5 rounded border" [class]="tono(i.tono)"></span>
          {{ i.etiqueta }}
          @if (i.cantidad !== undefined) {
            <b class="text-slate-800">{{ i.cantidad }}</b>
          }
        </li>
      }
    </ul>
  `,
})
export class Leyenda {
  readonly items = input.required<{ tono: TonoCelda | 'seleccionada'; etiqueta: string; cantidad?: number }[]>();

  tono(t: TonoCelda | 'seleccionada') {
    return t === 'seleccionada' ? 'bg-marca-700 border-marca-800' : TONOS[t];
  }
}
