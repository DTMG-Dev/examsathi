import { Routes } from '@angular/router';

export const WEAK_AREAS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/weak-area-dashboard/weak-area-dashboard.component').then(
        (m) => m.WeakAreaDashboardComponent,
      ),
    title: 'Weak Areas — ExamSathi',
  },
  {
    path: 'adaptive-test',
    loadComponent: () =>
      import('./pages/adaptive-test/adaptive-test.component').then(
        (m) => m.AdaptiveTestComponent,
      ),
    title: 'Adaptive Practice — ExamSathi',
  },
];
