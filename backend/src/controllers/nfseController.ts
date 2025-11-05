import { Request, Response } from 'express';
import { PrismaClient, NfseStatus } from '@prisma/client';
import { Builder } from 'xml2js';

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

    // Aqui você deve implementar a integração com a API da Prefeitura de Goiânia
    // Por enquanto, vamos simular uma resposta de sucesso

    // NOTA: Para produção, você precisa:
    // 1. Certificado Digital A1
    // 2. Assinar o XML com o certificado
    // 3. Enviar para o webservice da prefeitura
    // 4. Processar o retorno

    // Simulação (remover em produção):
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

    res.json(updated);
  } catch (error) {
    console.error('Error sending NFS-e:', error);
    res.status(500).json({ error: 'Erro ao enviar NFS-e' });
  }
};

// Cancel NFS-e
export const cancelNfse = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;

    const nfse = await prisma.nfse.findFirst({
      where: { id, companyId },
    });

    if (!nfse) {
      return res.status(404).json({ error: 'NFS-e não encontrada' });
    }

    if (nfse.status !== 'AUTORIZADA') {
      return res.status(400).json({ error: 'Apenas NFS-e autorizadas podem ser canceladas' });
    }

    // Aqui você deve implementar o cancelamento via API da prefeitura
    // Por enquanto, vamos apenas atualizar o status

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

    res.json(updated);
  } catch (error) {
    console.error('Error canceling NFS-e:', error);
    res.status(500).json({ error: 'Erro ao cancelar NFS-e' });
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

    // Aqui você deve implementar a geração do PDF (DANFSE)
    // Pode usar bibliotecas como pdfkit, puppeteer, ou buscar o PDF na prefeitura

    res.json({
      message: 'Geração de PDF ainda não implementada',
      nfse,
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Erro ao gerar PDF' });
  }
};
