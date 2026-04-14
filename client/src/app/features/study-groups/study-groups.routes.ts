import { Routes } from '@angular/router';

export const STUDY_GROUPS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/groups-list/groups-list.component').then(
        (m) => m.GroupsListComponent,
      ),
    title: 'Study Groups — ExamSathi',
  },
  {
    path: ':groupId',
    loadComponent: () =>
      import('./pages/group-detail/group-detail.component').then(
        (m) => m.GroupDetailComponent,
      ),
    title: 'Study Group — ExamSathi',
  },
  {
    path: ':groupId/challenge/:cId',
    loadComponent: () =>
      import('./pages/challenge-screen/challenge-screen.component').then(
        (m) => m.ChallengeScreenComponent,
      ),
    title: 'Live Challenge — ExamSathi',
  },
];
