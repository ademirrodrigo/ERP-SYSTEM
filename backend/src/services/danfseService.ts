import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import { promisify } from 'util';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const writeFileAsync = promisify(fs.writeFile);

export interface DanfseData {
  // NFS-e
  numero?: string;
  codigoVerificacao?: string;
  dataEmissao?: Date;
  competencia: Date;

  // Prestador
  prestadorNome: string;
  prestadorCnpj?: string;
  prestadorInscricaoMunicipal?: string;
  prestadorEndereco?: string;
  prestadorCidade?: string;
  prestadorUf?: string;
  prestadorCep?: string;
  prestadorTelefone?: string;
  prestadorEmail?: string;

  // Tomador
  tomadorNome: string;
  tomadorCpfCnpj?: string;
  tomadorEmail?: string;
  tomadorTelefone?: string;
  tomadorEndereco?: string;
  tomadorNumero?: string;
  tomadorComplemento?: string;
  tomadorBairro?: string;
  tomadorCidade?: string;
  tomadorUf?: string;
  tomadorCep?: string;

  // Serviço
  discriminacao: string;
  itemListaServico: string;
  codigoCnae?: string;

  // Valores
  valorServicos: number;
  valorDeducoes: number;
  valorPis: number;
  valorCofins: number;
  valorInss: number;
  valorIr: number;
  valorCsll: number;
  outrasRetencoes: number;
  valorIss: number;
  aliquotaIss: number;
  descontoIncondicionado: number;
  baseCalculo: number;
  valorLiquidoNfse: number;
  issRetido: boolean;
}

export class DanfseService {
  /**
   * Gera o PDF da DANFSE (Documento Auxiliar da NFS-e)
   */
  static async generatePdf(data: DanfseData, outputPath?: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const chunks: Buffer[] = [];

        // Captura o conteúdo do PDF em chunks
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Se um caminho foi fornecido, também salva em arquivo
        if (outputPath) {
          const stream = fs.createWriteStream(outputPath);
          doc.pipe(stream);
        }

        // Configurações de fonte e cor
        const primaryColor = '#1a56db';
        const grayColor = '#6b7280';

        // ========== CABEÇALHO ==========
        doc.fontSize(20).fillColor(primaryColor).text('NFS-e', { align: 'center' });
        doc.fontSize(12).fillColor('black').text('Nota Fiscal de Serviço Eletrônica', {
          align: 'center',
        });
        doc.moveDown(0.5);

        if (data.numero) {
          doc
            .fontSize(14)
            .fillColor(primaryColor)
            .text(`Nº ${data.numero}`, { align: 'center' });
        }

        if (data.codigoVerificacao) {
          doc
            .fontSize(10)
            .fillColor(grayColor)
            .text(`Código de Verificação: ${data.codigoVerificacao}`, { align: 'center' });
        }

        doc.moveDown(1);
        this.drawLine(doc);

        // ========== PRESTADOR DE SERVIÇOS ==========
        doc.fontSize(12).fillColor(primaryColor).text('PRESTADOR DE SERVIÇOS');
        doc.moveDown(0.3);

        doc.fontSize(10).fillColor('black');
        doc.text(`${data.prestadorNome}`, { continued: false });

        if (data.prestadorCnpj) {
          doc.text(`CNPJ: ${this.formatCnpj(data.prestadorCnpj)}`);
        }

        if (data.prestadorInscricaoMunicipal) {
          doc.text(`Inscrição Municipal: ${data.prestadorInscricaoMunicipal}`);
        }

        if (data.prestadorEndereco) {
          const enderecoCompleto = [
            data.prestadorEndereco,
            data.prestadorCidade,
            data.prestadorUf,
            data.prestadorCep && `CEP: ${data.prestadorCep}`,
          ]
            .filter(Boolean)
            .join(', ');
          doc.text(enderecoCompleto);
        }

        if (data.prestadorTelefone) {
          doc.text(`Telefone: ${data.prestadorTelefone}`);
        }

        if (data.prestadorEmail) {
          doc.text(`Email: ${data.prestadorEmail}`);
        }

        doc.moveDown(1);
        this.drawLine(doc);

        // ========== TOMADOR DE SERVIÇOS ==========
        doc.fontSize(12).fillColor(primaryColor).text('TOMADOR DE SERVIÇOS');
        doc.moveDown(0.3);

        doc.fontSize(10).fillColor('black');
        doc.text(data.tomadorNome);

        if (data.tomadorCpfCnpj) {
          const label = data.tomadorCpfCnpj.replace(/\D/g, '').length === 11 ? 'CPF' : 'CNPJ';
          doc.text(`${label}: ${this.formatCpfCnpj(data.tomadorCpfCnpj)}`);
        }

        if (data.tomadorEndereco) {
          const enderecoTomador = [
            data.tomadorEndereco,
            data.tomadorNumero && `Nº ${data.tomadorNumero}`,
            data.tomadorComplemento,
            data.tomadorBairro,
          ]
            .filter(Boolean)
            .join(', ');
          doc.text(enderecoTomador);

          const cidadeTomador = [
            data.tomadorCidade,
            data.tomadorUf,
            data.tomadorCep && `CEP: ${data.tomadorCep}`,
          ]
            .filter(Boolean)
            .join(', ');
          if (cidadeTomador) doc.text(cidadeTomador);
        }

        if (data.tomadorTelefone) {
          doc.text(`Telefone: ${data.tomadorTelefone}`);
        }

        if (data.tomadorEmail) {
          doc.text(`Email: ${data.tomadorEmail}`);
        }

        doc.moveDown(1);
        this.drawLine(doc);

        // ========== DADOS DO SERVIÇO ==========
        doc.fontSize(12).fillColor(primaryColor).text('DISCRIMINAÇÃO DOS SERVIÇOS');
        doc.moveDown(0.3);

        doc.fontSize(10).fillColor('black');
        doc.text(data.discriminacao, { align: 'justify' });

        doc.moveDown(0.5);
        doc.fontSize(9).fillColor(grayColor);
        doc.text(`Item Lista de Serviços: ${data.itemListaServico}`);

        if (data.codigoCnae) {
          doc.text(`Código CNAE: ${data.codigoCnae}`);
        }

        doc.moveDown(1);
        this.drawLine(doc);

        // ========== VALORES ==========
        doc.fontSize(12).fillColor(primaryColor).text('VALORES');
        doc.moveDown(0.3);

        const yStart = doc.y;
        doc.fontSize(9).fillColor('black');

        // Coluna esquerda
        doc.text('Valor dos Serviços:', 50, yStart);
        doc.text(this.formatCurrency(data.valorServicos), 200, yStart, { align: 'right' });

        doc.text('(-) Deduções:', 50, yStart + 15);
        doc.text(this.formatCurrency(data.valorDeducoes), 200, yStart + 15, { align: 'right' });

        doc.text('(-) Desconto Incondicionado:', 50, yStart + 30);
        doc.text(this.formatCurrency(data.descontoIncondicionado), 200, yStart + 30, {
          align: 'right',
        });

        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .text('Base de Cálculo:', 50, yStart + 50);
        doc.text(this.formatCurrency(data.baseCalculo), 200, yStart + 50, { align: 'right' });

        doc.font('Helvetica').fontSize(9);
        doc.text(`Alíquota ISS (${data.aliquotaIss}%):`, 50, yStart + 70);
        doc.text(this.formatCurrency(data.valorIss), 200, yStart + 70, { align: 'right' });

        // Coluna direita - Retenções
        const xRight = 300;
        doc.fillColor(grayColor).text('RETENÇÕES FEDERAIS', xRight, yStart);

        doc.fillColor('black');
        doc.text('PIS:', xRight, yStart + 20);
        doc.text(this.formatCurrency(data.valorPis), xRight + 100, yStart + 20, {
          align: 'right',
        });

        doc.text('COFINS:', xRight, yStart + 35);
        doc.text(this.formatCurrency(data.valorCofins), xRight + 100, yStart + 35, {
          align: 'right',
        });

        doc.text('INSS:', xRight, yStart + 50);
        doc.text(this.formatCurrency(data.valorInss), xRight + 100, yStart + 50, {
          align: 'right',
        });

        doc.text('IR:', xRight, yStart + 65);
        doc.text(this.formatCurrency(data.valorIr), xRight + 100, yStart + 65, { align: 'right' });

        doc.text('CSLL:', xRight, yStart + 80);
        doc.text(this.formatCurrency(data.valorCsll), xRight + 100, yStart + 80, {
          align: 'right',
        });

        doc.text('Outras Retenções:', xRight, yStart + 95);
        doc.text(this.formatCurrency(data.outrasRetencoes), xRight + 100, yStart + 95, {
          align: 'right',
        });

        // Valor líquido
        doc.moveDown(8);
        this.drawLine(doc);

        doc
          .fontSize(14)
          .font('Helvetica-Bold')
          .fillColor(primaryColor)
          .text('VALOR LÍQUIDO DA NFS-e:', 50, doc.y);
        doc.text(this.formatCurrency(data.valorLiquidoNfse), 350, doc.y - 14, { align: 'right' });

        doc.font('Helvetica').fontSize(9).fillColor(grayColor);
        doc.text(
          `ISS ${data.issRetido ? 'RETIDO' : 'NÃO RETIDO'} na fonte`,
          50,
          doc.y + 5
        );

        doc.moveDown(1);
        this.drawLine(doc);

        // ========== RODAPÉ ==========
        doc.fontSize(8).fillColor(grayColor);

        if (data.dataEmissao) {
          doc.text(
            `Data de Emissão: ${format(data.dataEmissao, "dd/MM/yyyy 'às' HH:mm", {
              locale: ptBR,
            })}`,
            { align: 'center' }
          );
        }

        doc.text(
          `Competência: ${format(data.competencia, 'MM/yyyy', { locale: ptBR })}`,
          { align: 'center' }
        );

        doc.moveDown(0.5);
        doc.text('Esta NFS-e foi gerada eletronicamente e possui validade jurídica.', {
          align: 'center',
        });
        doc.text(
          'Consulte a autenticidade no site da Prefeitura Municipal com o código de verificação.',
          { align: 'center' }
        );

        // Finaliza o documento
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Desenha uma linha horizontal
   */
  private static drawLine(doc: PDFKit.PDFDocument): void {
    const y = doc.y;
    doc
      .strokeColor('#e5e7eb')
      .lineWidth(1)
      .moveTo(50, y)
      .lineTo(545, y)
      .stroke();
    doc.moveDown(0.5);
  }

  /**
   * Formata valor monetário
   */
  private static formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }

  /**
   * Formata CNPJ
   */
  private static formatCnpj(cnpj: string): string {
    const cleaned = cnpj.replace(/\D/g, '');
    return cleaned.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }

  /**
   * Formata CPF ou CNPJ
   */
  private static formatCpfCnpj(value: string): string {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length === 11) {
      // CPF
      return cleaned.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
    } else {
      // CNPJ
      return this.formatCnpj(value);
    }
  }

  /**
   * Gera e salva o PDF em um arquivo
   */
  static async generateAndSave(data: DanfseData, outputPath: string): Promise<string> {
    const pdfBuffer = await this.generatePdf(data);
    await writeFileAsync(outputPath, pdfBuffer);
    return outputPath;
  }

  /**
   * Gera o PDF e retorna como stream
   */
  static async generateStream(data: DanfseData): Promise<NodeJS.ReadableStream> {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    await this.generatePdf(data);
    return doc as unknown as NodeJS.ReadableStream;
  }
}
