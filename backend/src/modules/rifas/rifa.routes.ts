import { Router } from 'express';
import { AppError } from '../../lib/errores';
import { exportarExcel, exportarPdf } from './rifa.export';
import {
    CambioEstadoSchema,
    FinalizarSchema,
    RifaActualizarSchema,
    RifaCrearSchema,
    VentaCrearSchema,
    VentaEditarSchema,
} from './rifa.schema';
import { RifaService } from './rifa.service';
import { VentaService } from './venta.service';

const router = Router();
const rifaService = new RifaService();
const ventaService = new VentaService();

// --- Rifas -------------------------------------------------------------------------------------

// GET /api/v1/rifas?vista=activas|historial
router.get('/', async (req, res) => {
    const vista = req.query.vista === 'historial' ? 'historial' : 'activas';
    res.json({ success: true, data: await rifaService.listar(vista) });
});

// POST /api/v1/rifas
router.post('/', async (req, res) => {
    const rifa = await rifaService.crear(RifaCrearSchema.parse(req.body), req.usuario!.id);
    res.status(201).json({ success: true, data: rifa });
});

// GET /api/v1/rifas/:id
router.get('/:id', async (req, res) => {
    res.json({ success: true, data: await rifaService.obtener(req.params.id) });
});

// PATCH /api/v1/rifas/:id
router.patch('/:id', async (req, res) => {
    res.json({ success: true, data: await rifaService.actualizar(req.params.id, RifaActualizarSchema.parse(req.body)) });
});

// POST /api/v1/rifas/:id/cancelar
router.post('/:id/cancelar', async (req, res) => {
    res.json({ success: true, data: await rifaService.cancelar(req.params.id) });
});

// POST /api/v1/rifas/:id/finalizar  { resultadoLoteria: "4823" }
router.post('/:id/finalizar', async (req, res) => {
    const { resultadoLoteria } = FinalizarSchema.parse(req.body);
    res.json({ success: true, data: await rifaService.finalizar(req.params.id, resultadoLoteria) });
});

// GET /api/v1/rifas/:id/metricas
router.get('/:id/metricas', async (req, res) => {
    res.json({ success: true, data: await rifaService.metricas(req.params.id) });
});

// GET /api/v1/rifas/:id/exportar/pdf | /exportar/excel
router.get('/:id/exportar/pdf', async (req, res) => {
    await exportarPdf(req.params.id, res);
});
router.get('/:id/exportar/excel', async (req, res) => {
    await exportarExcel(req.params.id, res);
});

// --- Boletas -----------------------------------------------------------------------------------

// GET /api/v1/rifas/:id/boletas  (matriz 00-99)
router.get('/:id/boletas', async (req, res) => {
    res.json({ success: true, data: await rifaService.boletas(req.params.id) });
});

// POST /api/v1/rifas/:id/boletas/estado  { numeros, estado, motivo? }
router.post('/:id/boletas/estado', async (req, res) => {
    const resultado = await ventaService.cambiarEstado(req.params.id, CambioEstadoSchema.parse(req.body), req.usuario!.id);
    res.json({ success: true, data: resultado });
});

// GET /api/v1/rifas/:id/boletas/:numero/movimientos
router.get('/:id/boletas/:numero/movimientos', async (req, res) => {
    const numero = Number(req.params.numero);
    if (!Number.isInteger(numero) || numero < 0 || numero > 99) throw new AppError(400, 'Número inválido.');
    res.json({ success: true, data: await ventaService.movimientos(req.params.id, numero) });
});

// --- Ventas (compradores) ----------------------------------------------------------------------

// GET /api/v1/rifas/:id/ventas
router.get('/:id/ventas', async (req, res) => {
    res.json({ success: true, data: await ventaService.listar(req.params.id) });
});

// POST /api/v1/rifas/:id/ventas  { numeros, nombre, telefono, estado }
router.post('/:id/ventas', async (req, res) => {
    const venta = await ventaService.vender(req.params.id, VentaCrearSchema.parse(req.body), req.usuario!.id);
    res.status(201).json({ success: true, data: venta });
});

// GET /api/v1/rifas/:id/ventas/:ventaId
router.get('/:id/ventas/:ventaId', async (req, res) => {
    const venta = await ventaService.obtener(req.params.ventaId);
    if (venta.rifaId !== req.params.id) throw new AppError(404, 'Venta no encontrada.');
    res.json({ success: true, data: venta });
});

// PATCH /api/v1/rifas/:id/ventas/:ventaId  { nombre, telefono }
router.patch('/:id/ventas/:ventaId', async (req, res) => {
    const actual = await ventaService.obtener(req.params.ventaId);
    if (actual.rifaId !== req.params.id) throw new AppError(404, 'Venta no encontrada.');
    res.json({ success: true, data: await ventaService.editar(req.params.ventaId, VentaEditarSchema.parse(req.body)) });
});

export default router;
