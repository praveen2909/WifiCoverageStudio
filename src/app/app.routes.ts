import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'dashboard',
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard').then((component) => component.Dashboard),
  },
  {
    path: 'coverage-map',
    loadComponent: () =>
      import('./features/coverage-map/coverage-map').then((component) => component.CoverageMap),
  },
  {
    path: 'wifi-monitor',
    loadComponent: () =>
      import('./features/wifi-monitor/wifi-monitor').then((component) => component.WifiMonitor),
  },
  {
    path: 'floor-plan',
    loadComponent: () =>
      import('./features/floor-plan/floor-plan').then((component) => component.FloorPlan),
  },
  {
    path: 'mesh-simulator',
    loadComponent: () =>
      import('./features/mesh-simulator/mesh-simulator').then(
        (component) => component.MeshSimulator,
      ),
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./features/settings/settings').then((component) => component.Settings),
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
