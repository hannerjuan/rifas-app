# Rifas 00-99 — contexto para asistentes de código

Proyecto independiente (no tiene relación con PUNTO DEL PC). Ver `README.md` para arquitectura y reglas de negocio.

## Reglas
- Responder siempre en **español**; comentarios y textos de la interfaz en español.
- Commits y PRs **sin** la línea `Co-Authored-By` ni atribución a Claude.
- Nunca escribir contraseñas, tokens ni valores reales del `.env` en archivos versionados ni en el chat.

## Convenciones
- Backend por módulos: `src/modules/<modulo>/{schema,service,routes}.ts`. Respuestas `{ success, data }` o
  `{ success: false, error, detalles[] }`. Los errores de negocio se lanzan con `AppError(status, mensaje)` y
  los atrapa `manejadorErrores` (Express 5 propaga los errores async).
- Toda modificación de boletas pasa por `venta.service.ts` dentro de una transacción y registra `MovimientoBoleta`;
  después se llama `notificarCambio(rifaId)` para el tiempo real.
- Frontend: `core` (modelos, servicios, formato, mensajes de WhatsApp), `shared` (matriz, pipes, avisos,
  confirmación), `features/{publico,auth,admin}`, `layout`. Estilos con Tailwind; botones `btn btn-primario`, etc.
- Puertos: API 3100, frontend 4300.
