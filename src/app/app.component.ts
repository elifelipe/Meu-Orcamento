import { Component, OnDestroy, OnInit } from '@angular/core';
import { IonApp, IonRouterOutlet, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { appsOutline, documentTextOutline, peopleOutline, cubeOutline } from 'ionicons/icons';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Subject, takeUntil } from 'rxjs';
import { Platform } from '@ionic/angular'; // Import Platform
import { AdmobService } from './services/admob.service'; // Import o serviço AdmobService


@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [
    IonIcon,
    IonApp,
    IonRouterOutlet,
    CommonModule,
    RouterModule,
    MatButtonToggleModule
  ],
})
export class AppComponent implements OnInit, OnDestroy {
  navLinks = [
    { path: '/dashboard', label: 'Dashboard', icon: 'apps-outline' },
    { path: '/orcamentos', label: 'Orçamentos', icon: 'document-text-outline' },
    { path: '/clientes', label: 'Clientes', icon: 'people-outline' },
    // { path: '/produtos', label: 'Produtos', icon: 'cube-outline' }, // Descomente se precisar
  ];

  activeLink: string | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private platform: Platform, // Injete o Platform
    private admobService: AdmobService // Injete o AdmobService
  ) {
    addIcons({
      'apps-outline': appsOutline,
      'document-text-outline': documentTextOutline,
      'people-outline': peopleOutline,
      'cube-outline': cubeOutline
    });
    // NÃO chame initialize aqui! É muito cedo.
  }

  ngOnInit() {
    // Inicia a lógica do AdMob QUANDO o componente estiver pronto
    this.initializeAppAndShowBanner();

    // Lógica para atualizar o link ativo na navegação (mantida)
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe((event: NavigationEnd) => {
      this.activeLink = event.urlAfterRedirects.split('?')[0];
      // console.log('NavigationEnd:', this.activeLink);
    });
    this.activeLink = this.router.url.split('?')[0];
    // console.log('Initial URL:', this.activeLink);
  }

  // Função assíncrona para inicializar e mostrar o banner
  async initializeAppAndShowBanner() {
    try {
      // Espera a plataforma estar pronta (JÁ É FEITO DENTRO do initialize do serviço, mas bom garantir aqui também)
      await this.platform.ready();
      console.log('AppComponent: Platform está pronta. Iniciando AdMob...');

      // Chama a inicialização do serviço AdMob
      await this.admobService.initialize();
      console.log('AppComponent: AdMob inicializado pelo serviço.');

      // Após inicializar com sucesso, mostra o banner
      console.log('AppComponent: Solicitando exibição do Banner...');
      await this.admobService.showBanner();
      console.log('AppComponent: Solicitação para mostrar banner enviada ao serviço.');

    } catch (error) {
      // O erro já foi logado no serviço, mas podemos logar aqui também
      console.error('AppComponent: Erro durante a inicialização ou exibição do AdMob:', error);
      // Você pode querer mostrar uma mensagem para o usuário aqui
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    // Opcional: Esconder o banner quando o componente principal for destruído
    // this.admobService.hideBanner();
  }
}
