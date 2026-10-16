import { HttpErrorResponse } from '@angular/common/http';

// Mensaje legible a partir de la respuesta de error de la API ({ success: false, error, detalles[] })
export function mensajeError(error: unknown, porDefecto = 'Ocurrió un error inesperado.'): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return 'No hay conexión con el servidor.';
    const cuerpo = error.error as { error?: string; detalles?: { mensaje: string }[] } | null;
    if (cuerpo?.detalles?.length) return cuerpo.detalles.map((d) => d.mensaje).join(' · ');
    if (cuerpo?.error) return cuerpo.error;
    // Respuesta sin el formato de la API: el proxy no pudo comunicarse con el backend (apagado o reiniciándose)
    if (error.status >= 500) return 'No hay conexión con la API. Verifique que el backend esté encendido (puerto 3100).';
  }
  return porDefecto;
}
