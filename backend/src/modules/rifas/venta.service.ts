import { EstadoBoleta } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../lib/errores';
import { notificarCambio } from '../../lib/eventos';
import { ETIQUETA_ESTADO, formatoNumero } from '../../lib/formato';
import { TRANSICIONES, verificarRifaAbierta, verificarRifaActiva } from './boleta-estado';
import { buscarRifa } from './rifa.service';
import { CambioEstadoDTO, VentaCrearDTO, VentaEditarDTO } from './rifa.schema';

const VENTA_DETALLE = {
    id: true,
    rifaId: true,
    nombre: true,
    telefono: true,
    createdAt: true,
    updatedAt: true,
    vendedor: { select: { nombre: true } },
    boletas: { select: { numero: true, estado: true, pagadaEn: true }, orderBy: { numero: 'asc' } },
} as const;

export class VentaService {
    // Compradores de la rifa, el más reciente primero
    async listar(rifaId: string) {
        await buscarRifa(rifaId);
        return prisma.venta.findMany({ where: { rifaId }, select: VENTA_DETALLE, orderBy: { createdAt: 'desc' } });
    }

    async obtener(ventaId: string) {
        const venta = await prisma.venta.findUnique({ where: { id: ventaId }, select: VENTA_DETALLE });
        if (!venta) throw new AppError(404, 'Venta no encontrada.');
        return venta;
    }

    // Vende uno o varios números a un comprador. Todo ocurre en una transacción: si alguno de los
    // números ya fue tomado (por ejemplo, por otra persona vendiendo al mismo tiempo) no se vende ninguno.
    async vender(rifaId: string, dto: VentaCrearDTO, usuarioId: string) {
        const rifa = await buscarRifa(rifaId);
        verificarRifaAbierta(rifa);

        const ventaId = await prisma.$transaction(async (tx) => {
            const ahora = new Date();
            const venta = await tx.venta.create({
                data: { rifaId, nombre: dto.nombre, telefono: dto.telefono, vendedorId: usuarioId },
            });

            // La condición estado = DISPONIBLE bloquea la fila: una venta simultánea del mismo número no la encuentra
            const { count } = await tx.boleta.updateMany({
                where: { rifaId, numero: { in: dto.numeros }, estado: 'DISPONIBLE' },
                data: {
                    estado: dto.estado,
                    ventaId: venta.id,
                    reservadaEn: ahora,
                    pagadaEn: dto.estado === 'PAGADA' ? ahora : null,
                },
            });
            if (count !== dto.numeros.length) {
                const ocupadas = await tx.boleta.findMany({
                    where: { rifaId, numero: { in: dto.numeros }, NOT: { ventaId: venta.id } },
                    select: { numero: true },
                    orderBy: { numero: 'asc' },
                });
                const lista = ocupadas.map((b) => formatoNumero(b.numero)).join(', ');
                throw new AppError(409, `Estos números ya no están disponibles: ${lista}. Actualice la selección.`);
            }

            const boletas = await tx.boleta.findMany({ where: { ventaId: venta.id }, select: { id: true } });
            await tx.movimientoBoleta.createMany({
                data: boletas.map((b) => ({
                    boletaId: b.id,
                    estadoAnterior: 'DISPONIBLE' as EstadoBoleta,
                    estadoNuevo: dto.estado,
                    ventaId: venta.id,
                    nombre: dto.nombre,
                    telefono: dto.telefono,
                    motivo: 'Venta',
                    usuarioId,
                })),
            });
            return venta.id;
        });

        notificarCambio(rifaId);
        return this.obtener(ventaId);
    }

    // Corrección del nombre o teléfono del comprador
    async editar(ventaId: string, dto: VentaEditarDTO) {
        const venta = await prisma.venta.findUnique({ where: { id: ventaId }, include: { rifa: true } });
        if (!venta) throw new AppError(404, 'Venta no encontrada.');
        verificarRifaActiva(venta.rifa);

        await prisma.venta.update({ where: { id: ventaId }, data: { nombre: dto.nombre, telefono: dto.telefono } });
        notificarCambio(venta.rifaId);
        return this.obtener(ventaId);
    }

    // Cambio manual de estado de uno o varios números (pago confirmado, volver a reservada o liberar).
    // Los números que ya están en el estado pedido se omiten.
    async cambiarEstado(rifaId: string, { numeros, estado, motivo }: CambioEstadoDTO, usuarioId: string) {
        const rifa = await buscarRifa(rifaId);
        verificarRifaAbierta(rifa);

        const cambiadas = await prisma.$transaction(async (tx) => {
            const boletas = await tx.boleta.findMany({
                where: { rifaId, numero: { in: numeros } },
                include: { venta: { select: { id: true, nombre: true, telefono: true } } },
                orderBy: { numero: 'asc' },
            });
            const porCambiar = boletas.filter((b) => b.estado !== estado);
            if (porCambiar.length === 0) {
                throw new AppError(400, `Los números seleccionados ya están en estado ${ETIQUETA_ESTADO[estado]}.`);
            }
            for (const b of porCambiar) {
                if (!TRANSICIONES[b.estado].includes(estado)) {
                    throw new AppError(
                        409,
                        `La boleta ${formatoNumero(b.numero)} está ${ETIQUETA_ESTADO[b.estado].toLowerCase()} ` +
                            `y no puede pasar a ${ETIQUETA_ESTADO[estado].toLowerCase()}. Para venderla use "Vender".`
                    );
                }
            }

            const ahora = new Date();
            for (const b of porCambiar) {
                const datos =
                    estado === 'DISPONIBLE'
                        ? { estado, ventaId: null, reservadaEn: null, pagadaEn: null }
                        : { estado, pagadaEn: estado === 'PAGADA' ? ahora : null };
                // Condición sobre el estado leído: si otra persona la cambió entretanto, se aborta todo
                const { count } = await tx.boleta.updateMany({ where: { id: b.id, estado: b.estado }, data: datos });
                if (count === 0) {
                    throw new AppError(409, `La boleta ${formatoNumero(b.numero)} cambió mientras tanto. Actualice e intente de nuevo.`);
                }
            }

            await tx.movimientoBoleta.createMany({
                data: porCambiar.map((b) => ({
                    boletaId: b.id,
                    estadoAnterior: b.estado,
                    estadoNuevo: estado,
                    ventaId: b.venta?.id ?? null,
                    nombre: b.venta?.nombre ?? null,
                    telefono: b.venta?.telefono ?? null,
                    motivo: motivo ?? (estado === 'DISPONIBLE' ? 'Liberada' : null),
                    usuarioId,
                })),
            });

            // Al liberar, las ventas que quedan sin números se eliminan (el historial queda en los movimientos)
            if (estado === 'DISPONIBLE') {
                const ventaIds = [...new Set(porCambiar.map((b) => b.ventaId).filter((v): v is string => !!v))];
                await tx.venta.deleteMany({ where: { id: { in: ventaIds }, boletas: { none: {} } } });
            }
            return porCambiar.map((b) => b.numero);
        });

        notificarCambio(rifaId);
        return { numeros: cambiadas, estado };
    }

    // Historial de cambios de un número
    async movimientos(rifaId: string, numero: number) {
        const boleta = await prisma.boleta.findUnique({
            where: { rifaId_numero: { rifaId, numero } },
            select: {
                movimientos: {
                    orderBy: { createdAt: 'desc' },
                    select: {
                        id: true,
                        estadoAnterior: true,
                        estadoNuevo: true,
                        nombre: true,
                        telefono: true,
                        motivo: true,
                        createdAt: true,
                        usuario: { select: { nombre: true } },
                    },
                },
            },
        });
        if (!boleta) throw new AppError(404, 'Boleta no encontrada.');
        return boleta.movimientos;
    }
}
