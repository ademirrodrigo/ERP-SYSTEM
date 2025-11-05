export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'USER' | 'SALESPERSON' | 'CASHIER' | 'TECHNICIAN';
  companyId: string;
  avatar?: string;
  phone?: string;
  company?: Company;
}

export interface Company {
  id: string;
  name: string;
  cnpj?: string;
  email: string;
  phone?: string;
  plan: 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE';
  logo?: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  sku?: string;
  barcode?: string;
  price: number;
  cost?: number;
  stock: number;
  minStock: number;
  maxStock?: number;
  unit: string;
  isActive: boolean;
  categoryId?: string;
  category?: Category;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  cpf?: string;
  cnpj?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  creditLimit?: number;
  isActive: boolean;
}

export interface Sale {
  id: string;
  saleNumber: string;
  date: string;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: 'CASH' | 'DEBIT_CARD' | 'CREDIT_CARD' | 'PIX' | 'BANK_SLIP' | 'CHECK' | 'OTHER';
  notes?: string;
  customer?: Customer;
  user?: User;
  items: SaleItem[];
}

export interface SaleItem {
  id: string;
  quantity: number;
  price: number;
  discount: number;
  subtotal: number;
  product: Product;
}

export interface ServiceOrder {
  id: string;
  orderNumber: string;
  date: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DELIVERED' | 'CANCELLED';
  description: string;
  diagnosis?: string;
  solution?: string;
  subtotal: number;
  discount: number;
  total: number;
  customer?: Customer;
  technician?: User;
  items: ServiceOrderItem[];
}

export interface ServiceOrderItem {
  id: string;
  type: 'SERVICE' | 'PRODUCT';
  description: string;
  quantity: number;
  price: number;
  subtotal: number;
  product?: Product;
}

export interface AccountReceivable {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  paymentDate?: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  category?: string;
  notes?: string;
  customer?: Customer;
}

export interface AccountPayable {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  paymentDate?: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  category?: string;
  notes?: string;
  supplier?: {
    id: string;
    name: string;
  };
}

export interface Nfse {
  id: string;
  numero?: string;
  codigoVerificacao?: string;
  status: 'RASCUNHO' | 'ENVIADA' | 'AUTORIZADA' | 'CANCELADA' | 'ERRO';
  dataEmissao?: string;
  competencia: string;

  // RPS
  numeroRps: string;
  serieRps: string;
  tipoRps: number;

  // Tomador (Cliente)
  tomadorCpfCnpj?: string;
  tomadorNome: string;
  tomadorEmail?: string;
  tomadorTelefone?: string;
  tomadorEndereco?: string;
  tomadorNumero?: string;
  tomadorComplemento?: string;
  tomadorBairro?: string;
  tomadorCidade?: string;
  tomadorUf?: string;
  tomadorCep?: string;
  tomadorCodigoMunicipio?: string;

  // Serviço
  discriminacao: string;
  itemListaServico: string;
  codigoCnae?: string;
  codigoTributacaoMunicipio?: string;
  municipioIncidencia?: string;

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
  descontoCondicionado: number;
  baseCalculo: number;
  valorLiquidoNfse: number;

  // ISS
  issRetido: boolean;
  responsavelRetencao?: number;

  // Protocolo e XML
  protocolo?: string;
  xmlEnvio?: string;
  xmlRetorno?: string;
  mensagemErro?: string;

  // Relacionamentos
  customerId?: string;
  customer?: Customer;
  serviceOrderId?: string;
  serviceOrder?: ServiceOrder;

  createdAt?: string;
  updatedAt?: string;
}

export interface DashboardStats {
  monthSales: {
    total: number;
    count: number;
  };
  todaySales: {
    total: number;
    count: number;
  };
  overdueReceivables: {
    total: number;
    count: number;
  };
  pendingPayables: {
    total: number;
    count: number;
  };
  lowStockProducts: number;
  totalCustomers: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
