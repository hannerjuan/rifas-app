# Rifas 00-99

Aplicación web para vender y administrar rifas de 100 números (00 al 99): matriz interactiva de boletas,
ventas con datos del comprador, mensajes de WhatsApp, portal público de consulta y reportes en PDF y Excel.

## Arquitectura

```
frontend/  Angular 20 (standalone + signals) · Tailwind CSS v4 · Angular CDK (diálogos)   → puerto 4300
backend/   Node.js · Express 5 · TypeScript · Prisma 5 · PostgreSQL · Zod · JWT             → puerto 3100
```

- **API del panel** (`/api/v1/*`, exige JWT): rifas, boletas, ventas, usuarios, loterías, exportes.
- **API pública** (`/api/v1/publico/*`, sin sesión y con límite de peticiones): rifas activas, matriz
  disponible/ocupada, consulta por WhatsApp y eventos en tiempo real.
- **Tiempo real**: Server-Sent Events. El servidor solo avisa "la rifa cambió" y cada pantalla vuelve a
  consultar lo que tiene permiso de ver (panel y portal usan el mismo canal).
- **WhatsApp**: enlaces `https://wa.me/<número>?text=<mensaje>` generados en el navegador (sin API ni costos).

### Modelo de datos (`backend/prisma/schema.prisma`)

| Tabla | Descripción |
|---|---|
| `usuarios` | Administradores (único rol). |
| `rifas` | Evento, premio (nombre, descripción, URL de ficha e imagen), valor fijo de la boleta, fecha y hora del sorteo, lotería, responsable y resultado. |
| `boletas` | Las 100 boletas (00-99) de cada rifa, creadas junto con la rifa. Estado: `DISPONIBLE`, `RESERVADA`, `PAGADA`. |
| `ventas` | Comprador (nombre y WhatsApp) y los números que adquirió en una operación. |
| `movimientos_boleta` | Auditoría de cada cambio de estado (quién, cuándo, de qué estado a cuál). |

## Reglas de negocio

- El **valor de la boleta** se define al crear la rifa y queda fijo desde la primera venta.
- Una venta exige **nombre completo y WhatsApp** (celular colombiano; se guarda como `57XXXXXXXXXX`).
- La venta es **atómica**: si alguno de los números ya fue tomado (por ejemplo, por otro administrador al mismo
  tiempo), no se vende ninguno.
- Cambios manuales: Reservada ↔ Pagada, y cualquiera de las dos → Disponible (liberar).
- Desde la **fecha y hora del sorteo** se bloquean las ventas y los cambios de estado.
- **Resultado**: se registra el número de 4 cifras de la lotería; gana la boleta con las **dos últimas cifras**.
  Si esa boleta no está pagada (o no se vendió), el **premio queda para el vendedor**.
- Los mensajes de WhatsApp siempre advierten que **las boletas sin pagar no juegan**.
- El portal público muestra solo disponible/ocupada (sin nombres); la consulta por WhatsApp muestra solo el
  primer nombre del comprador.

## Puesta en marcha (desarrollo)

Requisitos: Node.js 20+ y PostgreSQL.

```bash
# Backend
cd backend
npm install
cp .env.example .env        # completar DATABASE_URL, JWT_SECRET y ADMIN_PASSWORD
npm run db:migrate          # crea la base rifas_db y aplica las migraciones (y crea el administrador)
npm run dev                 # http://localhost:3100/api/v1/health

# Frontend (otra terminal)
cd frontend
npm install
npm start                   # http://localhost:4300  (el proxy envía /api al puerto 3100)
```

- Portal público: `http://localhost:4300/`
- Consulta del comprador: `http://localhost:4300/consulta`
- Panel: `http://localhost:4300/admin` (ingresar con `ADMIN_EMAIL` / `ADMIN_PASSWORD` del `.env`)

## Producción (resumen)

1. `cd backend && npm ci && npm run build && npm run db:deploy && npm run db:seed && npm start`
   con `NODE_ENV=production`, `JWT_SECRET` de 32+ caracteres y `CORS_ORIGINS` con el dominio real.
2. `cd frontend && npm ci && npm run build` y servir `frontend/dist/frontend/browser` con nginx.
3. En nginx: HTTPS, `try_files $uri /index.html` para el frontend y `proxy_pass` de `/api` al puerto 3100
   con `proxy_buffering off` para los eventos en tiempo real.

Las rifas con fines comerciales en Colombia requieren autorización de Coljuegos o de la entidad territorial.
