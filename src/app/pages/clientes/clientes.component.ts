import { Component, OnInit, OnDestroy } from '@angular/core';
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
  IonCardSubtitle,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonIcon,
  IonButtons,
  IonBackButton,
  IonFab,
  IonFabButton,
  IonSpinner, // Added for loading indicator
  IonItemSliding, // Added for slide-to-delete option
  IonItemOptions, // Added for slide-to-delete option
  IonItemOption   // Added for slide-to-delete option
} from '@ionic/angular/standalone';
import { FileOpener } from '@capacitor-community/file-opener';
import { Share } from '@capacitor/share';
import { Dialog } from '@capacitor/dialog';
import { addIcons } from 'ionicons';
import { documentAttachOutline, shareOutline, addOutline, trashOutline, closeCircleOutline, createOutline, saveOutline, openOutline, peopleOutline } from 'ionicons/icons'; // Added trash, close, edit icons

// Import the service and interfaces
import { ClientesService, Cliente, ClientePdfInfo } from '../../services/clientes.service';
import { Subscription } from 'rxjs'; // If using Observables later

// Add icons used in the template
addIcons({ documentAttachOutline, shareOutline, addOutline, trashOutline, closeCircleOutline, createOutline });


@Component({
  selector: 'app-clientes',
  templateUrl: './clientes.component.html',
  styleUrls: ['./clientes.component.scss'], // Link the SCSS file
  standalone: true,
  imports: [
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
    IonInput,
    IonButtons,
    IonBackButton,
    IonFab,
    IonFabButton,
    IonSpinner, // Added
    IonItemSliding, // Added
    IonItemOptions, // Added
    IonItemOption   // Added
  ],
})
export class ClientesComponent implements OnInit, OnDestroy {
  clientes: Cliente[] = [];
  isLoading = false; // Flag for loading indicator
  showAddClientForm = false;
  newClientName: string = '';
  newClientPhone: string = '';
  newClientEmail: string = '';

  // Optional: Subscription management if using observables
  // private clientesSubscription: Subscription | undefined;

  constructor(private clientesService: ClientesService) {
      // Icons are added globally via addIcons now
      addIcons({saveOutline,closeCircleOutline,documentAttachOutline,openOutline,shareOutline,trashOutline,peopleOutline,addOutline});
  }

  ngOnInit() {
    console.log('ClientesComponent ngOnInit');
    // Don't await here, let ionViewWillEnter handle initial load
    // to ensure it loads every time the view becomes active.
  }

  ngOnDestroy() {
    // Unsubscribe if using observables
    // this.clientesSubscription?.unsubscribe();
  }

  // Using IonViewWillEnter to refresh the list when navigating back to this page
  async ionViewWillEnter() {
      console.log('ClientesComponent ionViewWillEnter - refreshing list');
      await this.loadClientes();
  }

  async loadClientes(forceReload: boolean = false): Promise<void> {
    this.isLoading = true; // Show spinner
    try {
        // Call the service method (add forceReload if implemented in service)
        this.clientes = await this.clientesService.loadClientes(); // Assuming service handles caching or reloading logic
        console.log(`Clientes loaded in component: ${this.clientes.length}`);
    } catch (error) {
        console.error("Error loading clients in component:", error);
        await this.mostrarAlerta('Erro', 'Não foi possível carregar a lista de clientes.');
        this.clientes = []; // Ensure it's an empty array on error
    } finally {
        this.isLoading = false; // Hide spinner regardless of success/failure
    }
  }

  toggleAddClientForm(show?: boolean) {
    this.showAddClientForm = show !== undefined ? show : !this.showAddClientForm;
    // Reset form fields when hiding
    if (!this.showAddClientForm) {
      this.newClientName = '';
      this.newClientPhone = '';
      this.newClientEmail = '';
    }
  }

  async addClient() {
    if (!this.newClientName?.trim()) {
      await this.mostrarAlerta('Aviso', 'O nome do cliente é obrigatório.');
      return;
    }
    this.isLoading = true; // Indicate activity
    try {
        const addedClient = await this.clientesService.addClient({
          nome: this.newClientName,
          telefone: this.newClientPhone,
          email: this.newClientEmail
        });

        if (addedClient) {
             // Refresh list to show the new client
            await this.loadClientes(true); // Force reload might be needed if service caches aggressively
            this.toggleAddClientForm(false); // Hide the form on success
        }
        // If addedClient is null, the service likely showed an alert (e.g., duplicate)
    } catch (error) {
        console.error("Error adding client:", error);
        await this.mostrarAlerta('Erro', 'Não foi possível adicionar o cliente.');
    } finally {
        this.isLoading = false;
    }
  }

  async confirmRemoveClient(client: Cliente, slidingItem?: IonItemSliding): Promise<void> {
     if (slidingItem) {
       await slidingItem.close(); // Close the sliding item before showing dialog
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
         // Handle cases where the dialog might fail (less common)
     }
  }

  private async removeClient(client: Cliente): Promise<void> {
      this.isLoading = true;
      try {
          const success = await this.clientesService.removeClient(client);
          if (success) {
              console.log(`Client ${client.nome} successfully removed from service.`);
              // Refresh the local list *after* successful removal
              // Find the client in the local array and remove it directly for faster UI update
              const index = this.clientes.findIndex(c => c.id === client.id);
              if (index > -1) {
                  this.clientes.splice(index, 1);
              } else {
                  // If not found locally (shouldn't happen often), reload fully
                  await this.loadClientes(true);
              }
              await this.mostrarAlerta('Sucesso', `Cliente "${client.nome}" excluído.`); // Optional success message
          } else {
              console.warn(`Service indicated failure removing client ${client.nome}.`);
              // Service should have shown an error alert if needed
              // Optionally show a generic failure message here if the service doesn't always alert
              // await this.mostrarAlerta('Falha', 'Não foi possível remover o cliente.');
          }
      } catch (error) {
          console.error(`Error removing client ${client.nome}:`, error);
          await this.mostrarAlerta('Erro', `Ocorreu um erro ao tentar excluir o cliente: ${error}`);
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
          // Ensure the filePath uses the URI provided by Capacitor
          await FileOpener.open({
              filePath: pdfInfo.uri,
              contentType: 'application/pdf',
              // openWithDefault: true // Optional: Try to force default app
          });
           console.log('FileOpener open call succeeded.');
      } catch (e: any) {
          console.error('Error opening PDF with FileOpener:', e);
          let errorMessage = 'Não foi possível abrir o arquivo PDF.';
          // Provide more specific feedback if possible
          if (e.message?.includes('Activity not found') || e.message?.includes('No application found')) {
              errorMessage = 'Nenhum aplicativo encontrado para abrir arquivos PDF. Por favor, instale um visualizador de PDF.';
          } else if (e.message) {
              errorMessage += ` Detalhes: ${e.message}`;
          }
          await this.mostrarAlerta('Erro ao Abrir', errorMessage);
      }
  }

  async sharePdf(pdfInfo: ClientePdfInfo): Promise<void> {
       console.log(`Attempting to share PDF: ${pdfInfo.uri}`);
       if (!pdfInfo.uri) {
           await this.mostrarAlerta('Erro', 'URI do PDF inválido ou ausente para compartilhamento.');
           return;
       }
       try {
         // Use the file URI directly with the Share plugin
         const shareResult = await Share.share({
           title: `Orçamento: ${pdfInfo.fileName}`,
           text: `Segue o orçamento ${pdfInfo.fileName}.`, // Customize text if needed
           url: pdfInfo.uri, // Pass the file URI
           dialogTitle: 'Compartilhar Orçamento via...'
         });
          console.log('Share dialog action completed. Result:', shareResult); // Result might be empty object {}
       } catch (e: any) {
         console.error('Error sharing PDF:', e);
         // Check for specific cancellation messages (these can vary by platform/plugin version)
         if (e.message?.includes('Share cancelled') || e.code === 'CANCELLED' || e.message?.includes('Activity was cancelled')) {
             console.log('Share cancelled by user.');
             // Optionally notify user or just log: await this.mostrarAlerta('Cancelado', 'Compartilhamento cancelado.');
         } else {
             await this.mostrarAlerta('Erro ao Compartilhar', `Não foi possível iniciar o compartilhamento. ${e.message || ''}`);
         }
       }
  }

   // Helper for alerts
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
