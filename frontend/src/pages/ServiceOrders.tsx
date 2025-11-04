import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { ServiceOrder, Customer, PaginatedResponse } from '../types';
import { toast } from 'sonner';
import { Plus, Search, Edit, Trash2, Wrench, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ServiceOrders = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    diagnosis: '',
    customerId: '',
    items: [] as Array<{
      type: 'SERVICE' | 'PRODUCT';
      description: string;
      quantity: number;
      price: number;
    }>,
    discount: 0,
  });
  const [newItem, setNewItem] = useState({
    type: 'SERVICE' as 'SERVICE' | 'PRODUCT',
    description: '',
    quantity: 1,
    price: 0,
  });
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['service-orders', page, search, statusFilter],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<ServiceOrder>>('/service-orders', {
        params: { page, limit: 10, search, status: statusFilter || undefined },
      });
      return response.data;
    },
  });

  const { data: customersData } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<Customer>>('/customers', {
        params: { page: 1, limit: 100 },
      });
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/service-orders', data),
    onSuccess: () => {
      toast.success('Ordem de serviço criada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
      setIsModalOpen(false);
      setFormData({
        description: '',
        diagnosis: '',
        customerId: '',
        items: [],
        discount: 0,
      });
      setNewItem({ type: 'SERVICE', description: '', quantity: 1, price: 0 });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao criar ordem de serviço');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/service-orders/${id}`),
    onSuccess: () => {
      toast.success('Ordem de serviço deletada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao deletar ordem de serviço');
    },
  });

  const handleAddItem = () => {
    if (!newItem.description.trim() || newItem.price <= 0) {
      toast.error('Preencha todos os campos do item');
      return;
    }

    setFormData({
      ...formData,
      items: [...formData.items, { ...newItem }],
    });

    setNewItem({ type: 'SERVICE', description: '', quantity: 1, price: 0 });
    toast.success('Item adicionado');
  };

  const handleRemoveItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
    toast.success('Item removido');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description.trim()) {
      toast.error('Descrição é obrigatória');
      return;
    }
    if (formData.items.length === 0) {
      toast.error('Adicione pelo menos um item');
      return;
    }
    createMutation.mutate(formData);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza que deseja deletar esta ordem de serviço?')) {
      deleteMutation.mutate(id);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      PENDING: { label: 'Pendente', class: 'bg-yellow-100 text-yellow-800' },
      IN_PROGRESS: { label: 'Em Andamento', class: 'bg-blue-100 text-blue-800' },
      COMPLETED: { label: 'Concluído', class: 'bg-green-100 text-green-800' },
      DELIVERED: { label: 'Entregue', class: 'bg-purple-100 text-purple-800' },
      CANCELLED: { label: 'Cancelado', class: 'bg-red-100 text-red-800' },
    };
    const { label, class: className } = statusMap[status as keyof typeof statusMap] || statusMap.PENDING;
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${className}`}>{label}</span>;
  };

  const subtotal = formData.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const total = subtotal - formData.discount;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Ordens de Serviço</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nova Ordem
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar ordens..."
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
            <option value="IN_PROGRESS">Em Andamento</option>
            <option value="COMPLETED">Concluído</option>
            <option value="DELIVERED">Entregue</option>
            <option value="CANCELLED">Cancelado</option>
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
            <Wrench className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">Nenhuma ordem de serviço encontrada</p>
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
                    <th>Descrição</th>
                    <th>Técnico</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.data.map((order) => (
                    <tr key={order.id}>
                      <td className="font-medium">#{order.orderNumber}</td>
                      <td>
                        {format(new Date(order.date), 'dd/MM/yyyy', { locale: ptBR })}
                      </td>
                      <td>{order.customer?.name || '-'}</td>
                      <td className="max-w-xs truncate">{order.description}</td>
                      <td>{order.technician?.name || '-'}</td>
                      <td className="font-medium">R$ {Number(order.total).toFixed(2)}</td>
                      <td>{getStatusBadge(order.status)}</td>
                      <td>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => toast.info('Funcionalidade de edição em desenvolvimento')}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(order.id)}
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

      {/* Create Service Order Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Nova Ordem de Serviço</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                {/* Cliente */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cliente (Opcional)
                  </label>
                  <select
                    value={formData.customerId}
                    onChange={(e) =>
                      setFormData({ ...formData, customerId: e.target.value })
                    }
                    className="input"
                  >
                    <option value="">Sem cliente</option>
                    {customersData?.data.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Descrição */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descrição do Problema <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="input"
                    rows={3}
                    required
                  />
                </div>

                {/* Diagnóstico */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Diagnóstico (Opcional)
                  </label>
                  <textarea
                    value={formData.diagnosis}
                    onChange={(e) =>
                      setFormData({ ...formData, diagnosis: e.target.value })
                    }
                    className="input"
                    rows={2}
                  />
                </div>

                {/* Items Section */}
                <div className="border-t pt-4">
                  <h3 className="text-lg font-bold text-gray-900 mb-3">Itens</h3>

                  {/* Add Item Form */}
                  <div className="bg-gray-50 p-4 rounded-lg mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Tipo
                        </label>
                        <select
                          value={newItem.type}
                          onChange={(e) =>
                            setNewItem({ ...newItem, type: e.target.value as 'SERVICE' | 'PRODUCT' })
                          }
                          className="input"
                        >
                          <option value="SERVICE">Serviço</option>
                          <option value="PRODUCT">Produto/Peça</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Descrição
                        </label>
                        <input
                          type="text"
                          value={newItem.description}
                          onChange={(e) =>
                            setNewItem({ ...newItem, description: e.target.value })
                          }
                          className="input"
                          placeholder={newItem.type === 'SERVICE' ? 'Ex: Mão de obra' : 'Ex: Tela LCD'}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Quantidade
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={newItem.quantity}
                          onChange={(e) =>
                            setNewItem({ ...newItem, quantity: Number(e.target.value) })
                          }
                          className="input"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Preço Unitário (R$)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={newItem.price}
                          onChange={(e) =>
                            setNewItem({ ...newItem, price: Number(e.target.value) })
                          }
                          className="input"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="btn-primary w-full"
                    >
                      <Plus className="w-4 h-4 mr-2 inline" />
                      Adicionar Item
                    </button>
                  </div>

                  {/* Items List */}
                  {formData.items.length > 0 && (
                    <div className="space-y-2">
                      {formData.items.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex-1">
                            <p className="font-medium">
                              <span className={`text-xs px-2 py-1 rounded mr-2 ${
                                item.type === 'SERVICE'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-green-100 text-green-800'
                              }`}>
                                {item.type === 'SERVICE' ? 'Serviço' : 'Produto'}
                              </span>
                              {item.description}
                            </p>
                            <p className="text-sm text-gray-600">
                              {item.quantity} x R$ {item.price.toFixed(2)} = R${' '}
                              {(item.quantity * item.price).toFixed(2)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Desconto e Total */}
                <div className="border-t pt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium">R$ {subtotal.toFixed(2)}</span>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-600 mb-1">
                        Desconto (R$):
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max={subtotal}
                        value={formData.discount}
                        onChange={(e) =>
                          setFormData({ ...formData, discount: Number(e.target.value) })
                        }
                        className="input"
                      />
                    </div>

                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span>Total:</span>
                      <span className="text-primary-600">R$ {total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="btn-primary"
                >
                  {createMutation.isPending ? 'Salvando...' : 'Criar Ordem'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceOrders;
