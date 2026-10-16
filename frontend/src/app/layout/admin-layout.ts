import { Dialog } from '@angular/cdk/dialog';
import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { CambiarPassword } from '../features/auth/cambiar-password';

@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="flex min-h-screen flex-col">
      <header class="sticky top-0 z-40 bg-marca-900 text-white shadow">
        <div class="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5">
          <div class="flex items-center gap-4">
            <a routerLink="/admin" class="flex items-center gap-2 font-extrabold tracking-tight">
              <span class="text-xl" aria-hidden="true">🎟️</span>
              <span class="hidden sm:inline">Rifas · Panel</span>
            </a>
            <nav class="flex gap-1 text-sm">
              <!-- "Rifas" queda activo en todo el panel salvo en Usuarios -->
              <a routerLink="/admin" class="rounded-lg px-3 py-1.5 hover:bg-white/10" [class]="usuarios.isActive ? '' : 'bg-white/15'"
                >Rifas</a
              >
              <a
                routerLink="/admin/usuarios"
                routerLinkActive="bg-white/15"
                #usuarios="routerLinkActive"
                class="rounded-lg px-3 py-1.5 hover:bg-white/10"
                >Usuarios</a
              >
            </nav>
          </div>

          <div class="relative">
            <button
              type="button"
              class="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-white/10"
              (click)="menuAbierto.set(!menuAbierto())"
              [attr.aria-expanded]="menuAbierto()"
            >
              <span
                class="flex size-7 items-center justify-center rounded-full bg-white/20 text-xs font-bold uppercase"
                aria-hidden="true"
                >{{ iniciales() }}</span
              >
              <span class="hidden max-w-40 truncate sm:inline">{{ auth.usuario()?.nombre }}</span>
              <span aria-hidden="true">▾</span>
            </button>
            @if (menuAbierto()) {
              <div class="fixed inset-0 z-40" (click)="menuAbierto.set(false)"></div>
              <div class="absolute right-0 z-50 mt-1 w-56 overflow-hidden rounded-xl bg-white py-1 text-sm text-slate-700 shadow-xl">
                <div class="border-b border-slate-100 px-4 py-2 text-xs text-slate-500">{{ auth.usuario()?.email }}</div>
                <a routerLink="/" target="_blank" class="block px-4 py-2 hover:bg-slate-100" (click)="menuAbierto.set(false)"
                  >Ver portal público ↗</a
                >
                <button type="button" class="block w-full cursor-pointer px-4 py-2 text-left hover:bg-slate-100" (click)="cambiarPassword()">
                  Cambiar contraseña
                </button>
                <button
                  type="button"
                  class="block w-full cursor-pointer px-4 py-2 text-left text-rose-600 hover:bg-rose-50"
                  (click)="auth.cerrarSesion()"
                >
                  Cerrar sesión
                </button>
              </div>
            }
          </div>
        </div>
      </header>

      <main class="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <router-outlet />
      </main>
    </div>
  `,
})
export class AdminLayout {
  protected readonly auth = inject(AuthService);
  private readonly dialog = inject(Dialog);
  protected readonly menuAbierto = signal(false);

  protected iniciales() {
    const nombre = this.auth.usuario()?.nombre ?? '';
    return nombre
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0])
      .join('');
  }

  protected cambiarPassword() {
    this.menuAbierto.set(false);
    this.dialog.open(CambiarPassword, { width: '100%', maxWidth: '26rem' });
  }
}
