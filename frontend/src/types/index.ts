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
