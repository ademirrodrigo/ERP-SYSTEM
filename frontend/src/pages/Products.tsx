import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Product, PaginatedResponse } from '../types';
import { toast } from 'sonner';
import { Plus, Search, Edit, Trash2, Package, X } from 'lucide-react';

const Products = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sku: '',
    barcode: '',
    price: '',
    cost: '',
    stock: '',
    minStock: '',
    unit: 'UN',
    isActive: true,
  });
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['products', page, search],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<Product>>('/products', {
        params: { page, limit: 10, search },
      });
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/products', data),
    onSuccess: () => {
      toast.success('Produto criado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setIsModalOpen(false);
      setFormData({
        name: '',
        description: '',
        sku: '',
        barcode: '',
        price: '',
        cost: '',
        stock: '',
        minStock: '',
        unit: 'UN',
        isActive: true,
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao criar produto');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => {
      toast.success('Produto deletado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao deletar produto');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...formData,
      price: parseFloat(formData.price),
      cost: parseFloat(formData.cost),
      stock: parseInt(formData.stock),
      minStock: parseInt(formData.minStock),
    };
    createMutation.mutate(data);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza que deseja deletar este produto?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Produtos</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center"
        >
          <Plus className="w-5 h-5 mr-2" />
          Novo Produto
        </button>
      </div>

      {/* Search */}
      <div className="card mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar produtos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
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
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">Nenhum produto encontrado</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>SKU</th>
                    <th>Preço</th>
                    <th>Estoque</th>
                    <th>Categoria</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.data.map((product) => (
                    <tr key={product.id}>
                      <td className="font-medium">{product.name}</td>
                      <td>{product.sku || '-'}</td>
                      <td>R$ {product.price.toFixed(2)}</td>
                      <td>
                        <span
                          className={`${
                            product.stock <= product.minStock
                              ? 'text-red-600 font-medium'
                              : 'text-gray-900'
                          }`}
                        >
                          {product.stock} {product.unit}
                        </span>
                      </td>
                      <td>{product.category?.name || '-'}</td>
                      <td>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            product.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {product.isActive ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => toast.info('Funcionalidade de edição em desenvolvimento')}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
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

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black opacity-50" onClick={() => setIsModalOpen(false)}></div>
            <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Novo Produto</h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome do Produto *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="input"
                      placeholder="Ex: Mouse Gamer RGB"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descrição
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="input"
                      rows={2}
                      placeholder="Descrição do produto"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      SKU
                    </label>
                    <input
                      type="text"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      className="input"
                      placeholder="PROD-001"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Código de Barras
                    </label>
                    <input
                      type="text"
                      value={formData.barcode}
                      onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                      className="input"
                      placeholder="7891234567890"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Preço de Venda (R$) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="input"
                      placeholder="150.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Preço de Custo (R$) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.cost}
                      onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                      className="input"
                      placeholder="80.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Estoque Atual *
                    </label>
                    <input
                      type="number"
                      required
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                      className="input"
                      placeholder="50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Estoque Mínimo
                    </label>
                    <input
                      type="number"
                      value={formData.minStock}
                      onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                      className="input"
                      placeholder="10"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unidade
                    </label>
                    <select
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="input"
                    >
                      <option value="UN">Unidade (UN)</option>
                      <option value="CX">Caixa (CX)</option>
                      <option value="PC">Peça (PC)</option>
                      <option value="KG">Quilograma (KG)</option>
                      <option value="L">Litro (L)</option>
                      <option value="M">Metro (M)</option>
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm font-medium text-gray-700">Produto Ativo</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t">
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
                    {createMutation.isPending ? 'Salvando...' : 'Salvar Produto'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
