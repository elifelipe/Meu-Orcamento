// src/app/orcamentos/orcamentos.component.ts
import { Component, OnInit } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

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
  IonIcon,
  IonButtons,
  IonBackButton
} from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';

// Import Capacitor Filesystem, FileOpener, and Share plugins
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { FileOpener } from '@capacitor-community/file-opener';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
// Dialog import is not needed here as it's handled by the service

// Import the Clientes Service and its interfaces
import { ClientesService, ClientePdfInfo, Cliente } from '../../services/clientes.service';


// Definições de interfaces
interface DadosEmpresa {
  nome: string;
  endereco: string;
  cidade: string;
  estado: string;
  telefone1: string;
  telefone2: string;
  email: string;
}

interface ItemOrcamento {
  quantidade: number;
  descricao: string;
  valorUnitario: number;
  valorTotal: number;
}

interface Orcamento {
  numero: string;
  data: string;
  dataVencimento: string;
  cliente: string;
  telefone: string;
  email: string;
  itens: ItemOrcamento[];
  valorTotal: number;
}

interface FileInfo {
  uri: string;
  path: string; // Relative path within the directory
  directory: Directory; // The directory enum
  fileName: string; // Just the file name
}


@Component({
  selector: 'app-orcamentos',
  templateUrl: 'orcamentos.component.html',
  styleUrls: ['orcamentos.component.scss'],
  standalone: true,
  imports: [
    IonHeader,
    IonIcon,
    IonContent,
    CommonModule,
    FormsModule,
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
    IonButtons,
    MatFormFieldModule,
    MatInputModule,
    IonBackButton
  ],
})
export class OrcamentosComponent implements OnInit {
  proximoNumero: number = 1;
  orcamento: Orcamento = this.inicializarOrcamento();

  // Inject the ClientesService
  constructor(private clientesService: ClientesService) {}

  async ngOnInit(): Promise<void> {
    console.log('OrcamentosComponent ngOnInit started');

    // Load next budget number from localStorage
    const ultimoNumero = localStorage.getItem('proximoNumeroOrcamento');
    if (ultimoNumero) {
        this.proximoNumero = parseInt(ultimoNumero, 10);
    } else {
        // If not set, initialize it
        localStorage.setItem('proximoNumeroOrcamento', this.proximoNumero.toString());
    }

    this.orcamento.numero = this.formatarNumeroOrcamento(this.proximoNumero);

    // Optional: Pre-load clients if needed, though service handles lazy loading
    // await this.clientesService.loadClientes();

    console.log('OrcamentosComponent ngOnInit finished');
  }

  inicializarOrcamento(): Orcamento {
    const numeroAtual = this.proximoNumero || 1;
    const hoje = new Date();
    const dataVencimento = new Date(hoje);
    dataVencimento.setDate(hoje.getDate() + 30); // 30 days from now

    return {
      numero: this.formatarNumeroOrcamento(numeroAtual),
      data: this.formatarData(hoje),
      dataVencimento: this.formatarData(dataVencimento),
      cliente: '',
      telefone: '',
      email: '',
      itens: [this.criarItemVazio()],
      valorTotal: 0,
    };
  }

  formatarData(data: Date): string {
    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const ano = data.getFullYear();
    // Ensure LaTeX format is not used here if it's meant for display, adjust if needed
    return `${dia}/${mes}/${ano}`;
  }


  formatarNumeroOrcamento(numero: number): string {
    return numero.toString().padStart(4, '0');
  }

  criarItemVazio(): ItemOrcamento {
    return {
      quantidade: 1,
      descricao: '',
      valorUnitario: 0,
      valorTotal: 0,
    };
  }

  adicionarItem(): void {
    this.orcamento.itens.push(this.criarItemVazio());
  }

  removerItem(index: number): void {
    if (this.orcamento.itens.length > 1) {
      this.orcamento.itens.splice(index, 1);
      this.calcularTotais();
    }
  }

  atualizarItem(item: ItemOrcamento): void {
    item.quantidade = Number(item.quantidade) || 0;
    item.valorUnitario = Number(item.valorUnitario) || 0;
    item.valorTotal = item.quantidade * item.valorUnitario;
    this.calcularTotais();
  }

  calcularTotais(): void {
    this.orcamento.valorTotal = this.orcamento.itens.reduce((total, item) => {
        const itemTotal = Number(item.valorTotal) || 0;
        return total + itemTotal;
    }, 0);
  }


  novoOrcamento(): void {
    // Consider adding a confirmation dialog before clearing
    // import { Dialog } from '@capacitor/dialog';
    // const { value } = await Dialog.confirm({ title: 'Novo Orçamento', message: 'Deseja limpar o formulário atual e iniciar um novo orçamento?', okButtonTitle: 'Sim', cancelButtonTitle: 'Não'});
    // if (!value) return;

    this.proximoNumero++;
    localStorage.setItem('proximoNumeroOrcamento', this.proximoNumero.toString());
    this.orcamento = this.inicializarOrcamento();
    console.log(`Novo orçamento iniciado: Nº ${this.orcamento.numero}`);
  }

  // --- Funções de PDF ---

  private async savePdfToFile(): Promise<FileInfo | undefined> {
      const doc = new jsPDF();

      // --- Load company data and logo ---
      const dadosEmpresaString = localStorage.getItem('dadosEmpresa');
      const logoBase64 = localStorage.getItem('logoEmpresa');
      let dadosEmpresa: DadosEmpresa | null = null;

      if (dadosEmpresaString) {
          try {
              dadosEmpresa = JSON.parse(dadosEmpresaString);
          } catch (e) {
              console.error("Erro ao parsear dados da empresa do localStorage:", e);
              await this.clientesService.mostrarAlerta('Erro', 'Não foi possível carregar os dados da empresa.');
              return undefined;
          }
      } else {
          await this.clientesService.mostrarAlerta('Aviso', 'Dados da empresa não configurados. Por favor, configure na tela de Dados da Empresa.');
          // Use placeholder data or return
          return undefined; // Or use placeholder: dadosEmpresa = { ... };
      }

      // --- Add Logo ---
      if (logoBase64 && logoBase64.startsWith('data:image')) {
        try {
           doc.addImage(logoBase64, 'PNG', 10, 10, 30, 30); // Adjust position/size
        } catch (e) {
           console.error('Error adding logo to PDF:', e);
           // Don't fail the whole process for a logo error
        }
      }

      // --- Add Company Info ---
      doc.setFontSize(12);
      const companyInfoStartX = logoBase64 && logoBase64.startsWith('data:image') ? 50 : 10;
      const companyInfoStartY = 20;
      const lineHeight = 6;

      if (dadosEmpresa) {
          doc.text(`Empresa: ${dadosEmpresa.nome || 'N/A'}`, companyInfoStartX, companyInfoStartY);
          doc.text(`Endereço: ${dadosEmpresa.endereco || 'N/A'}`, companyInfoStartX, companyInfoStartY + lineHeight);
          doc.text(`Cidade/Estado: ${dadosEmpresa.cidade || 'N/A'} / ${dadosEmpresa.estado || 'N/A'}`, companyInfoStartX, companyInfoStartY + 2 * lineHeight);
          const telefones = [dadosEmpresa.telefone1, dadosEmpresa.telefone2].filter(Boolean).join(' / ');
          doc.text(`Telefone: ${telefones || 'N/A'}`, companyInfoStartX, companyInfoStartY + 3 * lineHeight);
          doc.text(`E-mail: ${dadosEmpresa.email || 'N/A'}`, companyInfoStartX, companyInfoStartY + 4 * lineHeight);
      }

      // --- Add Budget Details ---
      const budgetDetailsStartY = Math.max(companyInfoStartY + 5 * lineHeight, 60); // Start below company info
      doc.setFontSize(12);
      doc.text(`Orçamento Nº: ${this.orcamento.numero}`, 10, budgetDetailsStartY);
      // Use the already formatted date string
      doc.text(`Data: ${this.orcamento.data}`, 10, budgetDetailsStartY + lineHeight);
      doc.text(`Vencimento: ${this.orcamento.dataVencimento}`, 10, budgetDetailsStartY + 2 * lineHeight);

      // --- Add Client Info ---
      const clientInfoStartY = budgetDetailsStartY + 4 * lineHeight;
      doc.text(`Cliente: ${this.orcamento.cliente || 'N/A'}`, 10, clientInfoStartY);
      doc.text(`Telefone: ${this.orcamento.telefone || 'N/A'}`, 10, clientInfoStartY + lineHeight);
      doc.text(`E-mail: ${this.orcamento.email || 'N/A'}`, 10, clientInfoStartY + 2 * lineHeight);


      // --- Add Items Table ---
      const itens = this.orcamento.itens.map(item => [
        (Number(item.quantidade) || 0).toString(),
        item.descricao || '',
        `R$ ${(Number(item.valorUnitario) || 0).toFixed(2)}`,
        `R$ ${(Number(item.valorTotal) || 0).toFixed(2)}`
      ]);

      const tableStartY = clientInfoStartY + 4 * lineHeight;

      autoTable(doc, {
        head: [['Qtd', 'Descrição', 'Valor Unitário', 'Valor Total']],
        body: itens,
        startY: tableStartY,
        styles: { fontSize: 10 },
        theme: 'grid', // Optional: Add theme for better look
        margin: { top: 10 }
      });

      // --- Add Total Value ---
      const finalY = (doc as any).lastAutoTable.finalY || tableStartY + 10; // Get table end position
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold'); // Make total stand out
      const valorTotalNum = Number(this.orcamento.valorTotal) || 0;
      doc.text(`Valor Total: R$ ${valorTotalNum.toFixed(2)}`, 10, finalY + 15); // Position below table with spacing

      // --- Save PDF to File ---
      try {
        const pdfBase64 = doc.output('datauristring').split(',')[1];
        const fileName = `orcamento_${this.orcamento.numero}.pdf`;
        // *** Standardize on Directory.Data for app-internal files ***
        const targetDirectory = Directory.Data;
        const pdfSubdirectory = 'Orcamentos'; // Consistent subdirectory name
        const fullPath = `${pdfSubdirectory}/${fileName}`; // Relative path

        console.log(`Attempting to save PDF to: ${targetDirectory}/${fullPath}`);

        // Ensure the directory exists (recursive: true handles this)
        const result = await Filesystem.writeFile({
          path: fullPath,
          data: pdfBase64,
          directory: targetDirectory,
          recursive: true // Creates intermediate 'Orcamentos' directory if needed
        });

        console.log(`PDF file saved: Directory=${targetDirectory}, Path=${fullPath}, URI=${result.uri}`);

        const fileInfo: FileInfo = { uri: result.uri, path: fullPath, directory: targetDirectory, fileName: fileName };

        // --- Link the saved PDF to the client ---
        if (this.orcamento.cliente?.trim()) {
            console.log(`Attempting to find/create client: ${this.orcamento.cliente}`);
            // Pass the relevant client info from the current orcamento object
            const clientDataForService = {
                cliente: this.orcamento.cliente,
                telefone: this.orcamento.telefone,
                email: this.orcamento.email
            };
            const client = await this.clientesService.findOrCreateClient(clientDataForService);

            if (client && client.id) {
                console.log(`Client ${client.nome} (ID: ${client.id}) found/created. Attempting to link PDF: ${fileInfo.fileName}`);
                const pdfInfoToLink: ClientePdfInfo = {
                    fileName: fileInfo.fileName,
                    uri: fileInfo.uri // Use the capacitor URI
                };
                const linkSuccess = await this.clientesService.addPdfToClient(client, pdfInfoToLink);

                if (linkSuccess) {
                    console.log('PDF link successful. Saving client list changes.');
                    // ***** CRITICAL: Save the client list AFTER linking *****
                    await this.clientesService.saveClientes();
                    // **********************************************************
                } else {
                     console.error('Failed to link PDF to client (possibly duplicate). Client list changes related to this PDF link were not saved.');
                     // Alert is likely handled by service if it's an error, duplicate is okay.
                }
            } else {
                console.error('Failed to find or create a valid client. PDF not linked.');
                // Alert is handled by service
            }
        } else {
            console.log('Client name not provided in budget form. Skipping PDF linking.');
            await this.clientesService.mostrarAlerta('Aviso', 'O PDF foi salvo, mas não foi vinculado a nenhum cliente pois o nome não foi informado.');
        }
        // --- End Linking ---

        return fileInfo; // Return the FileInfo containing the URI

      } catch (error: any) {
        console.error('Error saving or linking PDF file:', error);
        await this.clientesService.mostrarAlerta('Erro ao Salvar', `Não foi possível salvar ou vincular o PDF. Detalhes: ${error.message || error}`);
        return undefined;
      }
  }

  async gerarPdfOrcamento(): Promise<void> {
    console.log('*** Executing gerarPdfOrcamento (Open PDF) ***');
    // Basic validation
    if (!this.orcamento.cliente?.trim()) {
       await this.clientesService.mostrarAlerta('Aviso', 'Por favor, preencha o nome do cliente antes de gerar o PDF.');
       return;
    }
    if (this.orcamento.itens.length === 0 || !this.orcamento.itens.some(item => item.descricao?.trim())) {
        await this.clientesService.mostrarAlerta('Aviso', 'Adicione pelo menos um item com descrição ao orçamento.');
        return;
    }

    const saveResult = await this.savePdfToFile(); // This handles saving, linking, and saving client list

    if (!saveResult) {
      console.error('PDF generation/saving/linking failed. Cannot open.');
      // Alert was shown in savePdfToFile
      return;
    }

    try {
      console.log(`Attempting to open PDF via FileOpener: ${saveResult.uri}`);
      await FileOpener.open({
        filePath: saveResult.uri, // Use the URI provided by Filesystem.writeFile
        contentType: 'application/pdf'
      });
      console.log('PDF opened successfully:', saveResult.uri);
      // Optional: Reset form after success
      // this.novoOrcamento(); // Consider if this is desired UX
    } catch (openError: any) {
      console.error('Erro ao abrir o PDF:', openError);
      // Provide specific feedback if possible
       let openErrorMessage = `O PDF foi salvo (${saveResult.fileName}), mas não foi possível abri-lo automaticamente.`;
       if (openError.message?.includes('Activity not found') || openError.message?.includes('No application found')) {
            openErrorMessage += ' Nenhum aplicativo leitor de PDF instalado?';
       } else {
            openErrorMessage += ` Detalhes: ${openError.message || 'Erro desconhecido'}`;
       }
       await this.clientesService.mostrarAlerta('Erro ao Abrir', openErrorMessage);
    }
  }

  async compartilharPdf(): Promise<void> {
      console.log('*** Executing compartilharPdf (Share PDF) ***');
       // Basic validation
      if (!this.orcamento.cliente?.trim()) {
         await this.clientesService.mostrarAlerta('Aviso', 'Por favor, preencha o nome do cliente antes de gerar o PDF para compartilhar.');
         return;
      }
      if (this.orcamento.itens.length === 0 || !this.orcamento.itens.some(item => item.descricao?.trim())) {
          await this.clientesService.mostrarAlerta('Aviso', 'Adicione pelo menos um item com descrição ao orçamento.');
          return;
      }

      const saveResult = await this.savePdfToFile(); // Handles saving, linking, and saving client list

      if (!saveResult) {
        console.error('PDF generation/saving/linking failed. Cannot share.');
         // Alert was shown in savePdfToFile
        return;
      }

      // --- Prepare share data ---
      const dadosEmpresaString = localStorage.getItem('dadosEmpresa');
      let nomeEmpresa = 'Sua Empresa'; // Default company name
      if (dadosEmpresaString) {
          try {
              const dadosEmpresa: DadosEmpresa = JSON.parse(dadosEmpresaString);
              nomeEmpresa = dadosEmpresa.nome || nomeEmpresa;
          } catch { /* ignore parsing error */ }
        }

        const subject = `Orçamento Nº ${this.orcamento.numero} - ${nomeEmpresa}`;
        // Use template literals for easier formatting
        const text = `Olá ${this.orcamento.cliente || 'Cliente'},

Conforme solicitado, segue em anexo o orçamento Nº ${this.orcamento.numero}.

Qualquer dúvida, estamos à disposição.

Atenciosamente,
${nomeEmpresa}`;

        // --- Share ---
        try {
          console.log(`Attempting to share PDF via Share plugin: ${saveResult.uri}`);
          const shareResult = await Share.share({
            title: subject,
            text: text,
            url: saveResult.uri, // Use the URI from Filesystem.writeFile result
            dialogTitle: 'Compartilhar Orçamento via...'
          });

           console.log('Share dialog action completed. Result:', shareResult); // Result might be empty {} on success

           // Since we saved to Directory.Data, no cleanup is typically needed unless specified.
           // If using Directory.Cache, deletion logic would go here.
           console.log(`PDF saved in ${saveResult.directory}, not automatically deleting after sharing.`);

           // Optional: Reset form after success
           // this.novoOrcamento(); // Consider if this is desired UX

        } catch (shareError: any) {
          console.error('Error sharing PDF:', shareError);
          // Check for specific cancellation error messages (can vary by platform/plugin version)
          if (shareError.message?.includes('Share cancelled') || shareError.code === 'CANCELLED' || shareError.message?.includes('Activity was cancelled')) {
              console.log('Share cancelled by user.');
              // Optionally inform user: await this.clientesService.mostrarAlerta('Cancelado', 'Compartilhamento cancelado.');
          } else {
              await this.clientesService.mostrarAlerta('Erro ao Compartilhar', `Não foi possível iniciar o compartilhamento. ${shareError.message || ''}`);
          }
           // No cleanup needed for Directory.Data files here.
        }
    }

  // mostrarAlerta is now handled by ClientesService
}
