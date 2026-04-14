import { Routes } from '@angular/router';

export const ROADMAP_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/roadmap/roadmap.component').then((m) => m.RoadmapComponent),
    title: 'Study Roadmap — ExamSathi',
  },
  {
    path: 'generate',
    loadComponent: () =>
      import('./pages/roadmap-generator/roadmap-generator.component').then(
        (m) => m.RoadmapGeneratorComponent,
      ),
    title: 'Generate Roadmap — ExamSathi',
  },
  {
    path: 'view',
    loadComponent: () =>
      import('./pages/roadmap-view/roadmap-view.component').then(
        (m) => m.RoadmapViewComponent,
      ),
    title: 'My Roadmap — ExamSathi',
  },
];
