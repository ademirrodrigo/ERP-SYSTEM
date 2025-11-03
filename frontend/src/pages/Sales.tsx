import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Sale, PaginatedResponse } from '../types';
import { Plus, ShoppingCart } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Sales = () => {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['sales', page],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<Sale>>('/sales', {
        params: { page, limit: 10 },
      });
      return response.data;
    },
  });

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      CASH: 'Dinheiro',
      DEBIT_CARD: 'Cartão Débito',
      CREDIT_CARD: 'Cartão Crédito',
      PIX: 'PIX',
      BANK_SLIP: 'Boleto',
      CHECK: 'Cheque',
      OTHER: 'Outro',
    };
    return labels[method] || method;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Vendas</h1>
        <Link to="/sales/new" className="btn-primary flex items-center">
          <Plus className="w-5 h-5 mr-2" />
          Nova Venda
        </Link>
      </div>

      {/* Table */}
      <div className="card">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : data?.data.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">Nenhuma venda encontrada</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Número</th>
                    <th>Data</th>
                    <th>Cliente</th>
                    <th>Vendedor</th>
                    <th>Pagamento</th>
                    <th>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.data.map((sale) => (
                    <tr key={sale.id}>
                      <td className="font-medium">#{sale.saleNumber}</td>
                      <td>
                        {format(new Date(sale.date), 'dd/MM/yyyy HH:mm', {
                          locale: ptBR,
                        })}
                      </td>
                      <td>{sale.customer?.name || 'Cliente Avulso'}</td>
                      <td>{sale.user?.name || '-'}</td>
                      <td>{getPaymentMethodLabel(sale.paymentMethod)}</td>
                      <td className="font-medium">R$ {sale.total.toFixed(2)}</td>
                      <td>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            sale.status === 'COMPLETED'
                              ? 'bg-green-100 text-green-800'
                              : sale.status === 'PENDING'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {sale.status === 'COMPLETED'
                            ? 'Concluída'
                            : sale.status === 'PENDING'
                            ? 'Pendente'
                            : 'Cancelada'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data && data.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-6 border-t">
                <p className="text-sm text-gray-600">
                  Página {data.pagination.page} de {data.pagination.totalPages}
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="btn-secondary"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= data.pagination.totalPages}
                    className="btn-secondary"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Sales;
