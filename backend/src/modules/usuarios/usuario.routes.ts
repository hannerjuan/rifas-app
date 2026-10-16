import { Router } from 'express';
import { UsuarioActualizarSchema, UsuarioCrearSchema } from './usuario.schema';
import { UsuarioService } from './usuario.service';

const router = Router();
const usuarioService = new UsuarioService();

// GET /api/v1/usuarios
router.get('/', async (_req, res) => {
    res.json({ success: true, data: await usuarioService.listar() });
});

// POST /api/v1/usuarios
router.post('/', async (req, res) => {
    res.status(201).json({ success: true, data: await usuarioService.crear(UsuarioCrearSchema.parse(req.body)) });
});

// PATCH /api/v1/usuarios/:id
router.patch('/:id', async (req, res) => {
    const usuario = await usuarioService.actualizar(req.params.id, UsuarioActualizarSchema.parse(req.body), req.usuario!.id);
    res.json({ success: true, data: usuario });
});

export default router;
