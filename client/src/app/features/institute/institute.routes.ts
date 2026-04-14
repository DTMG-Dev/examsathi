import { Routes } from '@angular/router';

export const INSTITUTE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/institute-portal/institute-portal.component').then(
        (m) => m.InstitutePortalComponent,
      ),
    title: 'Institute Portal — ExamSathi',
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/institute-dashboard/institute-dashboard.component').then(
            (m) => m.InstituteDashboardComponent,
          ),
        title: 'Institute Dashboard — ExamSathi',
      },
      {
        path: 'batches',
        loadComponent: () =>
          import('./pages/batch-management/batch-management.component').then(
            (m) => m.BatchManagementComponent,
          ),
        title: 'Batch Management — ExamSathi',
      },
      {
        path: 'assign-test',
        loadComponent: () =>
          import('./pages/assign-test/assign-test.component').then(
            (m) => m.AssignTestComponent,
          ),
        title: 'Assign Test — ExamSathi',
      },
      {
        path: 'results',
        loadComponent: () =>
          import('./pages/results-view/results-view.component').then(
            (m) => m.ResultsViewComponent,
          ),
        title: 'Results — ExamSathi',
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./pages/institute-settings/institute-settings.component').then(
            (m) => m.InstituteSettingsComponent,
          ),
        title: 'Settings — ExamSathi',
      },
    ],
  },
];
