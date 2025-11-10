import { Request, Response } from 'express';
import { PrismaClient, NfseStatus } from '@prisma/client';
import { Builder } from 'xml2js';
import { IssNetService } from '../services/issNetService';
import { CertificateService } from '../services/certificateService';
import { DanfseService } from '../services/danfseService';
import * as fs from 'fs';

const prisma = new PrismaClient();

// Helper para gerar XML ABRASF padrão Goiânia
const generateAbrasf XML = (nfse: any, company: any) => {
  const builder = new Builder({
    xmldec: { version: '1.0', encoding: 'UTF-8' },
    renderOpts: { pretty: true, indent: '  ' },
  });

  const rps = {
    'ns2:Rps': {
      $: {
        'xmlns:ns2': 'http://www.abrasf.org.br/nfse.xsd',
        'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
      },
      InfDeclaracaoPrestacaoServico: {
        $: { Id: `rps${nfse.numeroRps}` },
        Rps: {
          IdentificacaoRps: {
            Numero: nfse.numeroRps,
            Serie: nfse.serieRps,
            Tipo: nfse.tipoRps,
          },
          DataEmissao: new Date().toISOString().split('T')[0],
          Status: '1', // 1-Normal, 2-Cancelado
        },
        Competencia: nfse.competencia.toISOString().split('T')[0].substring(0, 7),
        Prestador: {
          CpfCnpj: {
            Cnpj: company.cnpj?.replace(/\D/g, ''),
          },
          InscricaoMunicipal: company.inscricaoMunicipal,
        },
        Tomador: {
          IdentificacaoTomador: {
            CpfCnpj: {
              [nfse.tomadorCpfCnpj?.length === 11 ? 'Cpf' : 'Cnpj']: nfse.tomadorCpfCnpj?.replace(/\D/g, ''),
            },
          },
          RazaoSocial: nfse.tomadorNome,
          Endereco: nfse.tomadorEndereco
            ? {
                Endereco: nfse.tomadorEndereco,
                Numero: nfse.tomadorNumero || 'S/N',
                Complemento: nfse.tomadorComplemento,
                Bairro: nfse.tomadorBairro,
                CodigoMunicipio: nfse.tomadorCodigoMunicipio || '5208707', // Goiânia
                Uf: nfse.tomadorUf || 'GO',
                Cep: nfse.tomadorCep?.replace(/\D/g, ''),
              }
            : undefined,
          Contato: {
            Email: nfse.tomadorEmail,
            Telefone: nfse.tomadorTelefone?.replace(/\D/g, ''),
          },
        },
        Servico: {
          Valores: {
            ValorServicos: Number(nfse.valorServicos).toFixed(2),
            ValorDeducoes: Number(nfse.valorDeducoes).toFixed(2),
            ValorPis: Number(nfse.valorPis).toFixed(2),
            ValorCofins: Number(nfse.valorCofins).toFixed(2),
            ValorInss: Number(nfse.valorInss).toFixed(2),
            ValorIr: Number(nfse.valorIr).toFixed(2),
            ValorCsll: Number(nfse.valorCsll).toFixed(2),
            OutrasRetencoes: Number(nfse.outrasRetencoes).toFixed(2),
            ValorIss: Number(nfse.valorIss).toFixed(2),
            Aliquota: Number(nfse.aliquotaIss).toFixed(2),
            DescontoIncondicionado: Number(nfse.descontoIncondicionado).toFixed(2),
            DescontoCondicionado: Number(nfse.descontoCondicionado).toFixed(2),
          },
          IssRetido: nfse.issRetido ? '1' : '2', // 1-Sim, 2-Não
          ResponsavelRetencao: nfse.responsavelRetencao,
          ItemListaServico: nfse.itemListaServico,
          CodigoCnae: nfse.codigoCnae,
          CodigoTributacaoMunicipio: nfse.codigoTributacaoMunicipio,
          Discriminacao: nfse.discriminacao,
          CodigoMunicipio: nfse.municipioIncidencia || '5208707', // Goiânia
        },
        IntermediarioServico: undefined, // Pode ser implementado se necessário
        ConstrucaoCivil: undefined, // Pode ser implementado se necessário
        RegimeEspecialTributacao: company.regimeTributacao,
        OptanteSimplesNacional: company.optanteSimplesNacional ? '1' : '2',
        IncentivoFiscal: company.incentivadorCultural ? '1' : '2',
      },
    },
  };

  return builder.buildObject(rps);
};

// List NFS-e with pagination
export const listNfse = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, search = '', status } = req.query;
    const companyId = req.user!.companyId;

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where: any = {
      companyId,
      ...(search && {
        OR: [
          { numero: { contains: search as string, mode: 'insensitive' } },
          { numeroRps: { contains: search as string, mode: 'insensitive' } },
          { tomadorNome: { contains: search as string, mode: 'insensitive' } },
        ],
      }),
      ...(status && { status: status as NfseStatus }),
    };

    const [nfses, total] = await Promise.all([
      prisma.nfse.findMany({
        where,
        skip,
        take,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
            },
          },
          serviceOrder: {
            select: {
              id: true,
              orderNumber: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.nfse.count({ where }),
    ]);

    const totalPages = Math.ceil(total / take);

    res.json({
      data: nfses,
      pagination: {
        page: Number(page),
        limit: take,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Error listing NFS-e:', error);
    res.status(500).json({ error: 'Erro ao listar NFS-e' });
  }
};

// Get NFS-e by ID
export const getNfse = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;

    const nfse = await prisma.nfse.findFirst({
      where: { id, companyId },
      include: {
        customer: true,
        serviceOrder: {
          include: {
            items: true,
          },
        },
      },
    });

    if (!nfse) {
      return res.status(404).json({ error: 'NFS-e não encontrada' });
    }

    res.json(nfse);
  } catch (error) {
    console.error('Error getting NFS-e:', error);
    res.status(500).json({ error: 'Erro ao buscar NFS-e' });
  }
};

// Create NFS-e (draft)
export const createNfse = async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const data = req.body;

    // Gerar número de RPS
    const lastRps = await prisma.nfse.findFirst({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });

    const numeroRps = lastRps
      ? (parseInt(lastRps.numeroRps) + 1).toString().padStart(6, '0')
      : '000001';

    // Calcular valores
    const valorServicos = Number(data.valorServicos);
    const valorDeducoes = Number(data.valorDeducoes || 0);
    const descontoIncondicionado = Number(data.descontoIncondicionado || 0);
    const baseCalculo = valorServicos - valorDeducoes;
    const aliquotaIss = Number(data.aliquotaIss || 5);
    const valorIss = (baseCalculo * aliquotaIss) / 100;
    const valorLiquidoNfse = baseCalculo - descontoIncondicionado - (data.issRetido ? valorIss : 0);

    const nfse = await prisma.nfse.create({
      data: {
        ...data,
        companyId,
        numeroRps,
        baseCalculo,
        valorIss,
        valorLiquidoNfse,
        status: 'RASCUNHO',
      },
      include: {
        customer: true,
        serviceOrder: true,
      },
    });

    res.status(201).json(nfse);
  } catch (error) {
    console.error('Error creating NFS-e:', error);
    res.status(500).json({ error: 'Erro ao criar NFS-e' });
  }
};

// Update NFS-e (only drafts)
export const updateNfse = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;
    const data = req.body;

    const nfse = await prisma.nfse.findFirst({
      where: { id, companyId },
    });

    if (!nfse) {
      return res.status(404).json({ error: 'NFS-e não encontrada' });
    }

    if (nfse.status !== 'RASCUNHO') {
      return res.status(400).json({ error: 'Apenas NFS-e em rascunho podem ser editadas' });
    }

    // Recalcular valores
    const valorServicos = Number(data.valorServicos || nfse.valorServicos);
    const valorDeducoes = Number(data.valorDeducoes || nfse.valorDeducoes);
    const descontoIncondicionado = Number(data.descontoIncondicionado || nfse.descontoIncondicionado);
    const baseCalculo = valorServicos - valorDeducoes;
    const aliquotaIss = Number(data.aliquotaIss || nfse.aliquotaIss);
    const valorIss = (baseCalculo * aliquotaIss) / 100;
    const issRetido = data.issRetido !== undefined ? data.issRetido : nfse.issRetido;
    const valorLiquidoNfse = baseCalculo - descontoIncondicionado - (issRetido ? valorIss : 0);

    const updated = await prisma.nfse.update({
      where: { id },
      data: {
        ...data,
        baseCalculo,
        valorIss,
        valorLiquidoNfse,
      },
      include: {
        customer: true,
        serviceOrder: true,
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating NFS-e:', error);
    res.status(500).json({ error: 'Erro ao atualizar NFS-e' });
  }
};

// Send NFS-e (emitir)
export const sendNfse = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;
    const { useSimulation = false } = req.body; // Permite simular para testes

    const nfse = await prisma.nfse.findFirst({
      where: { id, companyId },
    });

    if (!nfse) {
      return res.status(404).json({ error: 'NFS-e não encontrada' });
    }

    if (nfse.status !== 'RASCUNHO') {
      return res.status(400).json({ error: 'Apenas NFS-e em rascunho podem ser enviadas' });
    }

    // Buscar dados da empresa
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      return res.status(404).json({ error: 'Empresa não encontrada' });
    }

    // Validar dados fiscais
    if (!company.cnpj || !company.inscricaoMunicipal) {
      return res.status(400).json({
        error: 'Dados fiscais incompletos. Configure CNPJ e Inscrição Municipal da empresa.',
      });
    }

    // Gerar XML ABRASF
    const xmlEnvio = generateAbrasfXML(nfse, company);

    // Se estiver usando simulação (para testes sem certificado)
    if (useSimulation) {
      const numeroNfse = `${new Date().getFullYear()}${nfse.numeroRps}`;
      const codigoVerificacao = Math.random().toString(36).substring(2, 10).toUpperCase();

      const updated = await prisma.nfse.update({
        where: { id },
        data: {
          status: 'AUTORIZADA',
          numero: numeroNfse,
          codigoVerificacao,
          dataEmissao: new Date(),
          xmlEnvio,
          protocolo: Math.random().toString(36).substring(2, 15),
        },
        include: {
          customer: true,
          serviceOrder: true,
        },
      });

      return res.json(updated);
    }

    // Integração real com a prefeitura
    // Validar certificado
    if (!company.certificadoPfx || !company.certificadoSenha) {
      return res.status(400).json({
        error: 'Certificado digital não configurado. Configure o certificado A1 da empresa.',
      });
    }

    // Descriptografar senha do certificado
    const certificadoSenha = CertificateService.decryptPassword(company.certificadoSenha);

    // Validar certificado
    const certValidation = await CertificateService.validateCertificate(
      company.certificadoPfx,
      certificadoSenha
    );

    if (!certValidation.valid) {
      return res.status(400).json({
        error: `Certificado inválido: ${certValidation.message}`,
      });
    }

    // Criar serviço de integração
    const issNetService = new IssNetService({
      environment: process.env.NFSE_ENVIRONMENT as 'production' | 'homologation' || 'homologation',
      certificatePath: company.certificadoPfx,
      certificatePassword: certificadoSenha,
    });

    // Enviar RPS para a prefeitura
    const result = await issNetService.sendRps(xmlEnvio);

    if (result.success) {
      const updated = await prisma.nfse.update({
        where: { id },
        data: {
          status: 'AUTORIZADA',
          numero: result.numero,
          codigoVerificacao: result.codigoVerificacao,
          dataEmissao: result.dataEmissao || new Date(),
          protocolo: result.protocolo,
          xmlEnvio,
          xmlRetorno: result.xmlRetorno,
        },
        include: {
          customer: true,
          serviceOrder: true,
        },
      });

      res.json(updated);
    } else {
      // Erro ao enviar
      const updated = await prisma.nfse.update({
        where: { id },
        data: {
          status: 'ERRO',
          xmlEnvio,
          xmlRetorno: result.xmlRetorno,
          mensagemErro: result.errors?.join('; '),
        },
        include: {
          customer: true,
          serviceOrder: true,
        },
      });

      res.status(400).json({
        error: 'Erro ao enviar NFS-e para a prefeitura',
        details: result.errors,
        nfse: updated,
      });
    }
  } catch (error) {
    console.error('Error sending NFS-e:', error);
    res.status(500).json({ error: `Erro ao enviar NFS-e: ${(error as Error).message}` });
  }
};

// Cancel NFS-e
export const cancelNfse = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;
    const { useSimulation = false, motivo = 'Cancelamento solicitado pelo prestador' } = req.body;

    const nfse = await prisma.nfse.findFirst({
      where: { id, companyId },
    });

    if (!nfse) {
      return res.status(404).json({ error: 'NFS-e não encontrada' });
    }

    if (nfse.status !== 'AUTORIZADA') {
      return res.status(400).json({ error: 'Apenas NFS-e autorizadas podem ser canceladas' });
    }

    if (!nfse.numero) {
      return res.status(400).json({ error: 'NFS-e sem número de nota' });
    }

    // Se estiver usando simulação
    if (useSimulation) {
      const updated = await prisma.nfse.update({
        where: { id },
        data: {
          status: 'CANCELADA',
        },
        include: {
          customer: true,
          serviceOrder: true,
        },
      });

      return res.json(updated);
    }

    // Buscar dados da empresa
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      return res.status(404).json({ error: 'Empresa não encontrada' });
    }

    // Validar certificado
    if (!company.certificadoPfx || !company.certificadoSenha || !company.cnpj || !company.inscricaoMunicipal) {
      return res.status(400).json({
        error: 'Dados fiscais ou certificado não configurados.',
      });
    }

    // Descriptografar senha do certificado
    const certificadoSenha = CertificateService.decryptPassword(company.certificadoSenha);

    // Criar serviço de integração
    const issNetService = new IssNetService({
      environment: process.env.NFSE_ENVIRONMENT as 'production' | 'homologation' || 'homologation',
      certificatePath: company.certificadoPfx,
      certificatePassword: certificadoSenha,
    });

    // Cancelar na prefeitura
    const result = await issNetService.cancelNfse(
      nfse.numero,
      company.cnpj,
      company.inscricaoMunicipal,
      '1',
      motivo
    );

    if (result.success) {
      const updated = await prisma.nfse.update({
        where: { id },
        data: {
          status: 'CANCELADA',
          xmlRetorno: result.xmlRetorno,
        },
        include: {
          customer: true,
          serviceOrder: true,
        },
      });

      res.json(updated);
    } else {
      res.status(400).json({
        error: 'Erro ao cancelar NFS-e na prefeitura',
        details: result.errors,
      });
    }
  } catch (error) {
    console.error('Error canceling NFS-e:', error);
    res.status(500).json({ error: `Erro ao cancelar NFS-e: ${(error as Error).message}` });
  }
};

// Delete NFS-e (only drafts)
export const deleteNfse = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;

    const nfse = await prisma.nfse.findFirst({
      where: { id, companyId },
    });

    if (!nfse) {
      return res.status(404).json({ error: 'NFS-e não encontrada' });
    }

    if (nfse.status !== 'RASCUNHO') {
      return res.status(400).json({ error: 'Apenas NFS-e em rascunho podem ser deletadas' });
    }

    await prisma.nfse.delete({ where: { id } });

    res.json({ message: 'NFS-e deletada com sucesso' });
  } catch (error) {
    console.error('Error deleting NFS-e:', error);
    res.status(500).json({ error: 'Erro ao deletar NFS-e' });
  }
};

// Generate PDF (DANFSE)
export const generatePdfNfse = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;

    const nfse = await prisma.nfse.findFirst({
      where: { id, companyId },
      include: {
        customer: true,
        company: true,
      },
    });

    if (!nfse) {
      return res.status(404).json({ error: 'NFS-e não encontrada' });
    }

    if (nfse.status !== 'AUTORIZADA') {
      return res.status(400).json({ error: 'Apenas NFS-e autorizadas podem gerar PDF' });
    }

    const company = nfse.company;

    // Preparar dados para o PDF
    const danfseData = {
      // NFS-e
      numero: nfse.numero,
      codigoVerificacao: nfse.codigoVerificacao,
      dataEmissao: nfse.dataEmissao || undefined,
      competencia: nfse.competencia,

      // Prestador
      prestadorNome: company.name,
      prestadorCnpj: company.cnpj,
      prestadorInscricaoMunicipal: company.inscricaoMunicipal,
      prestadorEndereco: company.address,
      prestadorCidade: company.city,
      prestadorUf: company.state,
      prestadorCep: company.zipCode,
      prestadorTelefone: company.phone,
      prestadorEmail: company.email,

      // Tomador
      tomadorNome: nfse.tomadorNome,
      tomadorCpfCnpj: nfse.tomadorCpfCnpj,
      tomadorEmail: nfse.tomadorEmail,
      tomadorTelefone: nfse.tomadorTelefone,
      tomadorEndereco: nfse.tomadorEndereco,
      tomadorNumero: nfse.tomadorNumero,
      tomadorComplemento: nfse.tomadorComplemento,
      tomadorBairro: nfse.tomadorBairro,
      tomadorCidade: nfse.tomadorCidade,
      tomadorUf: nfse.tomadorUf,
      tomadorCep: nfse.tomadorCep,

      // Serviço
      discriminacao: nfse.discriminacao,
      itemListaServico: nfse.itemListaServico,
      codigoCnae: nfse.codigoCnae,

      // Valores
      valorServicos: Number(nfse.valorServicos),
      valorDeducoes: Number(nfse.valorDeducoes),
      valorPis: Number(nfse.valorPis),
      valorCofins: Number(nfse.valorCofins),
      valorInss: Number(nfse.valorInss),
      valorIr: Number(nfse.valorIr),
      valorCsll: Number(nfse.valorCsll),
      outrasRetencoes: Number(nfse.outrasRetencoes),
      valorIss: Number(nfse.valorIss),
      aliquotaIss: Number(nfse.aliquotaIss),
      descontoIncondicionado: Number(nfse.descontoIncondicionado),
      baseCalculo: Number(nfse.baseCalculo),
      valorLiquidoNfse: Number(nfse.valorLiquidoNfse),
      issRetido: nfse.issRetido,
    };

    // Gerar PDF
    const pdfBuffer = await DanfseService.generatePdf(danfseData);

    // Definir headers para download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="DANFSE_${nfse.numero || nfse.numeroRps}.pdf"`
    );
    res.setHeader('Content-Length', pdfBuffer.length);

    // Enviar PDF
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: `Erro ao gerar PDF: ${(error as Error).message}` });
  }
};
