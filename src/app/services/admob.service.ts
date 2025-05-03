// Dentro de admob.service.ts
import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
// Importe os tipos necessários do plugin AdMob que você está usando
import { AdMob, BannerAdOptions, BannerAdSize, BannerAdPosition, AdMobInitializationOptions } from '@capacitor-community/admob'; // Verifique o caminho/nome correto do plugin

@Injectable({
  providedIn: 'root'
})
export class AdmobService {
  // Coloque seu ID de anúncio de TESTE aqui!
  // Veja: https://developers.google.com/admob/android/test-ads
  private readonly AD_UNIT_ID_BANNER_TEST = 'ca-app-pub-3940256099942544/6300978111';
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
      // *** OPÇÕES SIMPLIFICADAS ***
      // Removidas as opções não reconhecidas.
      // Verifique a documentação da SUA versão do plugin para opções exatas.
      const initOptions: AdMobInitializationOptions = {
         testingDevices: [], // Adicione IDs de dispositivos de teste aqui, se necessário
         // 'requestTrackingAuthorization' removido
         // 'initializeForTesting' removido (adicione de volta APENAS se tiver certeza que existe na sua versão)
      };

      // Você pode até tentar inicializar com um objeto vazio se permitido:
      // await AdMob.initialize({});
      // Ou com as opções simplificadas:
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
      adId: this.AD_UNIT_ID_BANNER_TEST, // **USE SEU ID DE TESTE AQUI**
      adSize: BannerAdSize.ADAPTIVE_BANNER, // <--- Para largura adaptável (total)
      position: BannerAdPosition.TOP_CENTER,   // <--- Posição no topo
      margin: 50,                            // <--- Sua margem de 50px (aplicada no topo)
      isTesting: true,                       // <--- Mantenha true em testes!
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
