import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-publico-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="flex min-h-screen flex-col">
      <header class="bg-gradient-to-r from-marca-900 via-marca-800 to-fuchsia-700 text-white">
        <div class="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <a routerLink="/" class="flex items-center gap-2 text-lg font-extrabold tracking-tight">
            <span class="text-2xl" aria-hidden="true">🎟️</span> Rifas 00-99
          </a>
          <nav class="flex items-center gap-1 text-sm font-medium">
            <a
              routerLink="/"
              [routerLinkActiveOptions]="{ exact: true }"
              routerLinkActive="bg-white/20"
              class="rounded-lg px-3 py-1.5 hover:bg-white/10"
              >Rifas</a
            >
            <a routerLink="/consulta" routerLinkActive="bg-white/20" class="rounded-lg px-3 py-1.5 hover:bg-white/10"
              >Mis boletas</a
            >
          </nav>
        </div>
      </header>

      <main class="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <router-outlet />
      </main>

      <footer class="border-t border-slate-200 bg-white">
        <div
          class="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-slate-500 sm:flex-row"
        >
          <span>Las boletas que no estén pagadas antes del sorteo no participan.</span>
          <a routerLink="/login" class="hover:text-marca-700">Administración</a>
        </div>
      </footer>
    </div>
  `,
})
export class PublicoLayout {}
