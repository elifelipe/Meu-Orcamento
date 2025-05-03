// src/app/orcamentos/orcamentos.component.ts
import { Component, OnInit } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CommonModule } from '@angular/common';
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
// Removed Dialog import as it's now handled by the service

// Import the Clientes Service and its interfaces
import { ClientesService, ClientePdfInfo, Cliente } from '../../services/clientes.service';


// Definições de interfaces (Mantenha aqui ou mova para um arquivo compartilhado)
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
  cliente: string; // Keep client info here
  telefone: string; // Keep client info here
  email: string; // Keep client info here
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

    // You might want to pre-load clients here as well, although the service handles lazy loading
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

  async salvarOrcamento(): Promise<void> {
    console.log(`Tentando salvar orçamento Nº: ${this.orcamento.numero}`);
    try {
      // Cria uma chave única para este orçamento no localStorage
      const chaveStorage = `orcamento_${this.orcamento.numero}`;

      // Converte o objeto orcamento para uma string JSON
      const orcamentoString = JSON.stringify(this.orcamento);

      // Salva no localStorage
      localStorage.setItem(chaveStorage, orcamentoString);

      console.log(`Orçamento Nº ${this.orcamento.numero} salvo com sucesso no localStorage.`);

      // Mostra uma mensagem de sucesso para o usuário usando o serviço
      // (Opcional, mas bom para UX)
      await this.clientesService.mostrarAlerta('Sucesso', `Orçamento Nº ${this.orcamento.numero} salvo localmente.`);

    } catch (error: any) {
      console.error(`Erro ao salvar orçamento Nº ${this.orcamento.numero}:`, error);
      // Mostra uma mensagem de erro
      await this.clientesService.mostrarAlerta('Erro ao Salvar', `Não foi possível salvar o orçamento. Detalhes: ${error.message || error}`);
    }
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
    // Prompt user if they want to clear the current budget? (Optional UX improvement)
    this.proximoNumero++;
    localStorage.setItem('proximoNumeroOrcamento', this.proximoNumero.toString());
    this.orcamento = this.inicializarOrcamento();
    console.log(`Novo orçamento iniciado: Nº ${this.orcamento.numero}`);
  }

  // --- Funções de PDF ---

  private async savePdfToFile(): Promise<FileInfo | undefined> {
      const doc = new jsPDF();

      // --- Load company data and logo from localStorage ---
      const dadosEmpresaString = localStorage.getItem('dadosEmpresa');
      const logoBase64 = localStorage.getItem('logoEmpresa');
      let dadosEmpresa: DadosEmpresa | null = null;

      if (dadosEmpresaString) {
          try {
              dadosEmpresa = JSON.parse(dadosEmpresaString);
          } catch (e) {
              console.error("Erro ao parsear dados da empresa do localStorage:", e);
              // Use the service's alert
              await this.clientesService.mostrarAlerta('Erro', 'Não foi possível carregar os dados da empresa.');
              return undefined;
          }
      } else {
          // Use the service's alert
          await this.clientesService.mostrarAlerta('Aviso', 'Dados da empresa não configurados. Por favor, configure na tela de Dados da Empresa.');
          console.warn("Dados da empresa não encontrados no localStorage.");
          // Use placeholder data if not configured
          dadosEmpresa = { nome: 'Nome da Empresa', endereco: 'Endereço da Empresa', cidade: 'Cidade', estado: 'Estado', telefone1: '(XX) XXXX-XXXX', telefone2: '', email: 'email@empresa.com.br' };
      }

      // Add Logo (if exists and is valid base64)
      if (logoBase64) {
        try {
           if (logoBase64.startsWith('data:image')) {
             // Adjust position and size as needed
             doc.addImage(logoBase64, 'PNG', 10, 10, 30, 30);
           } else {
             console.warn("Logo salvo não parece ser uma string base64 válida.");
           }
        } catch (e) {
           console.error('Error adding logo to PDF:', e);
        }
      } else {
          console.log("Nenhum logo encontrado no localStorage.");
      }

      // Add Company Info
      doc.setFontSize(12);
      const companyInfoStartX = logoBase64 ? 50 : 10; // Start text right of logo if logo exists
      const companyInfoStartY = 20;
      const lineHeight = 6; // Space between lines

      if (dadosEmpresa) {
          doc.text(`Empresa: ${dadosEmpresa.nome || 'N/A'}`, companyInfoStartX, companyInfoStartY);
          doc.text(`Endereço: ${dadosEmpresa.endereco || 'N/A'}`, companyInfoStartX, companyInfoStartY + lineHeight);
          doc.text(`Cidade/Estado: ${dadosEmpresa.cidade || 'N/A'} / ${dadosEmpresa.estado || 'N/A'}`, companyInfoStartX, companyInfoStartY + 2 * lineHeight);
          const telefones = [dadosEmpresa.telefone1, dadosEmpresa.telefone2].filter(Boolean).join(' / ');
          doc.text(`Telefone: ${telefones || 'N/A'}`, companyInfoStartX, companyInfoStartY + 3 * lineHeight);
          doc.text(`E-mail: ${dadosEmpresa.email || 'N/A'}`, companyInfoStartX, companyInfoStartY + 4 * lineHeight);
      } else {
          doc.text('Dados da Empresa: Não configurado', companyInfoStartX, companyInfoStartY);
      }

      // Add Budget Details
      const budgetDetailsStartY = Math.max(companyInfoStartY + 5 * lineHeight, 60); // Ensure space after company info, or start lower if company info was short
      doc.setFontSize(12);
      doc.text(`Orçamento Nº: ${this.orcamento.numero}`, 10, budgetDetailsStartY);
      doc.text(`Data: ${this.orcamento.data}`, 10, budgetDetailsStartY + lineHeight);
      doc.text(`Vencimento: ${this.orcamento.dataVencimento}`, 10, budgetDetailsStartY + 2 * lineHeight);

      // Add Client Info
      const clientInfoStartY = budgetDetailsStartY + 4 * lineHeight;
      doc.text(`Cliente: ${this.orcamento.cliente || 'N/A'}`, 10, clientInfoStartY);
      doc.text(`Telefone: ${this.orcamento.telefone || 'N/A'}`, 10, clientInfoStartY + lineHeight);
      doc.text(`E-mail: ${this.orcamento.email || 'N/A'}`, 10, clientInfoStartY + 2 * lineHeight);


      // Add Items Table
      const itens = this.orcamento.itens.map(item => [
        (Number(item.quantidade) || 0).toString(),
        item.descricao || '',
        `R$ ${(Number(item.valorUnitario) || 0).toFixed(2)}`,
        `R$ ${(Number(item.valorTotal) || 0).toFixed(2)}`
      ]);

      const tableStartY = clientInfoStartY + 4 * lineHeight; // Space after client info

      autoTable(doc, {
        head: [['Qtd', 'Descrição', 'Valor Unitário', 'Valor Total']],
        body: itens,
        startY: tableStartY,
        styles: { fontSize: 10 },
        margin: { top: 10 }
      });

      // Add Total Value
      const finalY = (doc as any).lastAutoTable.finalY || tableStartY + 10; // Get the end position of the table
      doc.setFontSize(14);
      const valorTotalNum = Number(this.orcamento.valorTotal) || 0;
      doc.text(`Valor Total: R$ ${valorTotalNum.toFixed(2)}`, 10, finalY + 10); // Position below the table

      // --- Save PDF to File ---
      // --- Save PDF to File ---
      try {
        const pdfBase64 = doc.output('datauristring').split(',')[1];
        const platform = Capacitor.getPlatform();
        const fileName = `orcamento_${this.orcamento.numero}.pdf`;
        let targetDirectory: Directory;
        const pdfSubdirectory = 'Orcamentos'; // Optional: Save PDFs in a subdirectory

        // Determine the target directory (Your existing logic is fine here)
        if (platform === 'android') {
           try {
               await Filesystem.stat({ path: '', directory: Directory.Documents });
               targetDirectory = Directory.Documents;
               console.log('Attempting to save PDF to Documents directory.');
           } catch {
               targetDirectory = Directory.Cache;
               console.log('Falling back to Cache directory for PDF.');
           }
        } else if (platform === 'ios') {
            targetDirectory = Directory.Documents;
            console.log('Saving PDF to Documents directory (iOS).');
        } else {
            targetDirectory = Directory.Cache;
             console.log('Saving PDF to Cache directory (Web/Other).');
        }

        const fullPath = pdfSubdirectory ? `${pdfSubdirectory}/${fileName}` : fileName;

         // Ensure the directory exists (Your existing logic is fine here)
         if (pdfSubdirectory) {
             try {
                 await Filesystem.mkdir({
                     path: pdfSubdirectory,
                     directory: targetDirectory,
                     recursive: true
                 });
                  console.log(`Ensured PDF directory ${pdfSubdirectory} exists.`);
             } catch (e: any) {
                  if (!e.message?.includes("file already exists") && !e.message?.includes("Folder exists")) {
                      console.warn(`Could not create PDF directory ${pdfSubdirectory}:`, e);
                  }
             }
         }

        // ***** CORRECTED writeFile call *****
        const result = await Filesystem.writeFile({
          path: fullPath,
          data: pdfBase64, // Provide the base64 string directly
          directory: targetDirectory,
          // encoding: Encoding.UTF8, // REMOVED this line
          recursive: true // Creates intermediate directories if needed
        });
        // ***** End of correction *****

        console.log('PDF file saved:', result.uri);

        // --- Link the saved PDF to the client (Your existing logic is fine here) ---
        if (this.orcamento.cliente) {
            // ... (rest of your linking logic)
        } else {
            console.log('Client name not provided in budget form. Skipping PDF linking.');
        }

        return { uri: result.uri, path: fullPath, directory: targetDirectory, fileName: fileName };

      } catch (error: any) {
        console.error('Error saving PDF file:', error);
        await this.clientesService.mostrarAlerta('Erro ao Salvar', `Não foi possível salvar o PDF. Detalhes: ${error.message || error}`);
        return undefined;
      }
  }

  async gerarPdfOrcamento(): Promise<void> {
    console.log('*** Executing gerarPdfOrcamento (Open PDF) ***');
    const saveResult = await this.savePdfToFile(); // This now also links to client

    if (!saveResult) {
      console.error('PDF generation/saving failed. Cannot open.');
      return;
    }

    try {
      console.log('Attempting to open PDF via FileOpener...');
      await FileOpener.open({
        filePath: saveResult.uri, // Use the URI returned by savePdfToFile
        contentType: 'application/pdf'
      });
      console.log('PDF opened successfully:', saveResult.uri);
    } catch (openError: any) { // Cast to any to access message safely
      console.error('Erro ao abrir o PDF:', openError);
      // Use the service's alert for user feedback
       this.clientesService.mostrarAlerta('Erro ao Abrir', `O PDF foi salvo em ${saveResult.directory}/${saveResult.path}, mas não foi possível abri-lo automaticamente. Você pode tentar abri-lo manualmente. Detalhes: ${openError.message || ''}`);
    }
  }

  async compartilharPdf(): Promise<void> {
      console.log('*** Executing compartilharPdf (Share PDF) ***');
      const saveResult = await this.savePdfToFile(); // This now also links to client

      if (!saveResult) {
        console.error('PDF generation/saving failed before sharing. Cannot share.');
        return;
      }

      // Get company name for subject/text from localStorage or default
      const dadosEmpresaString = localStorage.getItem('dadosEmpresa');
      let nomeEmpresa = 'Nossa Empresa';
      if (dadosEmpresaString) {
          try {
              const dadosEmpresa: DadosEmpresa = JSON.parse(dadosEmpresaString);
              nomeEmpresa = dadosEmpresa.nome || nomeEmpresa;
          } catch { /* ignore parsing error, use default */ }
      }

      const subject = `Orçamento Nº ${this.orcamento.numero} - ${nomeEmpresa}`;
      const text = `Olá ${this.orcamento.cliente || 'Cliente'},

Conforme solicitado, segue em anexo o orçamento Nº ${this.orcamento.numero}.

Qualquer dúvida, estamos à disposição.

Atenciosamente,
${nomeEmpresa}`;

      try {
        console.log('Attempting to share PDF via Share plugin...');
        const shareResult = await Share.share({
          title: subject,
          text: text,
          url: saveResult.uri, // Use the URI returned by savePdfToFile
          dialogTitle: 'Compartilhar Orçamento via...'
        });

         console.log('Share dialog shown/completed. Result (may be empty):', shareResult);

         // Optional: Delete temporary PDF from Cache after sharing if saved there
         // PDFs saved in Documents are typically kept.
         if (saveResult.directory === Directory.Cache) {
             const platform = Capacitor.getPlatform();
             if (platform !== 'web') { // Avoid deleting from browser cache (not relevant)
                 try {
                     // Using saveResult.path for deletion is correct as it's relative to the directory
                     await Filesystem.deleteFile({ path: saveResult.path, directory: saveResult.directory });
                     console.log('Temporary PDF file deleted from Cache after sharing.');
                 } catch (deleteError: any) { // Cast to any
                     // Ignore "File does not exist" errors which can happen if sharing cleaned it up
                     if (!deleteError.message?.includes("File does not exist")) {
                         console.error('Error deleting temporary file after sharing:', deleteError);
                     } else {
                          console.log('Temporary PDF file was already gone after sharing.');
                     }
                 }
             }
         } else {
             console.log(`PDF saved in ${saveResult.directory}, not automatically deleting after sharing.`);
         }


      } catch (shareError: any) { // Cast to any to access message safely
        console.error('Error sharing PDF:', shareError);
        if (shareError.message?.includes('Share cancelled')) {
            console.log('Share cancelled by user.');
        } else {
            // Use the service's alert for user feedback
            this.clientesService.mostrarAlerta('Erro ao Compartilhar', 'Não foi possível iniciar o compartilhamento.');
        }

         // Optional: Delete temporary PDF from Cache if saved there and sharing failed/cancelled
         if (saveResult.directory === Directory.Cache) {
             const platform = Capacitor.getPlatform();
             if (platform !== 'web') {
                 try {
                     await Filesystem.deleteFile({ path: saveResult.path, directory: saveResult.directory });
                     console.log('Temporary PDF file deleted from Cache after sharing error/cancellation.');
                 } catch (deleteError: any) {
                     if (!deleteError.message?.includes("File does not exist")) {
                         console.error('Error deleting temporary file after sharing error:', deleteError);
                     } else {
                          console.log('Temporary PDF file was already gone after sharing error.');
                     }
                 }
             }
         }
      }
  }

  // Removed the local mostrarAlerta function as it's in the service now

}
