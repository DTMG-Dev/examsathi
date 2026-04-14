import { Routes } from '@angular/router';

export const PARENT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/parent-dashboard/parent-dashboard.component').then(
        (m) => m.ParentDashboardComponent,
      ),
    title: 'Parent Dashboard — ExamSathi',
  },
];
