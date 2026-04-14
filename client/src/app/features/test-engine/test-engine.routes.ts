import { Routes } from '@angular/router';

export const TEST_ENGINE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/test-list/test-list.component').then(
        (m) => m.TestListComponent,
      ),
    title: 'Tests — ExamSathi',
  },
  {
    path: 'generate',
    loadComponent: () =>
      import('./pages/question-generator/question-generator.component').then(
        (m) => m.QuestionGeneratorComponent,
      ),
    title: 'Generate Questions — ExamSathi',
  },
  {
    path: 'session',
    loadComponent: () =>
      import('./pages/test-screen/test-screen.component').then(
        (m) => m.TestScreenComponent,
      ),
    title: 'Test — ExamSathi',
  },
  {
    path: 'result/:sessionId',
    loadComponent: () =>
      import('./pages/test-result/test-result.component').then(
        (m) => m.TestResultComponent,
      ),
    title: 'Results — ExamSathi',
  },
  {
    path: 'review/:sessionId',
    loadComponent: () =>
      import('./pages/solution-review/solution-review.component').then(
        (m) => m.SolutionReviewComponent,
      ),
    title: 'Solution Review — ExamSathi',
  },
];
