import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  // Portal público (sin sesión)
  {
    path: '',
    loadComponent: () => import('./layout/publico-layout').then((m) => m.PublicoLayout),
    children: [
      { path: '', title: 'Rifas', loadComponent: () => import('./features/publico/inicio').then((m) => m.Inicio) },
      {
        path: 'rifa/:id',
        title: 'Rifa',
        loadComponent: () => import('./features/publico/rifa-publica').then((m) => m.RifaPublicaPagina),
      },
      {
        path: 'consulta',
        title: 'Consultar mis boletas',
        loadComponent: () => import('./features/publico/consulta').then((m) => m.Consulta),
      },
    ],
  },
  {
    path: 'login',
    title: 'Ingresar',
    loadComponent: () => import('./features/auth/login').then((m) => m.Login),
  },
  // Panel del administrador
  {
    path: 'admin',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/admin-layout').then((m) => m.AdminLayout),
    children: [
      {
        path: '',
        title: 'Rifas · Panel',
        loadComponent: () => import('./features/admin/rifas-lista').then((m) => m.RifasLista),
      },
      {
        path: 'rifas/nueva',
        title: 'Nueva rifa',
        loadComponent: () => import('./features/admin/rifa-form').then((m) => m.RifaForm),
      },
      {
        path: 'rifas/:id/editar',
        title: 'Editar rifa',
        loadComponent: () => import('./features/admin/rifa-form').then((m) => m.RifaForm),
      },
      {
        path: 'rifas/:id',
        title: 'Rifa · Panel',
        loadComponent: () => import('./features/admin/rifa-detalle').then((m) => m.RifaDetalle),
      },
      {
        path: 'usuarios',
        title: 'Administradores',
        loadComponent: () => import('./features/admin/usuarios').then((m) => m.Usuarios),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
