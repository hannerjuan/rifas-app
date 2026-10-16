import crypto from 'crypto';

export const EN_PRODUCCION = process.env.NODE_ENV === 'production';

export const PORT = Number(process.env.PORT || 3100);

// Orígenes permitidos para CORS (separados por coma). En desarrollo, el frontend de Angular.
export const CORS_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:4300')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

// Secreto para firmar los JWT. En producción es obligatorio; en desarrollo, si falta, se genera uno
// temporal (las sesiones se cierran cada vez que se reinicia el servidor).
function resolverSecreto(): string {
    const secreto = process.env.JWT_SECRET;
    if (secreto && secreto.length >= 32) return secreto;

    if (EN_PRODUCCION) {
        throw new Error('JWT_SECRET es obligatorio en producción y debe tener al menos 32 caracteres.');
    }
    console.warn('[RIFAS] JWT_SECRET no está definido (o es muy corto): se usa un secreto temporal.');
    return crypto.randomBytes(48).toString('hex');
}

export const JWT_SECRET = resolverSecreto();
export const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '12h') as `${number}h`;

// Costo de bcrypt: 12 rondas es un buen equilibrio entre seguridad y tiempo de login
export const BCRYPT_ROUNDS = 12;

// Colombia no tiene horario de verano: todas las fechas se muestran en esta zona
export const ZONA_HORARIA = 'America/Bogota';
