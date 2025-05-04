import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { AdMob, BannerAdOptions, BannerAdSize, BannerAdPosition, AdMobInitializationOptions } from '@capacitor-community/admob'; // Verifique o caminho/nome correto do plugin

@Injectable({
  providedIn: 'root'
})
export class AdmobService {
  private readonly AD_UNIT_ID_BANNER_TEST = 'ca-app-pub-8781801467559084/7447569544';
  private isInitialized = false;

  constructor(private platform: Platform) { }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('AdMob Service: Já inicializado.');
      return;
    }
    await this.platform.ready();
    console.log('AdMob Service: Platform pronta, inicializando AdMob...');

    try {
      const initOptions: AdMobInitializationOptions = {
         testingDevices: [],
      };


      await AdMob.initialize(initOptions);

      this.isInitialized = true;
      console.log('AdMob Service: AdMob inicializado com sucesso.');
    } catch (error) {
      console.error('AdMob Service: Erro ao inicializar AdMob:', error);
      throw error;
    }
  }

  async showBanner(): Promise<void> {
    if (!this.isInitialized) {
      console.warn('AdMob Service: AdMob não inicializado. Tentando inicializar agora...');
      await this.initialize(); // Tenta inicializar se ainda não foi
    }

    // Espera a plataforma novamente (redundante se initialize já fez, mas seguro)
    await this.platform.ready();
    console.log('AdMob Service: Solicitando exibição do banner...');

    const options: BannerAdOptions = {
      adId: this.AD_UNIT_ID_BANNER_TEST,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.TOP_CENTER,
      margin: 50,
      // isTesting: true,                       // <--- Mantenha true em testes!
      // npa: true, // Descomente para anúncios não personalizados
    };

    try {
      await AdMob.showBanner(options);
      console.log('AdMob Service: Solicitação para mostrar banner enviada.');
    } catch (error) {
      console.error('AdMob Service: Erro ao mostrar banner:', error);
      // Lide com o erro como preferir
    }
  }

  async hideBanner(): Promise<void> {
    try {
      await AdMob.hideBanner();
      console.log('AdMob Service: Banner escondido.');
    } catch (error) {
      console.error('AdMob Service: Erro ao esconder banner:', error);
    }
  }

  // Outros métodos do serviço (resumeBanner, removeBanner, etc.)
}
