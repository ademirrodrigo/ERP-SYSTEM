import { SignedXml } from 'xml-crypto';
import * as forge from 'node-forge';
import { CertificateService } from './certificateService';

export class XmlSignatureService {
  /**
   * Assina um XML com o certificado digital
   */
  static async signXml(
    xml: string,
    pfxPath: string,
    password: string,
    referenceId?: string
  ): Promise<string> {
    try {
      // Carrega o certificado
      const certInfo = await CertificateService.loadCertificate(pfxPath, password);

      if (!certInfo.isValid) {
        throw new Error('Certificado inválido ou expirado');
      }

      // Converte a chave privada para PEM
      const privateKeyPem = forge.pki.privateKeyToPem(certInfo.privateKey);

      // Converte o certificado para PEM (sem cabeçalhos)
      const certPem = forge.pki.certificateToPem(certInfo.certificate);
      const certBase64 = certPem
        .replace(/-----BEGIN CERTIFICATE-----/, '')
        .replace(/-----END CERTIFICATE-----/, '')
        .replace(/\n/g, '');

      // Cria a assinatura XML
      const sig = new SignedXml();

      // Define a chave privada
      sig.signingKey = privateKeyPem;

      // Define o algoritmo de assinatura
      sig.signatureAlgorithm = 'http://www.w3.org/2000/09/xmldsig#rsa-sha1';
      sig.canonicalizationAlgorithm = 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315';

      // Adiciona referência ao elemento a ser assinado
      const reference = referenceId || '';
      sig.addReference(
        `//*[@Id='${reference}']`,
        [
          'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
          'http://www.w3.org/TR/2001/REC-xml-c14n-20010315',
        ],
        'http://www.w3.org/2000/09/xmldsig#sha1'
      );

      // Adiciona informações do certificado
      sig.keyInfoProvider = {
        getKeyInfo: () => {
          return `<X509Data><X509Certificate>${certBase64}</X509Certificate></X509Data>`;
        },
      };

      // Computa a assinatura
      sig.computeSignature(xml, {
        location: { reference: `//*[local-name(.)='Rps']`, action: 'append' },
      });

      // Retorna o XML assinado
      return sig.getSignedXml();
    } catch (error) {
      throw new Error(`Erro ao assinar XML: ${(error as Error).message}`);
    }
  }

  /**
   * Verifica se um XML está assinado corretamente
   */
  static verifySignature(signedXml: string): boolean {
    try {
      const sig = new SignedXml();
      sig.loadSignature(signedXml);
      return sig.checkSignature(signedXml);
    } catch (error) {
      console.error('Erro ao verificar assinatura:', error);
      return false;
    }
  }

  /**
   * Extrai informações da assinatura do XML
   */
  static getSignatureInfo(signedXml: string): {
    isSigned: boolean;
    signatureMethod?: string;
    certificateIssuer?: string;
  } {
    try {
      const sig = new SignedXml();
      sig.loadSignature(signedXml);

      // Verifica se tem assinatura
      const hasSignature = signedXml.includes('<Signature');

      if (!hasSignature) {
        return { isSigned: false };
      }

      return {
        isSigned: true,
        signatureMethod: sig.signatureAlgorithm,
      };
    } catch (error) {
      return { isSigned: false };
    }
  }

  /**
   * Assina um lote de RPS (múltiplos XMLs)
   */
  static async signBatch(
    xmlArray: string[],
    pfxPath: string,
    password: string
  ): Promise<string[]> {
    const signedXmls: string[] = [];

    for (let i = 0; i < xmlArray.length; i++) {
      const signedXml = await this.signXml(xmlArray[i], pfxPath, password, `rps${i + 1}`);
      signedXmls.push(signedXml);
    }

    return signedXmls;
  }

  /**
   * Cria um envelope SOAP para envio à prefeitura
   */
  static createSoapEnvelope(signedXml: string, action: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
               xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <soap:Header/>
  <soap:Body>
    <${action} xmlns="http://www.abrasf.org.br/nfse.xsd">
      ${signedXml}
    </${action}>
  </soap:Body>
</soap:Envelope>`;
  }
}
