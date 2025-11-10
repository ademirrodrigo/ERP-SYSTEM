import * as forge from 'node-forge';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { promisify } from 'util';

const readFileAsync = promisify(fs.readFile);

// Chave de criptografia para senhas (em produção, use variável de ambiente)
const ENCRYPTION_KEY = process.env.CERT_ENCRYPTION_KEY || 'your-32-char-secret-key-here!!';
const ENCRYPTION_IV_LENGTH = 16;

export class CertificateService {
  /**
   * Criptografa a senha do certificado
   */
  static encryptPassword(password: string): string {
    const iv = crypto.randomBytes(ENCRYPTION_IV_LENGTH);
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32)),
      iv
    );
    let encrypted = cipher.update(password, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Descriptografa a senha do certificado
   */
  static decryptPassword(encryptedPassword: string): string {
    const parts = encryptedPassword.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32)),
      iv
    );
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Carrega e valida um certificado .pfx
   */
  static async loadCertificate(pfxPath: string, password: string): Promise<{
    certificate: forge.pki.Certificate;
    privateKey: forge.pki.PrivateKey;
    isValid: boolean;
    expiryDate: Date;
    subject: string;
    issuer: string;
  }> {
    try {
      // Lê o arquivo .pfx
      const pfxBuffer = await readFileAsync(pfxPath);
      const pfxBase64 = pfxBuffer.toString('base64');

      // Decodifica o PFX
      const p12Der = forge.util.decode64(pfxBase64);
      const p12Asn1 = forge.asn1.fromDer(p12Der);
      const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);

      // Extrai certificado e chave privada
      const bags = p12.getBags({ bagType: forge.pki.oids.certBag });
      const certBag = bags[forge.pki.oids.certBag]?.[0];

      if (!certBag) {
        throw new Error('Certificado não encontrado no arquivo PFX');
      }

      const certificate = certBag.cert as forge.pki.Certificate;

      const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
      const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0];

      if (!keyBag) {
        throw new Error('Chave privada não encontrada no arquivo PFX');
      }

      const privateKey = keyBag.key as forge.pki.PrivateKey;

      // Valida o certificado
      const now = new Date();
      const notBefore = certificate.validity.notBefore;
      const notAfter = certificate.validity.notAfter;
      const isValid = now >= notBefore && now <= notAfter;

      // Extrai informações do certificado
      const subject = certificate.subject.getField('CN')?.value || 'Não identificado';
      const issuer = certificate.issuer.getField('CN')?.value || 'Não identificado';

      return {
        certificate,
        privateKey,
        isValid,
        expiryDate: notAfter,
        subject,
        issuer,
      };
    } catch (error) {
      throw new Error(`Erro ao carregar certificado: ${(error as Error).message}`);
    }
  }

  /**
   * Valida se um certificado ainda é válido
   */
  static async validateCertificate(pfxPath: string, password: string): Promise<{
    valid: boolean;
    expiryDate: Date;
    daysUntilExpiry: number;
    message: string;
  }> {
    try {
      const certInfo = await this.loadCertificate(pfxPath, password);

      const now = new Date();
      const daysUntilExpiry = Math.floor(
        (certInfo.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      let message = '';
      if (!certInfo.isValid) {
        message = 'Certificado expirado ou ainda não válido';
      } else if (daysUntilExpiry <= 30) {
        message = `Certificado expira em ${daysUntilExpiry} dias`;
      } else {
        message = 'Certificado válido';
      }

      return {
        valid: certInfo.isValid,
        expiryDate: certInfo.expiryDate,
        daysUntilExpiry,
        message,
      };
    } catch (error) {
      return {
        valid: false,
        expiryDate: new Date(),
        daysUntilExpiry: 0,
        message: (error as Error).message,
      };
    }
  }

  /**
   * Extrai o certificado em formato PEM
   */
  static async getCertificatePem(pfxPath: string, password: string): Promise<string> {
    const certInfo = await this.loadCertificate(pfxPath, password);
    return forge.pki.certificateToPem(certInfo.certificate);
  }

  /**
   * Extrai a chave privada em formato PEM
   */
  static async getPrivateKeyPem(pfxPath: string, password: string): Promise<string> {
    const certInfo = await this.loadCertificate(pfxPath, password);
    return forge.pki.privateKeyToPem(certInfo.privateKey);
  }

  /**
   * Salva um certificado enviado via upload
   */
  static async saveCertificate(
    fileBuffer: Buffer,
    companyId: string,
    password: string
  ): Promise<{
    path: string;
    encryptedPassword: string;
    expiryDate: Date;
  }> {
    try {
      // Cria diretório de certificados se não existir
      const certsDir = './uploads/certificates';
      if (!fs.existsSync(certsDir)) {
        fs.mkdirSync(certsDir, { recursive: true });
      }

      // Salva o arquivo
      const filename = `cert_${companyId}_${Date.now()}.pfx`;
      const filepath = `${certsDir}/${filename}`;
      fs.writeFileSync(filepath, fileBuffer);

      // Valida o certificado
      const certInfo = await this.loadCertificate(filepath, password);

      if (!certInfo.isValid) {
        // Remove o arquivo se inválido
        fs.unlinkSync(filepath);
        throw new Error('Certificado inválido ou expirado');
      }

      // Criptografa a senha
      const encryptedPassword = this.encryptPassword(password);

      return {
        path: filepath,
        encryptedPassword,
        expiryDate: certInfo.expiryDate,
      };
    } catch (error) {
      throw new Error(`Erro ao salvar certificado: ${(error as Error).message}`);
    }
  }

  /**
   * Remove um certificado do sistema
   */
  static deleteCertificate(pfxPath: string): void {
    try {
      if (fs.existsSync(pfxPath)) {
        fs.unlinkSync(pfxPath);
      }
    } catch (error) {
      console.error('Erro ao deletar certificado:', error);
    }
  }
}
