import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { componerTelefono, normalizarTelefono, PaisTelefono } from '../core/formato';

// Valida el teléfono junto con el país elegido en el control hermano "pais" (Colombia o España)
export function telefonoConPais(campoPais = 'pais'): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    const pais = (control.parent?.get(campoPais)?.value ?? 'CO') as PaisTelefono;
    return normalizarTelefono(componerTelefono(pais, control.value)) ? null : { telefono: true };
  };
}
