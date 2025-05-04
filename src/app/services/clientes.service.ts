// src/app/services/clientes.service.ts
import { Injectable } from '@angular/core';
import { Filesystem, Directory, Encoding, DeleteFileOptions } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { Dialog } from '@capacitor/dialog';

// Define interfaces (can be in a shared file or here)
export interface ClientePdfInfo {
  fileName: string; // e.g., "orcamento_0005.pdf"
  uri: string;      // Capacitor URI to the file
}

export interface Cliente {
  id?: string; // Unique identifier
  nome: string;
  telefone?: string;
  email?: string;
  pdfs: ClientePdfInfo[]; // Array of PDFs associated with this client
}

@Injectable({
  providedIn: 'root'
})
export class ClientesService {
  private clientes: Cliente[] = [];
  private readonly CLIENTES_FILE = 'clientes.json';
  private readonly DATA_DIRECTORY = Directory.Data; // Use Directory.Data for app-specific data
  private isLoading: boolean = false; // Flag to prevent concurrent loads
  private hasLoaded: boolean = false; // Flag to check if initial load happened

  constructor() {
     // Initial load is triggered when needed
  }

  private getClientesFilePath(): string {
    // Path within the chosen directory
    return `data/${this.CLIENTES_FILE}`;
  }

  // --- File System Operations ---

  async loadClientes(forceReload: boolean = false): Promise<Cliente[]> {
    // Prevent concurrent loading and redundant loading
    if (this.isLoading || (this.hasLoaded && !forceReload)) {
        console.log('LoadClientes: Skipping load (already loading or loaded).');
        return [...this.clientes];
    }

    this.isLoading = true;
    console.log(`Loading clients from ${this.DATA_DIRECTORY}/${this.getClientesFilePath()}`);
    try {
      // Check if the file exists first using stat
      await Filesystem.stat({
        path: this.getClientesFilePath(),
        directory: this.DATA_DIRECTORY,
      });

      // File exists, read it
      const result = await Filesystem.readFile({
        path: this.getClientesFilePath(),
        directory: this.DATA_DIRECTORY,
        encoding: Encoding.UTF8,
      });

      this.clientes = JSON.parse(result.data.toString()) as Cliente[];
      this.hasLoaded = true; // Mark as loaded
      console.log(`Loaded ${this.clientes.length} clients.`);


    } catch (e: any) {
      if (e.message?.includes('No such file') || e.message?.includes('File does not exist') || e.message?.includes('The file “clientes.json” couldn’t be opened')) {
        console.log('Clients file not found, initializing empty list.');
        this.clientes = [];
        this.hasLoaded = true; // Mark as loaded (with empty data)
      } else {
        console.error('Error loading clients:', e);
        await this.mostrarAlerta('Erro de Carga', `Não foi possível carregar os dados dos clientes: ${e.message || 'Erro desconhecido'}`);
        this.clientes = []; // Ensure it's an empty array on error
        // Do not set hasLoaded to true on critical errors? Or set it? Decided to set it to avoid reload loops.
        this.hasLoaded = true;
      }
    } finally {
        this.isLoading = false; // Release loading flag
    }
    return [...this.clientes]; // Return a copy
  }

  async saveClientes(): Promise<void> {
     console.log(`Saving ${this.clientes.length} clients to ${this.DATA_DIRECTORY}/${this.getClientesFilePath()}`);
    try {
      const directoryPath = this.getClientesFilePath().substring(0, this.getClientesFilePath().lastIndexOf('/'));
        if (directoryPath) {
             try {
                 await Filesystem.mkdir({
                     path: directoryPath,
                     directory: this.DATA_DIRECTORY,
                     recursive: true
                 });
                 console.log(`Ensured directory ${directoryPath} exists.`);
             } catch (e: any) {
                  if (!e.message?.includes("file already exists") && !e.message?.includes("Folder exists") && !e.message?.includes("already exists")) {
                      console.warn(`Could not create directory ${directoryPath}:`, e);
                  }
             }
        }

      await Filesystem.writeFile({
        path: this.getClientesFilePath(),
        directory: this.DATA_DIRECTORY,
        data: JSON.stringify(this.clientes, null, 2),
        encoding: Encoding.UTF8,
        recursive: true
      });
       console.log('Clients saved successfully.');
    } catch (e: any) {
      console.error('Error saving clients:', e);
       await this.mostrarAlerta('Erro ao Salvar', `Não foi possível salvar os dados dos clientes: ${e.message || e}`);
    }
  }

  // --- Client Management ---

  async findOrCreateClient(orcamento: { cliente: string; telefone: string; email: string; }): Promise<Cliente | null> {
      // Ensure clients are loaded before proceeding
      await this.loadClientes();

      const { cliente: nomeOrcamento, telefone: telefoneOrcamento, email: emailOrcamento } = orcamento;
      const searchName = nomeOrcamento?.trim();
      const searchPhone = telefoneOrcamento?.trim();
      const searchEmail = emailOrcamento?.trim().toLowerCase();

      if (!searchName) {
          console.error("Client name is required to find or create.");
          await this.mostrarAlerta("Erro", "Nome do cliente não pode estar vazio.");
          return null;
      }

      let existingClient = this.clientes.find(c => {
          const clientName = c.nome?.trim();
          const clientPhone = c.telefone?.trim();
          const clientEmail = c.email?.trim().toLowerCase();

          return clientName === searchName &&
                 ((!!searchPhone && clientPhone === searchPhone) || (!!searchEmail && clientEmail === searchEmail));
      });

      if (!existingClient && !searchPhone && !searchEmail) {
          existingClient = this.clientes.find(c => c.nome?.trim() === searchName);
      }

      if (existingClient) {
          console.log(`Found existing client: ${existingClient.nome} (ID: ${existingClient.id})`);
          return existingClient;
      } else {
          console.log(`Client not found for "${searchName}". Creating new client.`);
          const newClient: Cliente = {
              id: this.generateUUID(),
              nome: searchName,
              telefone: searchPhone || undefined,
              email: searchEmail || undefined,
              pdfs: []
          };
          this.clientes.push(newClient);
          // Important: Don't save here. Let the caller save after linking the PDF.
          return newClient;
      }
  }

  async addPdfToClient(client: Cliente, pdfInfo: ClientePdfInfo): Promise<boolean> {
      // No need to load here, assume client object is valid and list is loaded by caller context
      const clientInList = this.clientes.find(c => c.id === client.id);

      if (!clientInList) {
          console.error(`Client with ID ${client.id} (${client.nome}) not found in the service list. Cannot add PDF.`);
          await this.mostrarAlerta('Erro Interno', 'Falha ao localizar o cliente para vincular o PDF. Tente salvar o orçamento novamente.');
          return false;
      }

      const pdfExists = clientInList.pdfs.some(pdf => pdf.uri === pdfInfo.uri);
      if (!pdfExists) {
          clientInList.pdfs.push(pdfInfo);
          console.log(`Added PDF "${pdfInfo.fileName}" to client "${clientInList.nome}" (ID: ${clientInList.id})`);
          // Caller is responsible for calling saveClientes
          return true;
      } else {
          console.log(`PDF "${pdfInfo.fileName}" already linked to client "${clientInList.nome}". Skipping.`);
          return true;
      }
  }

   async addClient(newClientData: { nome: string; telefone?: string; email?: string; }): Promise<Cliente | null> {
        const nome = newClientData.nome?.trim();
        if (!nome) {
            await this.mostrarAlerta('Aviso', 'Nome do cliente é obrigatório.');
            return null;
        }
        await this.loadClientes(); // Ensure loaded

        const existing = this.clientes.find(c =>
            c.nome === nome &&
            c.telefone === (newClientData.telefone || undefined) &&
            c.email === (newClientData.email || undefined)
        );
        if (existing) {
            await this.mostrarAlerta('Aviso', 'Um cliente com estes dados já existe.');
            return null;
        }

        const clientToAdd: Cliente = {
             id: this.generateUUID(),
             nome: nome,
             telefone: newClientData.telefone?.trim() || undefined,
             email: newClientData.email?.trim() || undefined,
             pdfs: []
        };
        this.clientes.push(clientToAdd);
        await this.saveClientes(); // Save immediately
        return clientToAdd;
   }

   async removeClient(clientToRemove: Cliente): Promise<boolean> {
       if (!clientToRemove || !clientToRemove.id) {
           console.error('Cannot remove client: Invalid client object or missing ID.');
           await this.mostrarAlerta('Erro Interno', 'Não foi possível identificar o cliente para remover.');
           return false;
       }

       await this.loadClientes(); // Ensure loaded

       const clientIndex = this.clientes.findIndex(c => c.id === clientToRemove.id);

       if (clientIndex === -1) {
           console.warn(`Attempted to remove client not found (ID: ${clientToRemove.id}).`);
           return false;
       }

       // Clone the pdfs array before modifying the client list
       const pdfsToDelete = [...this.clientes[clientIndex].pdfs];
       const clientNameForLog = this.clientes[clientIndex].nome; // Get name before splice

       // Remove client from the array FIRST
       this.clientes.splice(clientIndex, 1);
       console.log(`Removed client: ${clientNameForLog} (ID: ${clientToRemove.id}) from list.`);

        // Save the updated list immediately *before* attempting file deletions
       await this.saveClientes();
       console.log('Client list saved after removal.');


       // --- Now, attempt to Delete Associated PDF Files ---
       console.log(`Attempting to delete ${pdfsToDelete.length} associated PDFs for removed client ${clientNameForLog}...`);
       let pdfDeletionErrors = false;
       for (const pdfInfo of pdfsToDelete) {
           try {
               // *** IMPORTANT REVISION FOR PDF DELETION ***
               // Assume the PDF file is stored within a known subdirectory relative to Directory.Data
               // Example: If orcamentos are saved in 'pdfs/', the path would be 'pdfs/filename.pdf'
               // Adjust 'pdfs/' if you use a different subfolder name.
               const assumedPdfPath = `pdfs/${pdfInfo.fileName}`; // <--- ADJUST 'pdfs/' IF NEEDED

               const deleteOptions: DeleteFileOptions = {
                   path: assumedPdfPath,
                   directory: this.DATA_DIRECTORY
               };
               console.log(`Attempting to delete file: ${deleteOptions.directory}/${deleteOptions.path}`);
               await Filesystem.deleteFile(deleteOptions);
               console.log(`Successfully deleted PDF file: ${pdfInfo.fileName}`);

           } catch (e: any) {
                // Check for file not found errors specifically, which might be okay if manually deleted
                if (e.message?.includes('No such file') || e.message?.includes('File does not exist')) {
                    console.warn(`PDF file not found during deletion (may have been removed manually): ${pdfInfo.fileName}`);
                } else {
                    console.error(`Error deleting PDF file ${pdfInfo.fileName} (Path: ${this.DATA_DIRECTORY}/pdfs/${pdfInfo.fileName}):`, e);
                    pdfDeletionErrors = true; // Mark that *some* error occurred
                }
           }
       }
       if (pdfDeletionErrors) {
            await this.mostrarAlerta('Aviso de Limpeza', 'Não foi possível excluir um ou mais arquivos PDF associados ao cliente removido. Verifique o armazenamento do aplicativo se necessário.');
       }
       // --- End PDF Deletion ---

       return true; // Indicate success (client removed from list, attempted file cleanup)
   }


   // --- Utility Methods ---

   getClientes(): Cliente[] {
       // Return a *copy* to prevent external modification of the internal array
       return [...this.clientes];
   }

   // <<< NEW: Method to get total client count >>>
   /**
    * Returns the current number of clients loaded in the service.
    * Ensure loadClientes() has been called at least once before relying on this.
    */
   getTotalClientes(): number {
       return this.clientes.length;
   }

   // <<< NEW: Method to get total budget (PDF) count >>>
   /**
    * Returns the total number of PDFs across all clients loaded in the service.
    * Ensure loadClientes() has been called at least once before relying on this.
    */
   getTotalOrcamentos(): number {
       return this.clientes.reduce((total, cliente) => total + cliente.pdfs.length, 0);
   }

   private generateUUID(): string {
       return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
           const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
           return v.toString(16);
       });
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
