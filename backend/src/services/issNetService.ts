import axios, { AxiosInstance } from 'axios';
import { XmlSignatureService } from './xmlSignatureService';
import { parseStringPromise } from 'xml2js';
import https from 'https';
import fs from 'fs';

// URLs da API ISS Net Online de Goiânia
// NOTA: Ajuste estas URLs conforme a documentação oficial da prefeitura
const API_URLS = {
  production: 'https://nfse.goiania.go.gov.br/ws/nfse.asmx',
  homologation: 'https://homologacao.nfse.goiania.go.gov.br/ws/nfse.asmx',
};

export interface IssNetConfig {
  environment: 'production' | 'homologation';
  certificatePath: string;
  certificatePassword: string;
}

export interface SendRpsResponse {
  success: boolean;
  numero?: string;
  codigoVerificacao?: string;
  dataEmissao?: Date;
  protocolo?: string;
  xmlRetorno?: string;
  errors?: string[];
}

export interface CancelNfseResponse {
  success: boolean;
  dataCancelamento?: Date;
  xmlRetorno?: string;
  errors?: string[];
}

export interface ConsultNfseResponse {
  success: boolean;
  numero?: string;
  status?: string;
  xmlRetorno?: string;
  errors?: string[];
}

export class IssNetService {
  private apiUrl: string;
  private config: IssNetConfig;
  private httpClient: AxiosInstance;

  constructor(config: IssNetConfig) {
    this.config = config;
    this.apiUrl = API_URLS[config.environment];

    // Cria cliente HTTP com suporte a certificado
    this.httpClient = axios.create({
      baseURL: this.apiUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
      },
      httpsAgent: this.createHttpsAgent(),
    });
  }

  /**
   * Cria agente HTTPS com certificado digital
   */
  private createHttpsAgent(): https.Agent {
    try {
      // Lê o certificado PFX
      const pfx = fs.readFileSync(this.config.certificatePath);

      return new https.Agent({
        pfx,
        passphrase: this.config.certificatePassword,
        rejectUnauthorized: this.config.environment === 'production',
      });
    } catch (error) {
      console.error('Erro ao criar agente HTTPS:', error);
      throw new Error('Falha ao configurar certificado SSL');
    }
  }

  /**
   * Envia RPS para geração de NFS-e
   */
  async sendRps(xmlRps: string): Promise<SendRpsResponse> {
    try {
      // Assina o XML com o certificado
      const signedXml = await XmlSignatureService.signXml(
        xmlRps,
        this.config.certificatePath,
        this.config.certificatePassword,
        'InfDeclaracaoPrestacaoServico'
      );

      // Cria envelope SOAP
      const soapEnvelope = XmlSignatureService.createSoapEnvelope(
        signedXml,
        'RecepcionarLoteRps'
      );

      // Envia para a prefeitura
      const response = await this.httpClient.post('', soapEnvelope, {
        headers: {
          SOAPAction: 'http://www.abrasf.org.br/nfse.xsd/RecepcionarLoteRps',
        },
      });

      // Parseia a resposta XML
      const result = await this.parseResponse(response.data);

      // Extrai informações da resposta
      if (result.success && result.data) {
        return {
          success: true,
          numero: result.data.Numero?.[0],
          codigoVerificacao: result.data.CodigoVerificacao?.[0],
          dataEmissao: result.data.DataEmissao?.[0]
            ? new Date(result.data.DataEmissao[0])
            : undefined,
          protocolo: result.data.Protocolo?.[0],
          xmlRetorno: response.data,
        };
      } else {
        return {
          success: false,
          errors: result.errors,
          xmlRetorno: response.data,
        };
      }
    } catch (error) {
      console.error('Erro ao enviar RPS:', error);
      return {
        success: false,
        errors: [
          `Erro de comunicação com a prefeitura: ${(error as Error).message}`,
        ],
      };
    }
  }

  /**
   * Consulta NFS-e por número
   */
  async consultNfse(
    numero: string,
    cnpjPrestador: string,
    inscricaoMunicipal: string
  ): Promise<ConsultNfseResponse> {
    try {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ConsultarNfseRpsEnvio xmlns="http://www.abrasf.org.br/nfse.xsd">
  <IdentificacaoRps>
    <Numero>${numero}</Numero>
  </IdentificacaoRps>
  <Prestador>
    <CpfCnpj>
      <Cnpj>${cnpjPrestador.replace(/\D/g, '')}</Cnpj>
    </CpfCnpj>
    <InscricaoMunicipal>${inscricaoMunicipal}</InscricaoMunicipal>
  </Prestador>
</ConsultarNfseRpsEnvio>`;

      const soapEnvelope = XmlSignatureService.createSoapEnvelope(xml, 'ConsultarNfseRps');

      const response = await this.httpClient.post('', soapEnvelope, {
        headers: {
          SOAPAction: 'http://www.abrasf.org.br/nfse.xsd/ConsultarNfseRps',
        },
      });

      const result = await this.parseResponse(response.data);

      if (result.success && result.data) {
        return {
          success: true,
          numero: result.data.Numero?.[0],
          status: result.data.Status?.[0] || 'AUTORIZADA',
          xmlRetorno: response.data,
        };
      } else {
        return {
          success: false,
          errors: result.errors,
          xmlRetorno: response.data,
        };
      }
    } catch (error) {
      console.error('Erro ao consultar NFS-e:', error);
      return {
        success: false,
        errors: [`Erro ao consultar NFS-e: ${(error as Error).message}`],
      };
    }
  }

  /**
   * Cancela uma NFS-e
   */
  async cancelNfse(
    numero: string,
    cnpjPrestador: string,
    inscricaoMunicipal: string,
    codigoCancelamento: string = '1',
    motivoCancelamento: string = 'Cancelamento solicitado pelo prestador'
  ): Promise<CancelNfseResponse> {
    try {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<CancelarNfseEnvio xmlns="http://www.abrasf.org.br/nfse.xsd">
  <Pedido>
    <InfPedidoCancelamento Id="cancel_${numero}">
      <IdentificacaoNfse>
        <Numero>${numero}</Numero>
        <CpfCnpj>
          <Cnpj>${cnpjPrestador.replace(/\D/g, '')}</Cnpj>
        </CpfCnpj>
        <InscricaoMunicipal>${inscricaoMunicipal}</InscricaoMunicipal>
      </IdentificacaoNfse>
      <CodigoCancelamento>${codigoCancelamento}</CodigoCancelamento>
    </InfPedidoCancelamento>
  </Pedido>
</CancelarNfseEnvio>`;

      // Assina o pedido de cancelamento
      const signedXml = await XmlSignatureService.signXml(
        xml,
        this.config.certificatePath,
        this.config.certificatePassword,
        `cancel_${numero}`
      );

      const soapEnvelope = XmlSignatureService.createSoapEnvelope(signedXml, 'CancelarNfse');

      const response = await this.httpClient.post('', soapEnvelope, {
        headers: {
          SOAPAction: 'http://www.abrasf.org.br/nfse.xsd/CancelarNfse',
        },
      });

      const result = await this.parseResponse(response.data);

      if (result.success) {
        return {
          success: true,
          dataCancelamento: new Date(),
          xmlRetorno: response.data,
        };
      } else {
        return {
          success: false,
          errors: result.errors,
          xmlRetorno: response.data,
        };
      }
    } catch (error) {
      console.error('Erro ao cancelar NFS-e:', error);
      return {
        success: false,
        errors: [`Erro ao cancelar NFS-e: ${(error as Error).message}`],
      };
    }
  }

  /**
   * Consulta lote de RPS
   */
  async consultLote(
    protocolo: string,
    cnpjPrestador: string,
    inscricaoMunicipal: string
  ): Promise<any> {
    try {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ConsultarLoteRpsEnvio xmlns="http://www.abrasf.org.br/nfse.xsd">
  <Prestador>
    <CpfCnpj>
      <Cnpj>${cnpjPrestador.replace(/\D/g, '')}</Cnpj>
    </CpfCnpj>
    <InscricaoMunicipal>${inscricaoMunicipal}</InscricaoMunicipal>
  </Prestador>
  <Protocolo>${protocolo}</Protocolo>
</ConsultarLoteRpsEnvio>`;

      const soapEnvelope = XmlSignatureService.createSoapEnvelope(xml, 'ConsultarLoteRps');

      const response = await this.httpClient.post('', soapEnvelope, {
        headers: {
          SOAPAction: 'http://www.abrasf.org.br/nfse.xsd/ConsultarLoteRps',
        },
      });

      return await this.parseResponse(response.data);
    } catch (error) {
      console.error('Erro ao consultar lote:', error);
      return {
        success: false,
        errors: [`Erro ao consultar lote: ${(error as Error).message}`],
      };
    }
  }

  /**
   * Parseia a resposta XML da prefeitura
   */
  private async parseResponse(xmlResponse: string): Promise<{
    success: boolean;
    data?: any;
    errors?: string[];
  }> {
    try {
      const parsed = await parseStringPromise(xmlResponse, {
        explicitArray: true,
        ignoreAttrs: false,
      });

      // Extrai o corpo da resposta SOAP
      const soapBody =
        parsed['soap:Envelope']?.[' soap:Body']?.[0] ||
        parsed['soapenv:Envelope']?.['soapenv:Body']?.[0];

      if (!soapBody) {
        return {
          success: false,
          errors: ['Resposta SOAP inválida'],
        };
      }

      // Procura por erros na resposta
      const listaMensagens =
        soapBody.ListaMensagemRetorno?.[0]?.MensagemRetorno || [];

      if (listaMensagens.length > 0) {
        const errors = listaMensagens.map(
          (msg: any) => `${msg.Codigo?.[0]}: ${msg.Mensagem?.[0]}`
        );
        return {
          success: false,
          errors,
        };
      }

      // Extrai dados da NFS-e gerada
      const nfse =
        soapBody.GerarNfseResposta?.[0]?.ListaNfse?.[0]?.CompNfse?.[0]?.Nfse?.[0] ||
        soapBody.ConsultarNfseRpsResposta?.[0]?.CompNfse?.[0]?.Nfse?.[0];

      if (nfse) {
        return {
          success: true,
          data: nfse.InfNfse?.[0] || nfse,
        };
      }

      // Se chegou aqui e não tem erros nem NFS-e, considera sucesso genérico
      return {
        success: true,
        data: soapBody,
      };
    } catch (error) {
      console.error('Erro ao parsear resposta XML:', error);
      return {
        success: false,
        errors: [`Erro ao processar resposta: ${(error as Error).message}`],
      };
    }
  }

  /**
   * Testa a conexão com a API da prefeitura
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.httpClient.get('?wsdl');
      return response.status === 200;
    } catch (error) {
      console.error('Erro ao testar conexão:', error);
      return false;
    }
  }
}
