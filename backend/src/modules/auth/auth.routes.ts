import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { requireAuth } from './auth.middleware';
import { CambiarPasswordSchema, LoginSchema } from './auth.schema';
import { AuthService } from './auth.service';

const router = Router();
const authService = new AuthService();

// Frena ataques de fuerza bruta: 10 intentos fallidos por IP cada 15 minutos
const limiteLogin = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    skipSuccessfulRequests: true,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { success: false, error: 'Demasiados intentos de inicio de sesión. Intente de nuevo en 15 minutos.' },
});

// POST /api/v1/auth/login
router.post('/login', limiteLogin, async (req, res) => {
    const sesion = await authService.login(LoginSchema.parse(req.body));
    res.json({ success: true, data: sesion });
});

// GET /api/v1/auth/me
router.get('/me', requireAuth, async (req, res) => {
    res.json({ success: true, data: await authService.me(req.usuario!.id) });
});

// PATCH /api/v1/auth/password
router.patch('/password', requireAuth, async (req, res) => {
    await authService.cambiarPassword(req.usuario!.id, CambiarPasswordSchema.parse(req.body));
    res.json({ success: true, data: null });
});

export default router;
