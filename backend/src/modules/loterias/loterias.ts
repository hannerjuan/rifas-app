import { Router } from 'express';

// Loterías tradicionales más populares de Colombia con su día y hora habitual de sorteo.
// dia: 0 = domingo ... 6 = sábado. La hora es la habitual (hora Colombia) y puede variar en festivos;
// el administrador siempre puede ajustar la fecha y hora del sorteo en el formulario.
// Fuentes: loteriasdecolombia.co/pagina/horarios y El Tiempo (consultadas en octubre de 2026).
export interface Loteria {
    nombre: string;
    dia: number;
    hora: string; // HH:mm
}

export const LOTERIAS: Loteria[] = [
    { nombre: 'Lotería de Cundinamarca', dia: 1, hora: '22:30' },
    { nombre: 'Lotería del Tolima', dia: 1, hora: '23:00' },
    { nombre: 'Lotería de la Cruz Roja', dia: 2, hora: '22:30' },
    { nombre: 'Lotería del Huila', dia: 2, hora: '22:30' },
    { nombre: 'Lotería de Manizales', dia: 3, hora: '22:30' },
    { nombre: 'Lotería del Meta', dia: 3, hora: '22:30' },
    { nombre: 'Lotería del Valle', dia: 3, hora: '22:30' },
    { nombre: 'Lotería de Bogotá', dia: 4, hora: '22:30' },
    { nombre: 'Lotería del Quindío', dia: 4, hora: '22:30' },
    { nombre: 'Lotería de Medellín', dia: 5, hora: '23:00' },
    { nombre: 'Lotería de Santander', dia: 5, hora: '23:00' },
    { nombre: 'Lotería de Risaralda', dia: 5, hora: '23:00' },
    { nombre: 'Lotería de Boyacá', dia: 6, hora: '22:40' },
    { nombre: 'Lotería del Cauca', dia: 6, hora: '22:40' },
    { nombre: 'Extra de Colombia', dia: 6, hora: '23:00' },
];

const router = Router();

// GET /api/v1/loterias
router.get('/', (_req, res) => {
    res.json({ success: true, data: LOTERIAS });
});

export default router;
