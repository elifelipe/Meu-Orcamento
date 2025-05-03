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
  IonButtons,
  IonNote, IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { cameraOutline, saveOutline, createOutline, trashOutline } from 'ionicons/icons'; // Import icons
import { addIcons } from 'ionicons'; // Import addIcons

// Define the interface for company data (Consider moving this to a shared models file)
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
  imports: [IonRouterOutlet, IonApp,
    CommonModule,
    FormsModule,
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
    IonButtons,
    IonNote
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

  constructor() {
    // Register icons needed for this component
    addIcons({ cameraOutline, saveOutline, createOutline, trashOutline });
  }

  ngOnInit(): void {
    // Load saved company data
    const dadosSalvos = localStorage.getItem('dadosEmpresa');
    if (dadosSalvos) {
      this.dadosEmpresa = JSON.parse(dadosSalvos);
    } else {
      // Initialize if no data saved
      this.editandoDadosEmpresa = true; // Start in edit mode if no data
    }

    // Load saved logo
    const logoSalva = localStorage.getItem('logoEmpresa');
    if (logoSalva) {
      this.logoUrl = logoSalva;
    }
  }

  editarDadosEmpresa(): void {
    this.editandoDadosEmpresa = true;
  }

  salvarDadosEmpresa(): void {
  localStorage.setItem('dadosEmpresa', JSON.stringify(this.dadosEmpresa));
  this.editandoDadosEmpresa = false;
  // Mostrar toast/mensagem de sucesso
  console.log('Dados da empresa salvos com sucesso!');
}

  // Handle file selection for the logo
  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    // Basic validation (optional: add size/type checks)
    if (!file.type.startsWith('image/')) {
        console.error("Tipo de arquivo inválido. Selecione uma imagem.");
        // Optionally show an alert to the user
        return;
    }

    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.logoUrl = e.target.result;
      // Save the logo (as base64) to localStorage
      localStorage.setItem('logoEmpresa', this.logoUrl ?? '');
      console.log('Logo da empresa salva.');
    };
    reader.onerror = (error) => {
        console.error("Erro ao ler o arquivo:", error);
        // Optionally show an alert to the user
    };
    reader.readAsDataURL(file);
  }

  // Trigger hidden file input click
  triggerLogoUpload(): void {
    const fileInput = document.getElementById('logo-upload-input') as HTMLInputElement;
    if (fileInput) {
        fileInput.click();
    }
  }

  // Remove the logo
  removerLogo(): void {
    this.logoUrl = null;
    localStorage.removeItem('logoEmpresa');
    console.log('Logo da empresa removido.');
     // Clear the file input value if needed
     const fileInput = document.getElementById('logo-upload-input') as HTMLInputElement;
     if (fileInput) {
         fileInput.value = '';
     }
  }
}
