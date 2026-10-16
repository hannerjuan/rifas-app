// Crea el administrador inicial a partir de ADMIN_NOMBRE, ADMIN_EMAIL y ADMIN_PASSWORD del .env.
// Solo actúa si todavía no existe ningún usuario.
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const usuarios = await prisma.usuario.count();
    if (usuarios > 0) {
        console.log('[SEED] Ya existen usuarios; no se crea el administrador inicial.');
        return;
    }

    const nombre = process.env.ADMIN_NOMBRE?.trim() || 'Administrador';
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD ?? '';
    if (!email || password.length < 8) {
        throw new Error('Defina ADMIN_EMAIL y ADMIN_PASSWORD (mínimo 8 caracteres) en el archivo .env');
    }

    await prisma.usuario.create({ data: { nombre, email, passwordHash: await bcrypt.hash(password, 12) } });
    console.log(`[SEED] Administrador creado: ${email}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
