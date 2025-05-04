// src/app/clientes/clientes.component.ts
import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core'; // Added ViewChild
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButton,
  IonItem,
  IonLabel,
  IonList,
  IonCard,
  IonCardSubtitle,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonIcon,
  IonButtons,
  IonBackButton,
  IonSpinner,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  IonFab,
  IonFabButton,
  IonSearchbar // Added IonSearchbar
} from '@ionic/angular/standalone';
import { FileOpener } from '@capacitor-community/file-opener';
import { Share } from '@capacitor/share';
import { Dialog } from '@capacitor/dialog';
import { addIcons } from 'ionicons';
import { documentAttachOutline, shareOutline, trashOutline, closeCircleOutline, openOutline, peopleOutline } from 'ionicons/icons';

// Import the service and interfaces
import { ClientesService, Cliente, ClientePdfInfo } from '../../services/clientes.service';

// Add necessary icons
addIcons({ documentAttachOutline, shareOutline, trashOutline, closeCircleOutline, openOutline, peopleOutline });

// Re-define DadosEmpresa interface locally if not imported/shared globally
// It's better to have this in a shared location, but for this snippet:
interface DadosEmpresa {
  nome: string;
  endereco?: string; // Optional fields based on OrcamentoComponent
  cidade?: string;
  estado?: string;
  telefone1?: string;
  telefone2?: string;
  email?: string;
}


@Component({
  selector: 'app-clientes',
  templateUrl: './clientes.component.html', // Assume template is updated to pass 'cliente' to sharePdf
  styleUrls: ['./clientes.component.scss'],
  standalone: true,
  imports: [
    IonSearchbar, // Added IonSearchbar
    IonFabButton,
    IonFab,
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonCard,
    IonCardSubtitle,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonButton,
    IonIcon,
    IonButtons,
    IonBackButton,
    IonSpinner,
    IonItemSliding,
    IonItemOptions,
    IonItemOption
  ],
})
export class ClientesComponent implements OnInit, OnDestroy {
  allClientes: Cliente[] = []; // Stores the full list of clients
  filteredClientes: Cliente[] = []; // Stores the list displayed (filtered)
  isLoading = false; // Flag for loading indicator
  searchTerm: string = ''; // Holds the current search term

  // Optional: Get reference to the searchbar if needed later
  // @ViewChild(IonSearchbar) searchbar: IonSearchbar | undefined;

  constructor(private clientesService: ClientesService) {
      // Icons already added globally
      addIcons({documentAttachOutline,openOutline,shareOutline,trashOutline,peopleOutline});
  }

  ngOnInit() {
    console.log('ClientesComponent ngOnInit');
    // Initial load handled by ionViewWillEnter
  }

  ngOnDestroy() {
    // Cleanup if needed
  }

  async ionViewWillEnter() {
      console.log('ClientesComponent ionViewWillEnter - refreshing list');
      // Clear search term on view entry if desired, or keep it persistent
      // this.searchTerm = '';
      await this.loadClientes();
      // Apply filter if search term exists from previous state
      this.filterClients();
  }

  async loadClientes(forceReload: boolean = false): Promise<void> {
    this.isLoading = true;
    this.filteredClientes = []; // Clear filtered list while loading
    if (forceReload) {
        this.allClientes = []; // Clear main list only on forced reload
    }
    try {
        // Load the full list into allClientes
        this.allClientes = await this.clientesService.loadClientes(forceReload);
        // Initially, the filtered list is the same as the full list
        this.filterClients(); // Apply current search term (might be empty)
        console.log(`Clientes loaded in component: ${this.allClientes.length}`);
    } catch (error) {
        console.error("Error loading clients in component:", error);
        await this.mostrarAlerta('Erro', 'Não foi possível carregar a lista de clientes.');
        this.allClientes = [];
        this.filteredClientes = [];
    } finally {
        this.isLoading = false;
    }
  }

  // --- Search Functionality ---
  handleSearchInput(event: any): void {
    const query = event.target.value.toLowerCase();
    this.searchTerm = query;
    this.filterClients();
  }

  filterClients(): void {
    if (!this.searchTerm || this.searchTerm.trim() === '') {
      // If search is empty, show all clients
      this.filteredClientes = [...this.allClientes];
    } else {
      // Filter based on client name (case-insensitive)
      this.filteredClientes = this.allClientes.filter(cliente =>
        cliente.nome.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }
    console.log(`Filtering complete. Showing ${this.filteredClientes.length} of ${this.allClientes.length} clients.`);
  }
  // --- End Search Functionality ---


  async confirmRemoveClient(client: Cliente, slidingItem?: IonItemSliding): Promise<void> {
     if (slidingItem) {
       await slidingItem.close();
     }

     if (!client || !client.id) {
         console.error("Invalid client object passed to confirmRemoveClient");
         return;
     }

     try {
         const { value } = await Dialog.confirm({
             title: 'Confirmar Exclusão',
             message: `Tem certeza que deseja excluir o cliente "${client.nome}" e todos os seus orçamentos associados? Esta ação não pode ser desfeita.`,
             okButtonTitle: 'Excluir',
             cancelButtonTitle: 'Cancelar',
         });

         if (value) {
             console.log(`User confirmed deletion for client: ${client.nome} (ID: ${client.id})`);
             await this.removeClient(client);
         } else {
             console.log(`User cancelled deletion for client: ${client.nome}`);
         }
     } catch (e) {
         console.error("Error displaying confirmation dialog:", e);
     }
  }

  private async removeClient(client: Cliente): Promise<void> {
      this.isLoading = true;
      try {
          const success = await this.clientesService.removeClient(client);
          if (success) {
              console.log(`Client ${client.nome} successfully removed from service.`);
              // Remove from both lists
              this.allClientes = this.allClientes.filter(c => c.id !== client.id);
              this.filterClients(); // Re-apply filter to update the displayed list
              // Optional success message
              // await this.mostrarAlerta('Sucesso', `Cliente "${client.nome}" excluído.`);
          }
          // No else needed, service handles alerts on failure
      } catch (error: any) { // Catch specific type if possible
          console.error(`Error removing client ${client.nome}:`, error);
          await this.mostrarAlerta('Erro', `Ocorreu um erro ao tentar excluir o cliente: ${error.message || error}`);
      } finally {
          this.isLoading = false;
      }
  }


  async openPdf(pdfInfo: ClientePdfInfo): Promise<void> {
      console.log(`Attempting to open PDF: ${pdfInfo.uri}`);
      if (!pdfInfo.uri) {
          await this.mostrarAlerta('Erro', 'URI do PDF inválido ou ausente.');
          return;
      }
      try {
          await FileOpener.open({
              filePath: pdfInfo.uri,
              contentType: 'application/pdf',
          });
           console.log('FileOpener open call succeeded.');
      } catch (e: any) {
          console.error('Error opening PDF with FileOpener:', e);
          let errorMessage = 'Não foi possível abrir o arquivo PDF.';
          if (e.message?.includes('Activity not found') || e.message?.includes('No application found')) {
              errorMessage = 'Nenhum aplicativo encontrado para abrir arquivos PDF. Por favor, instale um visualizador de PDF.';
          } else if (e.message) {
              errorMessage += ` Detalhes: ${e.message}`;
          }
          await this.mostrarAlerta('Erro ao Abrir', errorMessage);
      }
  }

  // *** MODIFIED sharePdf function ***
  async sharePdf(pdfInfo: ClientePdfInfo, cliente: Cliente): Promise<void> { // Added cliente parameter
       console.log(`Attempting to share PDF: ${pdfInfo.uri} for client ${cliente?.nome}`);
       if (!pdfInfo.uri) {
           await this.mostrarAlerta('Erro', 'URI do PDF inválido ou ausente para compartilhamento.');
           return;
       }
        if (!cliente) {
            await this.mostrarAlerta('Erro', 'Informação do cliente ausente para compartilhamento.');
            return;
        }

       // --- Prepare share data (similar to OrcamentosComponent) ---
       const dadosEmpresaString = localStorage.getItem('dadosEmpresa');
       let nomeEmpresa = 'Sua Empresa'; // Default company name
       if (dadosEmpresaString) {
           try {
               const dadosEmpresa: DadosEmpresa = JSON.parse(dadosEmpresaString);
               nomeEmpresa = dadosEmpresa.nome || nomeEmpresa;
           } catch { /* ignore parsing error, use default */ }
       }

       // Extract the budget number from the filename (assuming format orcamento_NUMERO.pdf)
       let numeroOrcamento = pdfInfo.fileName.replace('orcamento_', '').replace('.pdf', '');
       const subject = `Orçamento Nº ${numeroOrcamento} - ${nomeEmpresa}`;

       // Use template literals for easier formatting
       const text = `Olá ${cliente.nome || 'Cliente'},

Conforme solicitado, segue em anexo o orçamento Nº ${numeroOrcamento} (${pdfInfo.fileName}).

Qualquer dúvida, estamos à disposição.

Atenciosamente,
${nomeEmpresa}`;


       // --- Share ---
       try {
         console.log(`Attempting to share PDF via Share plugin: ${pdfInfo.uri}`);
         const shareResult = await Share.share({
           title: subject,
           text: text,
           url: pdfInfo.uri, // Use the URI from Filesystem write/load result
           dialogTitle: 'Compartilhar Orçamento via...'
         });
          console.log('Share dialog action completed. Result:', shareResult);
       } catch (e: any) {
         console.error('Error sharing PDF:', e);
         if (e.message?.includes('Share cancelled') || e.code === 'CANCELLED' || e.message?.includes('Activity was cancelled')) {
             console.log('Share cancelled by user.');
             // Optionally inform user: await this.mostrarAlerta('Cancelado', 'Compartilhamento cancelado.');
         } else {
             await this.mostrarAlerta('Erro ao Compartilhar', `Não foi possível iniciar o compartilhamento. ${e.message || ''}`);
         }
       }
  }

   async mostrarAlerta(titulo: string, mensagem: string): Promise<void> {
    try {
        await Dialog.alert({
          title: titulo,
          message: mensagem,
          buttonTitle: 'OK'
        });
    } catch (e) {
        console.error('Capacitor Dialog error, logging to console:', e);
        console.log(`ALERT: ${titulo} - ${mensagem}`);
    }
  }
}
