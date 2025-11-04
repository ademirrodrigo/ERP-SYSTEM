import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { DashboardStats } from '../types';
import {
  DollarSign,
  ShoppingCart,
  AlertCircle,
  Users,
  TrendingUp,
  Package,
} from 'lucide-react';

const Dashboard = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await api.get('/dashboard/stats');
      return response.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const stats: DashboardStats = data?.stats || {};

  const cards = [
    {
      title: 'Vendas do Mês',
      value: `R$ ${stats.monthSales?.total ? Number(stats.monthSales.total).toFixed(2) : '0.00'}`,
      subtitle: `${stats.monthSales?.count || 0} vendas`,
      icon: DollarSign,
      color: 'bg-green-500',
    },
    {
      title: 'Vendas Hoje',
      value: `R$ ${stats.todaySales?.total ? Number(stats.todaySales.total).toFixed(2) : '0.00'}`,
      subtitle: `${stats.todaySales?.count || 0} vendas`,
      icon: ShoppingCart,
      color: 'bg-blue-500',
    },
    {
      title: 'Contas a Receber Vencidas',
      value: `R$ ${stats.overdueReceivables?.total ? Number(stats.overdueReceivables.total).toFixed(2) : '0.00'}`,
      subtitle: `${stats.overdueReceivables?.count || 0} contas`,
      icon: AlertCircle,
      color: 'bg-red-500',
    },
    {
      title: 'Contas a Pagar Pendentes',
      value: `R$ ${stats.pendingPayables?.total ? Number(stats.pendingPayables.total).toFixed(2) : '0.00'}`,
      subtitle: `${stats.pendingPayables?.count || 0} contas`,
      icon: TrendingUp,
      color: 'bg-orange-500',
    },
    {
      title: 'Produtos com Estoque Baixo',
      value: stats.lowStockProducts || 0,
      subtitle: 'produtos',
      icon: Package,
      color: 'bg-yellow-500',
    },
    {
      title: 'Total de Clientes',
      value: stats.totalCustomers || 0,
      subtitle: 'clientes ativos',
      icon: Users,
      color: 'bg-purple-500',
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.title} className="card">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 mb-1">
                    {card.title}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mb-1">
                    {card.value}
                  </p>
                  <p className="text-sm text-gray-500">{card.subtitle}</p>
                </div>
                <div className={`${card.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Sales */}
      {data?.recentSales && data.recentSales.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Vendas Recentes</h2>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Número</th>
                  <th>Cliente</th>
                  <th>Vendedor</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.recentSales.map((sale: any) => (
                  <tr key={sale.id}>
                    <td className="font-medium">#{sale.saleNumber}</td>
                    <td>{sale.customer?.name || 'Cliente Avulso'}</td>
                    <td>{sale.user?.name}</td>
                    <td>R$ {Number(sale.total).toFixed(2)}</td>
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
        </div>
      )}
    </div>
  );
};

export default Dashboard;
