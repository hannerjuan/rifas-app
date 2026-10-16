import { Pipe, PipeTransform } from '@angular/core';
import { dosCifras, fechaCorta, fechaLarga, pesos, telefonoVisible } from '../core/formato';

@Pipe({ name: 'dosCifras' })
export class DosCifrasPipe implements PipeTransform {
  transform(numero: number | null | undefined): string {
    return numero == null ? '' : dosCifras(numero);
  }
}

@Pipe({ name: 'pesos' })
export class PesosPipe implements PipeTransform {
  transform(valor: number | null | undefined): string {
    return valor == null ? '' : pesos(valor);
  }
}

@Pipe({ name: 'telefono' })
export class TelefonoPipe implements PipeTransform {
  transform(telefono: string | null | undefined): string {
    return telefono ? telefonoVisible(telefono) : '';
  }
}

@Pipe({ name: 'fecha' })
export class FechaPipe implements PipeTransform {
  transform(iso: string | null | undefined, formato: 'larga' | 'corta' = 'larga'): string {
    if (!iso) return '';
    return formato === 'larga' ? fechaLarga(iso) : fechaCorta(iso);
  }
}
