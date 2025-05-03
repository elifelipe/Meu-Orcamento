import { Routes } from '@angular/router';
import { ClientesComponent } from './pages/clientes/clientes.component';
import { OrcamentosComponent } from './pages/orcamentos/orcamentos.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';

export const routes: Routes = [
  // Agora as rotas são filhas da raiz, sem o '/tabs'
  {
    path: 'dashboard', // Rota direta
    component: DashboardComponent,
  },
  {
    path: 'orcamentos', // Rota direta
    component: OrcamentosComponent,
  },
  {
    path: 'clientes', // Rota direta
    component: ClientesComponent,
  },

  // Redirecionamento da raiz para uma das rotas diretas
  {
    path: '',
    redirectTo: '/dashboard', // Redireciona para a rota direta do dashboard
    pathMatch: 'full',
  },
  // Você pode adicionar uma rota wildcard para páginas não encontradas, opcional
  // {
  //   path: '**',
  //   redirectTo: '/dashboard',
  //   pathMatch: 'full'
  // }
];
