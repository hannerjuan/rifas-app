import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { map, Observable, tap } from 'rxjs';
import { Respuesta, Usuario } from './modelos';

const CLAVE_SESION = 'rifas.sesion';

interface Sesion {
  token: string;
  usuario: Usuario;
}

function leerSesion(): Sesion | null {
  try {
    const texto = localStorage.getItem(CLAVE_SESION);
    return texto ? (JSON.parse(texto) as Sesion) : null;
  } catch {
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly sesion = signal<Sesion | null>(leerSesion());

  readonly usuario = computed(() => this.sesion()?.usuario ?? null);
  readonly autenticado = computed(() => !!this.sesion());

  get token(): string | null {
    return this.sesion()?.token ?? null;
  }

  login(email: string, password: string): Observable<Usuario> {
    return this.http.post<Respuesta<Sesion>>('/api/v1/auth/login', { email, password }).pipe(
      tap((r) => this.guardar(r.data)),
      map((r) => r.data.usuario),
    );
  }

  cambiarPassword(actual: string, nueva: string) {
    return this.http.patch<Respuesta<null>>('/api/v1/auth/password', { actual, nueva });
  }

  cerrarSesion(redirigir = true) {
    this.sesion.set(null);
    try {
      localStorage.removeItem(CLAVE_SESION);
    } catch {
      /* almacenamiento no disponible */
    }
    if (redirigir) this.router.navigate(['/login']);
  }

  private guardar(sesion: Sesion) {
    this.sesion.set(sesion);
    try {
      localStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
    } catch {
      /* almacenamiento no disponible: la sesión dura mientras la pestaña esté abierta */
    }
  }
}
