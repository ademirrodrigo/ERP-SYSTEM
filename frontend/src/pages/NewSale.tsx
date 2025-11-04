import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash2, X } from 'lucide-react';
import { Product, Customer, PaginatedResponse } from '../types';

interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  discount: number;
  subtotal: number;
}

const NewSale = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<SaleItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [itemDiscount, setItemDiscount] = useState(0);
  const [customerId, setCustomerId] = useState('');

  // Fetch products
  const { data: productsData } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<Product>>('/products', {
        params: { page: 1, limit: 100 },
      });
      return response.data;
    },
  });

  // Fetch customers
  const { data: customersData } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<Customer>>('/customers', {
        params: { page: 1, limit: 100 },
      });
      return response.data;
    },
  });

  const createSaleMutation = useMutation({
    mutationFn: (data: any) => api.post('/sales', data),
    onSuccess: () => {
      toast.success('Venda criada com sucesso!');
      navigate('/sales');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao criar venda');
    },
  });

  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const total = subtotal - discount;

  const handleAddItem = () => {
    if (!selectedProduct) {
      toast.error('Selecione um produto');
      return;
    }

    if (quantity <= 0) {
      toast.error('Quantidade deve ser maior que zero');
      return;
    }

    if (quantity > selectedProduct.stock) {
      toast.error('Estoque insuficiente');
      return;
    }

    const price = Number(selectedProduct.price);
    const subtotal = quantity * price - itemDiscount;

    const newItem: SaleItem = {
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      quantity,
      price,
      discount: itemDiscount,
      subtotal,
    };

    setItems([...items, newItem]);
    setIsAddItemModalOpen(false);
    setSelectedProduct(null);
    setQuantity(1);
    setItemDiscount(0);
    toast.success('Item adicionado à venda');
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
    toast.success('Item removido');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (items.length === 0) {
      toast.error('Adicione pelo menos um item à venda');
      return;
    }

    createSaleMutation.mutate({
      customerId: customerId || undefined,
      items: items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
        discount: item.discount,
      })),
      discount,
      paymentMethod,
    });
  };

  return (
    <div>
      <div className="flex items-center mb-6">
        <button
          onClick={() => navigate('/sales')}
          className="p-2 hover:bg-gray-100 rounded-lg mr-3"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Nova Venda</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Items */}
          <div className="lg:col-span-2">
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">Itens</h2>
                <button
                  type="button"
                  onClick={() => setIsAddItemModalOpen(true)}
                  className="btn-primary flex items-center"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Item
                </button>
              </div>

              {items.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  Nenhum item adicionado
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-sm text-gray-600">
                          {item.quantity} x R$ {Number(item.price).toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center space-x-4">
                        <p className="font-medium">
                          R$ {Number(item.subtotal).toFixed(2)}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Summary */}
          <div>
            <div className="card sticky top-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Resumo</h2>

              {/* Customer Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cliente (Opcional)
                </label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="input"
                >
                  <option value="">Cliente Avulso</option>
                  {customersData?.data.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">R$ {Number(subtotal).toFixed(2)}</span>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Desconto:
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    className="input"
                  />
                </div>

                <div className="flex justify-between text-lg font-bold border-t pt-3">
                  <span>Total:</span>
                  <span className="text-primary-600">R$ {Number(total).toFixed(2)}</span>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Forma de Pagamento
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="input"
                >
                  <option value="CASH">Dinheiro</option>
                  <option value="DEBIT_CARD">Cartão Débito</option>
                  <option value="CREDIT_CARD">Cartão Crédito</option>
                  <option value="PIX">PIX</option>
                  <option value="BANK_SLIP">Boleto</option>
                  <option value="CHECK">Cheque</option>
                  <option value="OTHER">Outro</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={items.length === 0 || createSaleMutation.isPending}
                className="btn-primary w-full"
              >
                {createSaleMutation.isPending ? 'Finalizando...' : 'Finalizar Venda'}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Add Item Modal */}
      {isAddItemModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Adicionar Item</h2>
              <button
                onClick={() => {
                  setIsAddItemModalOpen(false);
                  setSelectedProduct(null);
                  setQuantity(1);
                  setItemDiscount(0);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Product Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Produto <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedProduct?.id || ''}
                  onChange={(e) => {
                    const product = productsData?.data.find(
                      (p) => p.id === e.target.value
                    );
                    setSelectedProduct(product || null);
                  }}
                  className="input"
                >
                  <option value="">Selecione um produto</option>
                  {productsData?.data
                    .filter((p) => p.isActive && p.stock > 0)
                    .map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} - R$ {Number(product.price).toFixed(2)} (Estoque:{' '}
                        {product.stock})
                      </option>
                    ))}
                </select>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantidade <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedProduct?.stock || 1}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="input"
                />
                {selectedProduct && (
                  <p className="text-sm text-gray-500 mt-1">
                    Estoque disponível: {selectedProduct.stock}
                  </p>
                )}
              </div>

              {/* Item Discount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Desconto no Item (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={itemDiscount}
                  onChange={(e) => setItemDiscount(Number(e.target.value))}
                  className="input"
                />
              </div>

              {/* Preview */}
              {selectedProduct && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-gray-900 mb-2">
                    Subtotal do Item:
                  </p>
                  <p className="text-2xl font-bold text-primary-600">
                    R${' '}
                    {(quantity * Number(selectedProduct.price) - itemDiscount).toFixed(2)}
                  </p>
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="flex justify-end space-x-3 px-6 py-4 border-t">
              <button
                type="button"
                onClick={() => {
                  setIsAddItemModalOpen(false);
                  setSelectedProduct(null);
                  setQuantity(1);
                  setItemDiscount(0);
                }}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAddItem}
                disabled={!selectedProduct}
                className="btn-primary"
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewSale;
