// src/app/orcamentos/orcamentos.component.ts
import { Component, OnInit, LOCALE_ID } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CommonModule, registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatButtonModule } from '@angular/material/button';

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

import { Filesystem, Directory } from '@capacitor/filesystem';
import { FileOpener } from '@capacitor-community/file-opener';
import { Share } from '@capacitor/share';

import { ClientesService, ClientePdfInfo, Cliente } from '../../services/clientes.service';

registerLocaleData(localePt);

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
  // Com input type="number", ngModel resultará em 'number' ou 'null' (se vazio).
  // Manter 'string' na união por flexibilidade, mas o tratamento focará em number/null.
  quantidade: number | null | string;
  descricao: string;
  valorUnitario: number | string;
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
  path: string;
  directory: Directory;
  fileName: string;
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
    MatIconModule,
    IonInput,
    IonItem,
    IonLabel,
    IonList,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonButtons,
    IonBackButton,
    MatFormFieldModule,
    MatInputModule,
    MatExpansionModule,
    MatButtonModule
  ],
})
export class OrcamentosComponent implements OnInit {
  proximoNumero: number = 1;
  orcamento: Orcamento = this.inicializarOrcamento();

  constructor(private clientesService: ClientesService) {}

  async ngOnInit(): Promise<void> {
    const ultimoNumero = localStorage.getItem('proximoNumeroOrcamento');
    if (ultimoNumero) {
        this.proximoNumero = parseInt(ultimoNumero, 10);
    } else {
        localStorage.setItem('proximoNumeroOrcamento', this.proximoNumero.toString());
    }
    this.orcamento.numero = this.formatarNumeroOrcamento(this.proximoNumero);
  }

  inicializarOrcamento(): Orcamento {
    const numeroAtual = this.proximoNumero || 1;
    const hoje = new Date();
    const dataVencimento = new Date(hoje);
    dataVencimento.setDate(hoje.getDate() + 30);

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
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const ano = data.getFullYear();
    return `${dia}/${mes}/${ano}`;
  }

  formatarNumeroOrcamento(numero: number): string {
    return numero.toString().padStart(4, '0');
  }

  criarItemVazio(): ItemOrcamento {
    return {
      quantidade: 1, // Inicia com 1, que é um número.
      descricao: '',
      valorUnitario: '',
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

  // FUNÇÃO ATUALIZADA
  atualizarItem(item: ItemOrcamento): void {
    // Quantidade:
    // Para input type="number", item.quantidade (via ngModel) será 'number' ou 'null' se o campo estiver vazio.
    // Usamos Number() para converter null para 0 para o cálculo.
    // Valores inválidos não numéricos também se tornarão 0 ou NaN (que || 0 trata).
    const quantidadeParaCalculo = Number(item.quantidade) || 0;

    // Valor Unitário:
    let valorUnitarioStr = String(item.valorUnitario);
    valorUnitarioStr = valorUnitarioStr.replace(/\./g, '').replace(',', '.');
    const valorUnitarioNum = parseFloat(valorUnitarioStr) || 0;

    // Atualiza o valorTotal do item
    // Não reatribuímos item.quantidade aqui. O [(ngModel)] já atualiza o valor de item.quantidade
    // no objeto com o que está no input (que será um número ou null para type="number").
    // Isso evita que o "0" apareça ao apagar ou o "01" ao digitar.
    item.valorTotal = quantidadeParaCalculo * valorUnitarioNum;

    this.calcularTotais();
  }

  calcularTotais(): void {
    this.orcamento.valorTotal = this.orcamento.itens.reduce((total, item) => {
        const itemTotalNum = Number(item.valorTotal) || 0;
        return total + itemTotalNum;
    }, 0);
  }

  async novoOrcamento(): Promise<void> {
    this.proximoNumero++;
    localStorage.setItem('proximoNumeroOrcamento', this.proximoNumero.toString());
    this.orcamento = this.inicializarOrcamento();
  }

  private async savePdfToFile(): Promise<FileInfo | undefined> {
      const doc = new jsPDF();
      const dadosEmpresaString = localStorage.getItem('dadosEmpresa');
      const logoBase64 = localStorage.getItem('logoEmpresa');
      let dadosEmpresa: DadosEmpresa | null = null;

      if (dadosEmpresaString) {
          try {
              dadosEmpresa = JSON.parse(dadosEmpresaString);
          } catch (e) {
              console.error("Erro ao parsear dados da empresa:", e);
              await this.clientesService.mostrarAlerta('Erro', 'Não foi possível carregar os dados da empresa.');
              return undefined;
          }
      } else {
          await this.clientesService.mostrarAlerta('Aviso', 'Dados da empresa não configurados.');
          return undefined;
      }

      if (logoBase64 && logoBase64.startsWith('data:image')) {
        try {
           doc.addImage(logoBase64, 'PNG', 10, 10, 30, 30);
        } catch (e) {
           console.error('Error adding logo to PDF:', e);
        }
      }

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

      const budgetDetailsStartY = Math.max(companyInfoStartY + 5 * lineHeight + 10, 60);
      doc.setFontSize(12);
      doc.text(`Orçamento Nº: ${this.orcamento.numero}`, 10, budgetDetailsStartY);
      doc.text(`Data: ${this.orcamento.data}`, 10, budgetDetailsStartY + lineHeight);
      doc.text(`Vencimento: ${this.orcamento.dataVencimento}`, 10, budgetDetailsStartY + 2 * lineHeight);

      const clientInfoStartY = budgetDetailsStartY + 4 * lineHeight;
      doc.text(`Cliente: ${this.orcamento.cliente || 'N/A'}`, 10, clientInfoStartY);
      doc.text(`Telefone: ${this.orcamento.telefone || 'N/A'}`, 10, clientInfoStartY + lineHeight);
      doc.text(`E-mail: ${this.orcamento.email || 'N/A'}`, 10, clientInfoStartY + 2 * lineHeight);

      const itensParaPdf = this.orcamento.itens.map(item => {
        let valorUnitarioStr = String(item.valorUnitario);
        valorUnitarioStr = valorUnitarioStr.replace(/\./g, '').replace(',', '.');
        const valorUnitarioNum = parseFloat(valorUnitarioStr) || 0;

        // item.quantidade deve ser number ou null. Se null, Number(null) é 0.
        const quantidadeNum = Number(item.quantidade) || 0;

        return [
          quantidadeNum.toString(),
          item.descricao || '',
          `R$ ${valorUnitarioNum.toFixed(2)}`,
          `R$ ${(Number(item.valorTotal) || 0).toFixed(2)}`
        ];
      });

      const tableStartY = clientInfoStartY + 4 * lineHeight;

      autoTable(doc, {
        head: [['Qtd', 'Descrição', 'Valor Unitário', 'Valor Total']],
        body: itensParaPdf,
        startY: tableStartY,
        styles: { fontSize: 10 },
        theme: 'grid',
        margin: { top: 10 }
      });

      const finalY = (doc as any).lastAutoTable.finalY || tableStartY + 10;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      const valorTotalNum = Number(this.orcamento.valorTotal) || 0;
      doc.text(`Valor Total: R$ ${valorTotalNum.toFixed(2)}`, 10, finalY + 15);

      try {
        const pdfBase64 = doc.output('datauristring').split(',')[1];
        const fileName = `orcamento_${this.orcamento.numero}.pdf`;
        const targetDirectory = Directory.Data;
        const pdfSubdirectory = 'Orcamentos';
        const fullPath = `${pdfSubdirectory}/${fileName}`;

        const result = await Filesystem.writeFile({
          path: fullPath,
          data: pdfBase64,
          directory: targetDirectory,
          recursive: true
        });
        const fileInfo: FileInfo = { uri: result.uri, path: fullPath, directory: targetDirectory, fileName: fileName };

        if (this.orcamento.cliente?.trim()) {
            const clientDataForService = {
                cliente: this.orcamento.cliente,
                telefone: this.orcamento.telefone,
                email: this.orcamento.email
            };
            const client = await this.clientesService.findOrCreateClient(clientDataForService);
            if (client && client.id) {
                const pdfInfoToLink: ClientePdfInfo = { fileName: fileInfo.fileName, uri: fileInfo.uri };
                const linkSuccess = await this.clientesService.addPdfToClient(client, pdfInfoToLink);
                if (linkSuccess) {
                    await this.clientesService.saveClientes();
                }
            }
        } else {
            await this.clientesService.mostrarAlerta('Aviso', 'O PDF foi salvo, mas não vinculado a um cliente (nome não informado).');
        }
        return fileInfo;
      } catch (error: any) {
        console.error('Error saving or linking PDF file:', error);
        await this.clientesService.mostrarAlerta('Erro ao Salvar', `Não foi possível salvar/vincular o PDF. ${error.message || error}`);
        return undefined;
      }
  }

  async gerarPdfOrcamento(): Promise<void> {
    if (!this.orcamento.cliente?.trim()) {
       await this.clientesService.mostrarAlerta('Aviso', 'Preencha o nome do cliente.');
       return;
    }
    if (this.orcamento.itens.length === 0 || !this.orcamento.itens.some(item => item.descricao?.trim())) {
        await this.clientesService.mostrarAlerta('Aviso', 'Adicione itens ao orçamento.');
        return;
    }
    const saveResult = await this.savePdfToFile();
    if (!saveResult) {
      return;
    }
    try {
      await FileOpener.open({ filePath: saveResult.uri, contentType: 'application/pdf' });
    } catch (openError: any) {
      console.error('Erro ao abrir o PDF:', openError);
       let openErrorMessage = `PDF salvo (${saveResult.fileName}), mas não pôde ser aberto.`;
       if (openError.message?.includes('Activity not found') || openError.message?.includes('No application found')) {
            openErrorMessage += ' Leitor de PDF não encontrado?';
       } else {
            openErrorMessage += ` Detalhes: ${openError.message || ''}`;
       }
       await this.clientesService.mostrarAlerta('Erro ao Abrir', openErrorMessage);
    }
  }

  async compartilharPdf(): Promise<void> {
      if (!this.orcamento.cliente?.trim()) {
         await this.clientesService.mostrarAlerta('Aviso', 'Preencha o nome do cliente.');
         return;
      }
      if (this.orcamento.itens.length === 0 || !this.orcamento.itens.some(item => item.descricao?.trim())) {
          await this.clientesService.mostrarAlerta('Aviso', 'Adicione itens ao orçamento.');
          return;
      }
      const saveResult = await this.savePdfToFile();
      if (!saveResult) {
        return;
      }
      const dadosEmpresaString = localStorage.getItem('dadosEmpresa');
      let nomeEmpresa = 'Sua Empresa';
      if (dadosEmpresaString) {
          try {
              const dadosEmpresa: DadosEmpresa = JSON.parse(dadosEmpresaString);
              nomeEmpresa = dadosEmpresa.nome || nomeEmpresa;
          } catch { /* ignore */ }
        }
        const subject = `Orçamento Nº ${this.orcamento.numero} - ${nomeEmpresa}`;
        const text = `Olá ${this.orcamento.cliente || 'Cliente'},\n\nSegue anexo o orçamento Nº ${this.orcamento.numero}.\n\nÀ disposição,\n${nomeEmpresa}`;
        try {
          await Share.share({ title: subject, text: text, url: saveResult.uri, dialogTitle: 'Compartilhar Orçamento' });
        } catch (shareError: any) {
          console.error('Error sharing PDF:', shareError);
          if (shareError.message?.includes('Share cancelled') || shareError.code === 'CANCELLED' || shareError.message?.includes('Activity was cancelled')) {
              console.log('Share cancelled by user.');
          } else {
              await this.clientesService.mostrarAlerta('Erro ao Compartilhar', `Não foi possível compartilhar. ${shareError.message || ''}`);
          }
        }
    }
}
