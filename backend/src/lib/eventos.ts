import { Response } from 'express';

// Notificaciones en tiempo real con Server-Sent Events.
// El evento solo avisa "esta rifa cambió" (sin datos): cada cliente vuelve a consultar lo que tiene permiso de ver,
// así el mismo canal sirve para el panel del administrador y para el portal público.

const MAX_CONEXIONES = 1000;
const suscriptores = new Map<string, Set<Response>>();
let conexiones = 0;

export function suscribir(rifaId: string, res: Response): boolean {
    if (conexiones >= MAX_CONEXIONES) return false;

    res.set({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no', // evita que nginx acumule los eventos
    });
    res.flushHeaders();
    res.write('retry: 5000\n\n');

    let grupo = suscriptores.get(rifaId);
    if (!grupo) {
        grupo = new Set();
        suscriptores.set(rifaId, grupo);
    }
    grupo.add(res);
    conexiones++;

    res.on('close', () => {
        grupo!.delete(res);
        conexiones--;
        if (grupo!.size === 0) suscriptores.delete(rifaId);
    });
    return true;
}

export function notificarCambio(rifaId: string) {
    const grupo = suscriptores.get(rifaId);
    if (!grupo) return;
    const mensaje = `event: cambio\ndata: ${JSON.stringify({ rifaId, en: Date.now() })}\n\n`;
    for (const res of grupo) res.write(mensaje);
}

// Comentario periódico para que proxies y navegadores no cierren la conexión por inactividad
setInterval(() => {
    for (const grupo of suscriptores.values()) {
        for (const res of grupo) res.write(': ping\n\n');
    }
}, 25_000).unref();
