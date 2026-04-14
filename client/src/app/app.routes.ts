import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';

export const routes: Routes = [
  // ── Authenticated area ─────────────────────────────────────────────
  {
    path: '',
    loadComponent: () =>
      import('./layouts/main-layout/main-layout.component').then(
        (m) => m.MainLayoutComponent,
      ),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadChildren: () =>
          import('./features/dashboard/dashboard.routes').then(
            (m) => m.DASHBOARD_ROUTES,
          ),
      },
      {
        path: 'test-engine',
        loadChildren: () =>
          import('./features/test-engine/test-engine.routes').then(
            (m) => m.TEST_ENGINE_ROUTES,
          ),
      },
      {
        path: 'results',
        loadChildren: () =>
          import('./features/results/results.routes').then(
            (m) => m.RESULTS_ROUTES,
          ),
      },
      {
        path: 'roadmap',
        loadChildren: () =>
          import('./features/roadmap/roadmap.routes').then(
            (m) => m.ROADMAP_ROUTES,
          ),
      },
      {
        path: 'study-groups',
        loadChildren: () =>
          import('./features/study-groups/study-groups.routes').then(
            (m) => m.STUDY_GROUPS_ROUTES,
          ),
      },
      {
        path: 'institute',
        loadChildren: () =>
          import('./features/institute/institute.routes').then(
            (m) => m.INSTITUTE_ROUTES,
          ),
      },
      {
        path: 'weak-areas',
        loadChildren: () =>
          import('./features/weak-areas/weak-areas.routes').then(
            (m) => m.WEAK_AREAS_ROUTES,
          ),
      },
      {
        path: 'pricing',
        loadChildren: () =>
          import('./features/pricing/pricing.routes').then(
            (m) => m.PRICING_ROUTES,
          ),
      },
      {
        path: 'parent',
        loadChildren: () =>
          import('./features/parent/parent.routes').then(
            (m) => m.PARENT_ROUTES,
          ),
      },
    ],
  },
  // ── Guest / auth area ──────────────────────────────────────────────
  {
    path: 'auth',
    loadComponent: () =>
      import('./layouts/auth-layout/auth-layout.component').then(
        (m) => m.AuthLayoutComponent,
      ),
    canActivate: [guestGuard],
    children: [
      {
        path: '',
        loadChildren: () =>
          import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
      },
    ],
  },
  // ── Error pages ────────────────────────────────────────────────────
  {
    path: '500',
    loadComponent: () =>
      import('./features/errors/server-error/server-error.component').then(
        (m) => m.ServerErrorComponent,
      ),
    title: 'Server Error — ExamSathi',
  },
  // ── 404 fallback ───────────────────────────────────────────────────
  {
    path: '**',
    loadComponent: () =>
      import('./features/errors/not-found/not-found.component').then(
        (m) => m.NotFoundComponent,
      ),
    title: 'Page Not Found — ExamSathi',
  },
];
