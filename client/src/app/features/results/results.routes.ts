import { Routes } from '@angular/router';

export const RESULTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/results-list/results-list.component').then(
        (m) => m.ResultsListComponent,
      ),
    title: 'Results — ExamSathi',
  },
  {
    path: ':resultId',
    loadComponent: () =>
      import('./pages/result-detail/result-detail.component').then(
        (m) => m.ResultDetailComponent,
      ),
    title: 'Result Detail — ExamSathi',
  },
];
