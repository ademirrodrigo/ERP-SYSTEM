import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import api from '../services/api';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (items.length === 0) {
      toast.error('Adicione pelo menos um item à venda');
      return;
    }

    createSaleMutation.mutate({
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
                          {item.quantity} x R$ {item.price.toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center space-x-4">
                        <p className="font-medium">
                          R$ {item.subtotal.toFixed(2)}
                        </p>
                        <button
                          type="button"
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

              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">R$ {subtotal.toFixed(2)}</span>
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
                  <span className="text-primary-600">R$ {total.toFixed(2)}</span>
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
    </div>
  );
};

export default NewSale;
