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

  constructor() {
     // Initial load happens in loadClientes, called where needed
  }

  private getClientesFilePath(): string {
    // Path within the chosen directory
    return `data/${this.CLIENTES_FILE}`;
  }

  // --- File System Operations ---

  async loadClientes(): Promise<Cliente[]> {
    // Avoid reloading if already loaded (simple caching)
    // Note: This might cause issues if data is modified externally.
    // Consider adding a forceReload option if needed.
    if (this.clientes.length > 0) {
        return [...this.clientes]; // Return a copy
    }

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
      console.log(`Loaded ${this.clientes.length} clients.`);
      return [...this.clientes]; // Return a copy

    } catch (e: any) {
      // Handle common "file not found" errors gracefully
      if (e.message?.includes('No such file') || e.message?.includes('File does not exist') || e.message?.includes('The file “clientes.json” couldn’t be opened')) {
        console.log('Clients file not found, initializing empty list.');
        this.clientes = [];
        return [];
      } else {
        // Log other errors and show an alert
        console.error('Error loading clients:', e);
        await this.mostrarAlerta('Erro de Carga', `Não foi possível carregar os dados dos clientes: ${e.message || 'Erro desconhecido'}`);
        // Return empty array to allow app to continue, but data is missing
        this.clientes = [];
        return [];
      }
    }
  }

  async saveClientes(): Promise<void> {
     console.log(`Saving ${this.clientes.length} clients to ${this.DATA_DIRECTORY}/${this.getClientesFilePath()}`);
    try {
      // Ensure the directory exists (recursive: true creates parent directories if needed)
       const directoryPath = this.getClientesFilePath().substring(0, this.getClientesFilePath().lastIndexOf('/'));
        if (directoryPath) { // Only try to create directory if path has a directory part
             try {
                 await Filesystem.mkdir({
                     path: directoryPath,
                     directory: this.DATA_DIRECTORY,
                     recursive: true
                 });
                 console.log(`Ensured directory ${directoryPath} exists.`);
             } catch (e: any) {
                  // Ignore "file already exists" errors which are expected if directory exists
                  if (!e.message?.includes("file already exists") && !e.message?.includes("Folder exists") && !e.message?.includes("already exists")) {
                      console.warn(`Could not create directory ${directoryPath}:`, e);
                      // Proceed with writeFile anyway, it might handle it or fail there
                  }
             }
        }

      // Write the file
      await Filesystem.writeFile({
        path: this.getClientesFilePath(),
        directory: this.DATA_DIRECTORY,
        data: JSON.stringify(this.clientes, null, 2), // Pretty print JSON for readability
        encoding: Encoding.UTF8,
        recursive: true // Creates directories if they don't exist
      });
       console.log('Clients saved successfully.');
    } catch (e: any) { // Catch specific type if possible, otherwise 'any'
      console.error('Error saving clients:', e);
       await this.mostrarAlerta('Erro ao Salvar', `Não foi possível salvar os dados dos clientes: ${e.message || e}`);
    }
  }

  // --- Client Management ---

  async findOrCreateClient(orcamento: { cliente: string; telefone: string; email: string; }): Promise<Cliente | null> {
      // Ensure clients are loaded
      if (this.clientes.length === 0) {
          await this.loadClientes();
      }

      const { cliente: nomeOrcamento, telefone: telefoneOrcamento, email: emailOrcamento } = orcamento;

      // Normalize inputs (trim whitespace, maybe lowercase for case-insensitive matching)
      const searchName = nomeOrcamento?.trim();
      const searchPhone = telefoneOrcamento?.trim();
      const searchEmail = emailOrcamento?.trim().toLowerCase();

      if (!searchName) {
          console.error("Client name is required to find or create.");
          await this.mostrarAlerta("Erro", "Nome do cliente não pode estar vazio.");
          return null; // Cannot proceed without a name
      }

      // Try to find an existing client based on name AND at least one matching contact detail
      // This logic might need adjustment based on exact requirements (e.g., allow match on name only?)
      let existingClient = this.clientes.find(c => {
          const clientName = c.nome?.trim();
          const clientPhone = c.telefone?.trim();
          const clientEmail = c.email?.trim().toLowerCase();

          // Match if names are the same AND either phone or email also matches (if provided)
          return clientName === searchName &&
                 ((!!searchPhone && clientPhone === searchPhone) || (!!searchEmail && clientEmail === searchEmail));
      });

      // If no match with contact details, try matching by name only (if contacts were empty)
      if (!existingClient && !searchPhone && !searchEmail) {
          existingClient = this.clientes.find(c => c.nome?.trim() === searchName);
      }

      if (existingClient) {
          console.log(`Found existing client: ${existingClient.nome} (ID: ${existingClient.id})`);
          // Optionally update contact info if the new orcamento has more details?
          // existingClient.telefone = existingClient.telefone || searchPhone;
          // existingClient.email = existingClient.email || searchEmail;
          return existingClient;
      } else {
          console.log(`Client not found for "${searchName}". Creating new client.`);
          // Create a new client
          const newClient: Cliente = {
              // Generate a more robust unique ID
              id: this.generateUUID(),
              nome: searchName,
              telefone: searchPhone || undefined, // Store as undefined if empty
              email: searchEmail || undefined,   // Store as undefined if empty
              pdfs: [] // Start with an empty array of PDFs
          };
          this.clientes.push(newClient);
          // No save here, the caller (e.g., OrcamentosComponent) should call saveClientes
          // after successfully adding the PDF link to this new client.
          return newClient;
      }
  }

  async addPdfToClient(client: Cliente, pdfInfo: ClientePdfInfo): Promise<boolean> {
      // Find the client *in the service's current list* using a unique ID
      const clientInList = this.clientes.find(c => c.id === client.id);

      if (!clientInList) {
          console.error(`Client with ID ${client.id} (${client.nome}) not found in the service list. Cannot add PDF.`);
          await this.mostrarAlerta('Erro Interno', 'Falha ao localizar o cliente para vincular o PDF. Tente salvar o orçamento novamente.');
          return false; // Indicate failure
      }

      // Check if this PDF URI is already linked to avoid duplicates
      const pdfExists = clientInList.pdfs.some(pdf => pdf.uri === pdfInfo.uri);
      if (!pdfExists) {
          clientInList.pdfs.push(pdfInfo);
          console.log(`Added PDF "${pdfInfo.fileName}" to client "${clientInList.nome}" (ID: ${clientInList.id})`);
          // The caller (e.g., OrcamentosComponent) is responsible for calling saveClientes
          return true; // Indicate success
      } else {
          console.log(`PDF "${pdfInfo.fileName}" already linked to client "${clientInList.nome}". Skipping.`);
          return true; // Indicate success (already done)
      }
  }

   async addClient(newClientData: { nome: string; telefone?: string; email?: string; }): Promise<Cliente | null> {
        const nome = newClientData.nome?.trim();
        if (!nome) {
            await this.mostrarAlerta('Aviso', 'Nome do cliente é obrigatório.');
            return null;
        }
         // Ensure clients are loaded
        await this.loadClientes(); // Load if not already loaded

        // Optional: Check if a client with the same name/details already exists
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
        await this.saveClientes(); // Save immediately after adding
        console.log(`Added new client: ${clientToAdd.nome} (ID: ${clientToAdd.id})`);
        return clientToAdd; // Return the newly added client
   }

   async removeClient(clientToRemove: Cliente): Promise<boolean> {
       if (!clientToRemove || !clientToRemove.id) {
           console.error('Cannot remove client: Invalid client object or missing ID.');
           await this.mostrarAlerta('Erro Interno', 'Não foi possível identificar o cliente para remover.');
           return false;
       }

       // Ensure clients are loaded
       await this.loadClientes(); // Load if needed

       const initialLength = this.clientes.length;
       const clientIndex = this.clientes.findIndex(c => c.id === clientToRemove.id);

       if (clientIndex === -1) {
           console.warn(`Attempted to remove client not found in the service list (ID: ${clientToRemove.id}).`);
           // Optionally show an alert, or just return false
           // await this.mostrarAlerta('Aviso', 'Cliente não encontrado para remoção.');
           return false;
       }

       // --- Delete Associated PDF Files ---
       console.log(`Deleting ${clientToRemove.pdfs.length} associated PDFs for client ${clientToRemove.nome}...`);
       let pdfDeletionErrors = false;
       for (const pdfInfo of clientToRemove.pdfs) {
           try {
               // IMPORTANT: Filesystem URIs often represent paths *within* the app's data directory.
               // We need to extract the relative path from the URI to use with Filesystem.deleteFile.
               // This assumes the URI format is consistent (e.g., starts with 'file://' or similar).
               // A more robust approach might store the relative path alongside the URI when saving.

               // Example URI parsing (adjust based on actual URI format from Capacitor):
               let relativePathToDelete: string | undefined;
               if (pdfInfo.uri.startsWith('file://')) {
                   // Find the part after the app's data directory root. This is tricky and platform-dependent.
                   // A simpler, often effective way if files are stored directly in 'data/pdfs/' etc.
                   // is to just use the filename IF the service controls the storage location.
                   // Assuming pdfInfo.fileName IS the relative path within DATA_DIRECTORY for simplicity here.
                   // **THIS MIGHT NEED ADJUSTMENT BASED ON HOW URIs ARE GENERATED/STORED**
                   // A better approach is to store the relative path explicitly when creating the PDF link.
                   // For now, we try using the fileName, assuming it's within a known subfolder like 'pdfs'.
                   // Let's assume files are saved in 'data/pdfs/' relative to Directory.Data
                   const assumedPdfPath = `pdfs/${pdfInfo.fileName}`; // Adjust subfolder if needed

                   const deleteOptions: DeleteFileOptions = {
                       path: assumedPdfPath, // Use the assumed relative path
                       directory: this.DATA_DIRECTORY
                   };
                   console.log(`Attempting to delete file: ${deleteOptions.directory}/${deleteOptions.path}`);
                   await Filesystem.deleteFile(deleteOptions);
                   console.log(`Deleted PDF file: ${pdfInfo.fileName}`);

               } else {
                    console.warn(`Cannot determine relative path from URI to delete file: ${pdfInfo.uri}`);
                    // If URIs are content:// URIs, deletion might not be possible/allowed directly.
               }

           } catch (e: any) {
               console.error(`Error deleting PDF file ${pdfInfo.fileName} (URI: ${pdfInfo.uri}):`, e);
               // Don't stop the client removal, but log the error.
               pdfDeletionErrors = true;
               // Optionally, inform the user about file deletion issues.
           }
       }
       if (pdfDeletionErrors) {
            await this.mostrarAlerta('Aviso', 'Não foi possível excluir um ou mais arquivos PDF associados ao cliente. Eles podem precisar ser removidos manualmente.');
       }
       // --- End PDF Deletion ---


       // Remove client from the array
       this.clientes.splice(clientIndex, 1);
       console.log(`Removed client: ${clientToRemove.nome} (ID: ${clientToRemove.id})`);

       // Save the updated list
       await this.saveClientes();
       return true; // Indicate success
   }


   // --- Utility Methods ---

   getClientes(): Cliente[] {
       // Return a *copy* to prevent external modification of the internal array
       return [...this.clientes];
   }

   // Simple UUID generator (good enough for client-side IDs)
   private generateUUID(): string {
       return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
           const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
           return v.toString(16);
       });
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
            // Fallback for environments where Dialog might not be available (e.g., some web contexts)
            console.error('Capacitor Dialog error, logging to console:', e);
            console.log(`ALERT: ${titulo} - ${mensagem}`);
            // alert(`${titulo}\n${mensagem}`); // Avoid browser alert if possible
        }
      }
}
