import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { moderatorGuard } from './core/guards/moderator.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'auth',
    loadComponent: () => import('./features/auth/auth.component').then(m => m.AuthComponent)
  },
  {
    path: 'posts/new',
    canActivate: [authGuard],
    loadComponent: () => import('./features/post-form/post-form.component').then(m => m.PostFormComponent)
  },
  {
    path: 'posts/:id',
    loadComponent: () => import('./features/post-detail/post-detail.component').then(m => m.PostDetailComponent)
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'moderation',
    canActivate: [authGuard, moderatorGuard],
    loadComponent: () => import('./features/moderation/moderation.component').then(m => m.ModerationComponent)
  },
  {
    path: 'admin',
    canActivate: [authGuard, adminGuard],
    loadComponent: () => import('./features/admin/admin.component').then(m => m.AdminComponent)
  },
  {
    path: 'confidentialite',
    loadComponent: () => import('./features/privacy/privacy.component').then(m => m.PrivacyComponent)
  },
  {
    path: 'a-propos',
    loadComponent: () => import('./features/about/about.component').then(m => m.AboutComponent)
  },
  {
    path: '**',
    redirectTo: ''
  }
];
