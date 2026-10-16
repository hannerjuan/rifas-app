import { EstadoBoleta } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../lib/errores';
import { conteoPorRifa } from '../rifas/rifa.service';

// Solo información pública: nunca nombres ni teléfonos de otros compradores
const RIFA_PUBLICA = {
    id: true,
    nombre: true,
    premioNombre: true,
    premioDescripcion: true,
    premioUrl: true,
    premioImagenUrl: true,
    valorBoleta: true,
    fechaSorteo: true,
    loteria: true,
    responsableNombre: true,
    responsableTelefono: true,
    estado: true,
    resultadoLoteria: true,
    numeroGanador: true,
    resultado: true,
} as const;

// Las rifas finalizadas se siguen mostrando un tiempo para que los compradores vean el resultado
const DIAS_RESULTADO_VISIBLE = 30;

function limiteResultados() {
    return new Date(Date.now() - DIAS_RESULTADO_VISIBLE * 24 * 60 * 60 * 1000);
}

const rifaVisible = () => ({
    OR: [{ estado: 'ACTIVA' as const }, { estado: 'FINALIZADA' as const, finalizadaEn: { gte: limiteResultados() } }],
});

export class PublicoService {
    async rifas() {
        const rifas = await prisma.rifa.findMany({
            where: rifaVisible(),
            select: RIFA_PUBLICA,
            orderBy: { fechaSorteo: 'asc' },
        });
        const conteos = await conteoPorRifa(rifas.map((r) => r.id));
        const conDisponibles = rifas.map((r) => ({ ...r, disponibles: conteos.get(r.id)?.DISPONIBLE ?? 0 }));
        return {
            activas: conDisponibles.filter((r) => r.estado === 'ACTIVA'),
            finalizadas: conDisponibles.filter((r) => r.estado === 'FINALIZADA').reverse(),
        };
    }

    // Información de la rifa y la matriz con solo dos estados: disponible u ocupada
    async rifa(id: string) {
        const rifa = await prisma.rifa.findFirst({ where: { id, ...rifaVisible() }, select: RIFA_PUBLICA });
        if (!rifa) throw new AppError(404, 'Rifa no encontrada.');
        const boletas = await prisma.boleta.findMany({
            where: { rifaId: id },
            select: { numero: true, estado: true },
            orderBy: { numero: 'asc' },
        });
        return {
            ...rifa,
            ventasAbiertas: rifa.estado === 'ACTIVA' && new Date() < rifa.fechaSorteo,
            disponibles: boletas.filter((b) => b.estado === 'DISPONIBLE').length,
            boletas: boletas.map((b) => ({ numero: b.numero, ocupada: b.estado !== 'DISPONIBLE' })),
        };
    }

    async existe(id: string) {
        const rifa = await prisma.rifa.findFirst({ where: { id, ...rifaVisible() }, select: { id: true } });
        if (!rifa) throw new AppError(404, 'Rifa no encontrada.');
    }

    // Boletas de un número de WhatsApp en las rifas visibles, agrupadas por rifa
    async consulta(telefono: string) {
        const ventas = await prisma.venta.findMany({
            where: { telefono, rifa: rifaVisible() },
            orderBy: { createdAt: 'asc' },
            select: {
                nombre: true,
                rifa: { select: RIFA_PUBLICA },
                boletas: { select: { numero: true, estado: true } },
            },
        });

        const porRifa = new Map<
            string,
            { rifa: (typeof ventas)[number]['rifa']; nombre: string; boletas: { numero: number; estado: EstadoBoleta }[] }
        >();
        for (const v of ventas) {
            const grupo = porRifa.get(v.rifa.id) ?? { rifa: v.rifa, nombre: v.nombre.split(/\s+/)[0], boletas: [] };
            grupo.boletas.push(...v.boletas);
            porRifa.set(v.rifa.id, grupo);
        }

        return [...porRifa.values()]
            .filter((g) => g.boletas.length > 0)
            .map((g) => {
                g.boletas.sort((a, b) => a.numero - b.numero);
                const pagadas = g.boletas.filter((b) => b.estado === 'PAGADA').length;
                const reservadas = g.boletas.filter((b) => b.estado === 'RESERVADA').length;
                const ganadora = g.rifa.estado === 'FINALIZADA' ? g.boletas.find((b) => b.numero === g.rifa.numeroGanador) : undefined;
                return {
                    rifa: g.rifa,
                    nombre: g.nombre,
                    boletas: g.boletas,
                    pagado: pagadas * g.rifa.valorBoleta,
                    pendiente: reservadas * g.rifa.valorBoleta,
                    gano: ganadora?.estado === 'PAGADA',
                };
            });
    }
}
