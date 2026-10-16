import { DatosSorteo, EstadoBoleta } from './modelos';
import { dosCifras, fechaLarga, listaNumeros, pesos, telefonoVisible } from './formato';

// Los mensajes se abren con el enlace de WhatsApp (sin API ni costos). Se usa api.whatsapp.com/send en lugar de
// wa.me porque la redirección de wa.me daña los emojis en WhatsApp de escritorio (aparecen como "�").
export function enlaceWhatsApp(telefono: string, mensaje: string): string {
  return `https://api.whatsapp.com/send?phone=${telefono}&text=${encodeURIComponent(mensaje)}`;
}

function urlConsulta(): string {
  return `${location.origin}/consulta`;
}

const ADVERTENCIA =
  '⚠️ *IMPORTANTE:* las boletas que no estén *PAGADAS* antes del sorteo *NO JUEGAN*.';

// Mensaje del vendedor al comprador: números, estado del pago y datos del sorteo
export function mensajeComprador(
  rifa: DatosSorteo,
  comprador: { nombre: string; boletas: { numero: number; estado: EstadoBoleta }[] },
): string {
  const pagadas = comprador.boletas.filter((b) => b.estado === 'PAGADA').map((b) => b.numero);
  const reservadas = comprador.boletas.filter((b) => b.estado === 'RESERVADA').map((b) => b.numero);
  const cantidad = pagadas.length + reservadas.length;
  const todos = [...pagadas, ...reservadas];

  let estado: string;
  if (reservadas.length === 0) estado = '✅ *PAGADO*';
  else if (pagadas.length === 0) estado = '⏳ *PENDIENTE DE PAGO*';
  else estado = `✅ Pagados: ${listaNumeros(pagadas)}\n⏳ Pendientes de pago: ${listaNumeros(reservadas)}`;

  const lineas = [
    `¡Hola ${comprador.nombre}! 🎟️`,
    `Estos son tus números de la rifa *${rifa.nombre}*:`,
    '',
    `🔢 *Números:* ${listaNumeros(todos)}`,
    `💳 *Estado del pago:* ${reservadas.length && pagadas.length ? '\n' : ''}${estado}`,
    `💰 *Valor:* ${cantidad} × ${pesos(rifa.valorBoleta)} = ${pesos(cantidad * rifa.valorBoleta)}`,
  ];
  if (reservadas.length) lineas.push(`🔸 *Pendiente por pagar:* ${pesos(reservadas.length * rifa.valorBoleta)}`);
  lineas.push(
    '',
    `🏆 *Premio:* ${rifa.premioNombre}`,
    ...(rifa.premioUrl ? [rifa.premioUrl] : []),
    `📅 *Sorteo:* ${fechaLarga(rifa.fechaSorteo)}`,
    `🎰 *Lotería:* ${rifa.loteria} (gana el número igual a las *dos últimas cifras* del resultado)`,
    '',
    ADVERTENCIA,
    '',
    `Consulta tus boletas en: ${urlConsulta()}`,
    `Responsable: ${rifa.responsableNombre} · ${telefonoVisible(rifa.responsableTelefono)}`,
  );
  return lineas.join('\n');
}

// Mensaje al ganador
export function mensajeGanador(rifa: DatosSorteo & { resultadoLoteria: string | null }, nombre: string, numero: number) {
  return [
    `🎉 ¡Felicitaciones ${nombre}! 🎉`,
    '',
    `Tu número *${dosCifras(numero)}* ganó la rifa *${rifa.nombre}*.`,
    `Resultado de la ${rifa.loteria}: *${rifa.resultadoLoteria}*.`,
    `🏆 Premio: *${rifa.premioNombre}*`,
    '',
    'Comunícate con nosotros para coordinar la entrega.',
    `${rifa.responsableNombre} · ${telefonoVisible(rifa.responsableTelefono)}`,
  ].join('\n');
}

// Mensaje del comprador (portal público) al responsable para pedir números
export function mensajePedido(rifa: DatosSorteo, numeros: number[]): string {
  return [
    `¡Hola ${rifa.responsableNombre}! 👋`,
    `Quiero comprar ${numeros.length === 1 ? 'este número' : 'estos números'} de la rifa *${rifa.nombre}* (${rifa.premioNombre}):`,
    '',
    `🔢 *${listaNumeros(numeros)}*`,
    `💰 ${numeros.length} × ${pesos(rifa.valorBoleta)} = *${pesos(numeros.length * rifa.valorBoleta)}*`,
    '',
    'Mi nombre completo es: ',
  ].join('\n');
}

// Mensaje del comprador al responsable para reportar un pago pendiente
export function mensajeReportarPago(rifa: DatosSorteo, nombre: string, numeros: number[]): string {
  return [
    `¡Hola ${rifa.responsableNombre}! Soy ${nombre}.`,
    `Te envío el comprobante de pago de mis números *${listaNumeros(numeros)}* de la rifa *${rifa.nombre}*.`,
  ].join('\n');
}
