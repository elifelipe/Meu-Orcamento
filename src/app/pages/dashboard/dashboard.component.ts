// src/app/dashboard/dashboard.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButton,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonAvatar,
  IonIcon,
  IonNote,
  IonGrid, // Importar IonGrid
  IonRow,  // Importar IonRow
  IonCol   // Importar IonCol
} from '@ionic/angular/standalone';
import { cameraOutline, saveOutline, createOutline, trashOutline, businessOutline, peopleOutline } from 'ionicons/icons'; // Importar peopleOutline
import { addIcons } from 'ionicons';
import { ClientesService } from '../../services/clientes.service'; // Importar ClientesService

// Definir a interface para os dados da empresa
interface DadosEmpresa {
  nome: string;
  endereco: string;
  cidade: string;
  estado: string;
  telefone1: string;
  telefone2: string;
  email: string;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  standalone: true,
  imports: [
    // --- Módulos Angular ---
    CommonModule,
    FormsModule,

    // --- Componentes Ionic Standalone ---
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonInput,
    IonButton,
    IonIcon,
    IonAvatar,
    IonNote,
    IonGrid, // Adicionar IonGrid
    IonRow,  // Adicionar IonRow
    IonCol   // Adicionar IonCol
  ],
})
export class DashboardComponent implements OnInit {
  logoUrl: string | null = null;
  dadosEmpresa: DadosEmpresa = {
    nome: '',
    endereco: '',
    cidade: '',
    estado: '',
    telefone1: '',
    telefone2: '',
    email: '',
  };
  editandoDadosEmpresa: boolean = false;
  totalClientes: number = 0; // Propriedade para guardar o total de clientes

  // Injetar ClientesService
  constructor(private clientesService: ClientesService) {
    // Registar ícones usados no template
    addIcons({
        cameraOutline,
        saveOutline,
        createOutline,
        trashOutline,
        businessOutline,
        peopleOutline // Adicionar peopleOutline
    });
  }

  mostrarDadosEmpresa = false;


  get isFormValid(): boolean {
    // 1. Verifica usando Optional Chaining se 'nome' existe e tem comprimento > 0 após trim()
    const nomePreenchido = this.dadosEmpresa?.nome?.trim()?.length > 0;

    // 2. Adicione outras validações obrigatórias aqui, se houver
    // const emailValido = !!this.dadosEmpresa?.email; // Exemplo simples

    // 3. Retorna um booleano explícito.
    //    Se nomePreenchido for true, !!true é true.
    //    Se nomePreenchido for false ou undefined (devido ao ?.), !!false ou !!undefined é false.
    //    Combine com outras validações usando &&: return !!nomePreenchido && !!emailValido;
    return !!nomePreenchido;
  }

  // Tornar ngOnInit assíncrono para aguardar o carregamento dos clientes
  async ngOnInit(): Promise<void> {
    // Carregar dados da empresa guardados
    const dadosSalvos = localStorage.getItem('dadosEmpresa');
    if (dadosSalvos) {
      this.dadosEmpresa = JSON.parse(dadosSalvos);
    } else {
      this.editandoDadosEmpresa = true;
    }

    // Carregar logo guardado
    const logoSalva = localStorage.getItem('logoEmpresa');
    if (logoSalva) {
      this.logoUrl = logoSalva;
    }

    // Carregar dados dos clientes e obter a contagem
    await this.loadClientData();
  }

  // Método para carregar dados dos clientes e a contagem
  async loadClientData(): Promise<void> {
    try {
      // Forçar recarregamento para garantir dados atualizados no dashboard
      await this.clientesService.loadClientes(true);
      this.totalClientes = this.clientesService.getTotalClientes();
      console.log(`Dashboard: Total clientes carregados: ${this.totalClientes}`);
    } catch (error) {
      console.error('Dashboard: Erro ao carregar dados de clientes:', error);
      // Opcionalmente, mostrar uma mensagem de erro ao utilizador
      this.totalClientes = 0; // Definir como 0 em caso de erro
    }
  }


  // --- Métodos para Dados da Empresa (mantidos) ---

  editarDadosEmpresa(): void {
    this.editandoDadosEmpresa = true;
  }

  salvarDadosEmpresa(): void {
    if (!this.dadosEmpresa.nome) {
       console.warn('Nome da empresa é obrigatório.');
       return;
    }
    localStorage.setItem('dadosEmpresa', JSON.stringify(this.dadosEmpresa));
    this.editandoDadosEmpresa = false;
    console.log('Dados da empresa guardados com sucesso!');
  }

  cancelarEdicao(): void {
     const dadosSalvos = localStorage.getItem('dadosEmpresa');
     if (dadosSalvos) {
       this.dadosEmpresa = JSON.parse(dadosSalvos);
     }
     this.editandoDadosEmpresa = false;
  }

  onFileSelected(event: Event): void {
    const element = event.currentTarget as HTMLInputElement;
    const fileList: FileList | null = element.files;

    if (fileList && fileList.length > 0) {
      const file = fileList[0];
      if (!file.type.startsWith('image/')) {
          console.error("Tipo de ficheiro inválido. Selecione uma imagem.");
          element.value = '';
          return;
      }
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        if (e.target?.result) {
            this.logoUrl = e.target.result as string;
            localStorage.setItem('logoEmpresa', this.logoUrl);
            console.log('Logo da empresa guardado.');
        } else {
             console.error("Erro ao ler o ficheiro: resultado vazio.");
             this.logoUrl = null;
        }
      };
      reader.onerror = (error) => {
          console.error("Erro ao ler o ficheiro:", error);
          this.logoUrl = null;
      };
      reader.readAsDataURL(file);
    }
     element.value = '';
  }

  triggerLogoUpload(): void {
    const fileInput = document.getElementById('logo-upload-input') as HTMLInputElement;
    if (fileInput) {
        fileInput.click();
    }
  }

  removerLogo(): void {
    this.logoUrl = null;
    localStorage.removeItem('logoEmpresa');
    console.log('Logo da empresa removido.');
  }
}
