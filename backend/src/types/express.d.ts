// Usuario autenticado que el middleware requireAuth agrega a cada petición
declare global {
    namespace Express {
        interface Request {
            usuario?: {
                id: string;
                nombre: string;
                email: string;
            };
        }
    }
}

export {};
