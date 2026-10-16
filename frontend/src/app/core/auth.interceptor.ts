import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

// Agrega el token a las peticiones del panel y cierra la sesión si el servidor la rechaza
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const esPanel = req.url.startsWith('/api/v1/') && !req.url.startsWith('/api/v1/publico');
  const token = auth.token;

  const peticion = esPanel && token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
  return next(peticion).pipe(
    catchError((error: HttpErrorResponse) => {
      if (esPanel && error.status === 401 && !req.url.endsWith('/auth/login')) {
        auth.cerrarSesion(false);
        router.navigate(['/login'], { queryParams: { volver: router.url } });
      }
      return throwError(() => error);
    }),
  );
};
