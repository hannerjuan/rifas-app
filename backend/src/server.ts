// Debe ir primero: carga .env antes de que otros módulos lean process.env
import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { prisma } from './config/database';
import { CORS_ORIGINS, PORT } from './config/env';
import { manejadorErrores } from './lib/errores';
import { requireAuth } from './modules/auth/auth.middleware';
import authRoutes from './modules/auth/auth.routes';
import loteriaRoutes from './modules/loterias/loterias';
import publicoRoutes from './modules/publico/publico.routes';
import rifaRoutes from './modules/rifas/rifa.routes';
import usuarioRoutes from './modules/usuarios/usuario.routes';

const app = express();

// Confía en X-Forwarded-For solo si viene de un proxy local (proxy de Angular, nginx en producción),
// para que el límite de peticiones identifique la IP real del cliente.
app.set('trust proxy', process.env.TRUST_PROXY || 'loopback');

app.use(helmet());
app.use(cors({ origin: CORS_ORIGINS }));
app.use(express.json({ limit: '100kb' }));

// =============================================================================
// RUTAS ABIERTAS
// =============================================================================

// Portal del comprador: matriz de disponibles y consulta por WhatsApp
app.use('/api/v1/publico', publicoRoutes);

// Inicio de sesión (/me y /password exigen sesión dentro del propio router)
app.use('/api/v1/auth', authRoutes);

app.get('/api/v1/health', async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ success: true, data: { estado: 'ok', fecha: new Date().toISOString() } });
});

// =============================================================================
// PANEL DE ADMINISTRACIÓN (exige sesión)
// =============================================================================
app.use('/api/v1', requireAuth);
app.use('/api/v1/rifas', rifaRoutes);
app.use('/api/v1/loterias', loteriaRoutes);
app.use('/api/v1/usuarios', usuarioRoutes);

app.use('/api', (_req, res) => {
    res.status(404).json({ success: false, error: 'Ruta no encontrada' });
});
app.use(manejadorErrores);

app.listen(PORT, () => {
    console.log(`[RIFAS] API en http://localhost:${PORT}/api/v1/health`);
});
