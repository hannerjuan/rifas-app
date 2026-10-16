import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { AppError } from '../../lib/errores';
import { suscribir } from '../../lib/eventos';
import { TelefonoSchema } from '../../lib/telefono';
import { PublicoService } from './publico.service';

const router = Router();
const publicoService = new PublicoService();

const respuestaLimite = (minutos: number) => ({
    success: false,
    error: `Demasiadas consultas. Intente de nuevo en ${minutos} minutos.`,
});

// Límite general del portal (la matriz se recarga con cada cambio)
const limiteGeneral = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 600,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: respuestaLimite(15),
});

// La consulta por WhatsApp es más estricta para dificultar que alguien pruebe números ajenos
const limiteConsulta = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: respuestaLimite(15),
});

router.use(limiteGeneral);

// GET /api/v1/publico/rifas
router.get('/rifas', async (_req, res) => {
    res.json({ success: true, data: await publicoService.rifas() });
});

// GET /api/v1/publico/rifas/:id
router.get('/rifas/:id', async (req, res) => {
    res.json({ success: true, data: await publicoService.rifa(req.params.id) });
});

// GET /api/v1/publico/rifas/:id/eventos  (Server-Sent Events: avisa cuando la rifa cambia)
router.get('/rifas/:id/eventos', async (req, res) => {
    await publicoService.existe(req.params.id);
    if (!suscribir(req.params.id, res)) throw new AppError(503, 'Servicio ocupado, intente más tarde.');
});

// GET /api/v1/publico/consulta?telefono=3012516681
router.get('/consulta', limiteConsulta, async (req, res) => {
    const telefono = z.object({ telefono: TelefonoSchema }).parse(req.query).telefono;
    res.json({ success: true, data: await publicoService.consulta(telefono) });
});

export default router;
