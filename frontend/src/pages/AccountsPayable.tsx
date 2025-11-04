import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { AccountPayable, PaginatedResponse } from '../types';
import { toast } from 'sonner';
import { Plus, Search, Trash2, CreditCard, X, Check } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const AccountsPayable = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    dueDate: '',
    supplierId: '',
    category: '',
    notes: '',
  });
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['accounts-payable', page, search, statusFilter],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<AccountPayable> & { summary: any }>('/accounts-payable', {
        params: { page, limit: 10, search, status: statusFilter || undefined },
      });
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/accounts-payable', data),
    onSuccess: () => {
      toast.success('Conta a pagar criada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['accounts-payable'] });
      closeModal();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao criar conta');
    },
  });

  const markAsPaidMutation = useMutation({
    mutationFn: (id: string) => api.put(`/accounts-payable/${id}/mark-paid`, {}),
    onSuccess: () => {
      toast.success('Conta marcada como paga!');
      queryClient.invalidateQueries({ queryKey: ['accounts-payable'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao marcar como paga');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/accounts-payable/${id}`),
    onSuccess: () => {
      toast.success('Conta deletada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['accounts-payable'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao deletar conta');
    },
  });

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData({
      description: '',
      amount: '',
      dueDate: '',
      supplierId: '',
      category: '',
      notes: '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description.trim() || !formData.amount || !formData.dueDate) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    createMutation.mutate(formData);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza que deseja deletar esta conta?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleMarkAsPaid = (id: string) => {
    if (window.confirm('Confirmar pagamento desta conta?')) {
      markAsPaidMutation.mutate(id);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      PENDING: { label: 'Pendente', class: 'bg-yellow-100 text-yellow-800' },
      PAID: { label: 'Pago', class: 'bg-green-100 text-green-800' },
      OVERDUE: { label: 'Vencido', class: 'bg-red-100 text-red-800' },
      CANCELLED: { label: 'Cancelado', class: 'bg-gray-100 text-gray-800' },
    };
    const { label, class: className } = statusMap[status as keyof typeof statusMap] || statusMap.PENDING;
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${className}`}>{label}</span>;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Contas a Pagar</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nova Conta
        </button>
      </div>

      {/* Summary Cards */}
      {data?.summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="card bg-yellow-50 border-yellow-200">
            <p className="text-sm text-yellow-600 mb-1">Pendente</p>
            <p className="text-2xl font-bold text-yellow-900">
              R$ {Number(data.summary.pending || 0).toFixed(2)}
            </p>
          </div>
          <div className="card bg-red-50 border-red-200">
            <p className="text-sm text-red-600 mb-1">Vencido</p>
            <p className="text-2xl font-bold text-red-900">
              R$ {Number(data.summary.overdue || 0).toFixed(2)}
            </p>
          </div>
          <div className="card bg-green-50 border-green-200">
            <p className="text-sm text-green-600 mb-1">Pago</p>
            <p className="text-2xl font-bold text-green-900">
              R$ {Number(data.summary.paid || 0).toFixed(2)}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar contas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input"
          >
            <option value="">Todos os Status</option>
            <option value="PENDING">Pendente</option>
            <option value="OVERDUE">Vencido</option>
            <option value="PAID">Pago</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : data?.data.length === 0 ? (
          <div className="text-center py-12">
            <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">Nenhuma conta a pagar encontrada</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Descrição</th>
                    <th>Fornecedor</th>
                    <th>Vencimento</th>
                    <th>Valor</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.data.map((account) => (
                    <tr key={account.id}>
                      <td className="font-medium max-w-xs truncate">{account.description}</td>
                      <td>{account.supplier?.name || '-'}</td>
                      <td>
                        {format(new Date(account.dueDate), 'dd/MM/yyyy', { locale: ptBR })}
                      </td>
                      <td className="font-medium">R$ {Number(account.amount).toFixed(2)}</td>
                      <td>{getStatusBadge(account.status)}</td>
                      <td>
                        <div className="flex items-center space-x-2">
                          {account.status !== 'PAID' && account.status !== 'CANCELLED' && (
                            <button
                              onClick={() => handleMarkAsPaid(account.id)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                              title="Marcar como pago"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(account.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
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

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Nova Conta a Pagar</h2>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descrição <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="input"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Valor (R$) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.amount}
                      onChange={(e) =>
                        setFormData({ ...formData, amount: e.target.value })
                      }
                      className="input"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vencimento <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) =>
                        setFormData({ ...formData, dueDate: e.target.value })
                      }
                      className="input"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fornecedor (Opcional)
                  </label>
                  <input
                    type="text"
                    value={formData.supplierId}
                    className="input"
                    placeholder="Funcionalidade em desenvolvimento"
                    disabled
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoria (Opcional)
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    className="input"
                    placeholder="Ex: Aluguel, Fornecedor, Funcionário..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Observações
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    className="input"
                    rows={2}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
                <button
                  type="button"
                  onClick={closeModal}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="btn-primary"
                >
                  {createMutation.isPending ? 'Salvando...' : 'Criar Conta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountsPayable;
