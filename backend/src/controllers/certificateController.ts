import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { CertificateService } from '../services/certificateService';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';

const prisma = new PrismaClient();

// Configurar multer para upload de certificados
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './uploads/certificates';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const companyId = req.user!.companyId;
    const filename = `cert_${companyId}_${Date.now()}${path.extname(file.originalname)}`;
    cb(null, filename);
  },
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Aceitar apenas arquivos .pfx ou .p12
  const allowedExtensions = ['.pfx', '.p12'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Apenas arquivos .pfx ou .p12 são permitidos'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

/**
 * Upload de certificado digital A1
 */
export const uploadCertificate = async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { password } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'Arquivo de certificado não enviado' });
    }

    if (!password) {
      // Remove o arquivo enviado se senha não foi fornecida
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Senha do certificado é obrigatória' });
    }

    const filePath = req.file.path;

    try {
      // Validar o certificado
      const certInfo = await CertificateService.loadCertificate(filePath, password);

      if (!certInfo.isValid) {
        fs.unlinkSync(filePath);
        return res.status(400).json({
          error: 'Certificado inválido ou expirado',
          details: `Expira em: ${certInfo.expiryDate.toLocaleDateString('pt-BR')}`,
        });
      }

      // Buscar empresa
      const company = await prisma.company.findUnique({
        where: { id: companyId },
      });

      if (!company) {
        fs.unlinkSync(filePath);
        return res.status(404).json({ error: 'Empresa não encontrada' });
      }

      // Remover certificado antigo se existir
      if (company.certificadoPfx && fs.existsSync(company.certificadoPfx)) {
        try {
          fs.unlinkSync(company.certificadoPfx);
        } catch (error) {
          console.error('Erro ao remover certificado antigo:', error);
        }
      }

      // Criptografar senha
      const encryptedPassword = CertificateService.encryptPassword(password);

      // Atualizar empresa com novo certificado
      const updated = await prisma.company.update({
        where: { id: companyId },
        data: {
          certificadoPfx: filePath,
          certificadoSenha: encryptedPassword,
          certificadoValidade: certInfo.expiryDate,
        },
      });

      res.json({
        message: 'Certificado digital instalado com sucesso',
        certificate: {
          subject: certInfo.subject,
          issuer: certInfo.issuer,
          expiryDate: certInfo.expiryDate,
          isValid: certInfo.isValid,
        },
      });
    } catch (error) {
      // Remove arquivo em caso de erro
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      throw error;
    }
  } catch (error) {
    console.error('Error uploading certificate:', error);
    res.status(500).json({
      error: 'Erro ao fazer upload do certificado',
      details: (error as Error).message,
    });
  }
};

/**
 * Verificar status do certificado
 */
export const getCertificateStatus = async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        certificadoPfx: true,
        certificadoSenha: true,
        certificadoValidade: true,
      },
    });

    if (!company) {
      return res.status(404).json({ error: 'Empresa não encontrada' });
    }

    if (!company.certificadoPfx || !company.certificadoSenha) {
      return res.json({
        hasCertificate: false,
        message: 'Nenhum certificado configurado',
      });
    }

    try {
      // Descriptografar senha
      const password = CertificateService.decryptPassword(company.certificadoSenha);

      // Validar certificado
      const validation = await CertificateService.validateCertificate(
        company.certificadoPfx,
        password
      );

      res.json({
        hasCertificate: true,
        valid: validation.valid,
        expiryDate: validation.expiryDate,
        daysUntilExpiry: validation.daysUntilExpiry,
        message: validation.message,
      });
    } catch (error) {
      res.json({
        hasCertificate: true,
        valid: false,
        message: 'Erro ao validar certificado: ' + (error as Error).message,
      });
    }
  } catch (error) {
    console.error('Error getting certificate status:', error);
    res.status(500).json({ error: 'Erro ao verificar status do certificado' });
  }
};

/**
 * Remover certificado digital
 */
export const deleteCertificate = async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;

    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      return res.status(404).json({ error: 'Empresa não encontrada' });
    }

    // Remover arquivo físico
    if (company.certificadoPfx && fs.existsSync(company.certificadoPfx)) {
      try {
        fs.unlinkSync(company.certificadoPfx);
      } catch (error) {
        console.error('Erro ao remover arquivo de certificado:', error);
      }
    }

    // Remover do banco de dados
    await prisma.company.update({
      where: { id: companyId },
      data: {
        certificadoPfx: null,
        certificadoSenha: null,
        certificadoValidade: null,
      },
    });

    res.json({ message: 'Certificado digital removido com sucesso' });
  } catch (error) {
    console.error('Error deleting certificate:', error);
    res.status(500).json({ error: 'Erro ao remover certificado' });
  }
};

/**
 * Atualizar dados fiscais da empresa
 */
export const updateFiscalData = async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const {
      inscricaoMunicipal,
      codigoMunicipio,
      regimeTributacao,
      optanteSimplesNacional,
      incentivadorCultural,
    } = req.body;

    const updated = await prisma.company.update({
      where: { id: companyId },
      data: {
        inscricaoMunicipal,
        codigoMunicipio,
        regimeTributacao: regimeTributacao ? parseInt(regimeTributacao) : null,
        optanteSimplesNacional: Boolean(optanteSimplesNacional),
        incentivadorCultural: Boolean(incentivadorCultural),
      },
    });

    res.json({
      message: 'Dados fiscais atualizados com sucesso',
      company: {
        inscricaoMunicipal: updated.inscricaoMunicipal,
        codigoMunicipio: updated.codigoMunicipio,
        regimeTributacao: updated.regimeTributacao,
        optanteSimplesNacional: updated.optanteSimplesNacional,
        incentivadorCultural: updated.incentivadorCultural,
      },
    });
  } catch (error) {
    console.error('Error updating fiscal data:', error);
    res.status(500).json({ error: 'Erro ao atualizar dados fiscais' });
  }
};

/**
 * Obter dados fiscais da empresa
 */
export const getFiscalData = async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        cnpj: true,
        inscricaoMunicipal: true,
        codigoMunicipio: true,
        regimeTributacao: true,
        optanteSimplesNacional: true,
        incentivadorCultural: true,
      },
    });

    if (!company) {
      return res.status(404).json({ error: 'Empresa não encontrada' });
    }

    res.json(company);
  } catch (error) {
    console.error('Error getting fiscal data:', error);
    res.status(500).json({ error: 'Erro ao buscar dados fiscais' });
  }
};
