import { Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../config/database';

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // Vendas do mês
    const salesStats = await prisma.sale.aggregate({
      where: {
        companyId,
        status: 'COMPLETED',
        date: { gte: startOfMonth, lte: endOfMonth },
      },
      _sum: { total: true },
      _count: true,
    });

    // Vendas do dia
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const todaySales = await prisma.sale.aggregate({
      where: {
        companyId,
        status: 'COMPLETED',
        date: { gte: startOfDay, lte: endOfDay },
      },
      _sum: { total: true },
      _count: true,
    });

    // Contas a receber vencidas
    const overdueReceivables = await prisma.accountReceivable.aggregate({
      where: {
        companyId,
        status: 'OVERDUE',
      },
      _sum: { amount: true },
      _count: true,
    });

    // Contas a pagar pendentes
    const pendingPayables = await prisma.accountPayable.aggregate({
      where: {
        companyId,
        status: { in: ['PENDING', 'OVERDUE'] },
      },
      _sum: { amount: true },
      _count: true,
    });

    // Produtos com estoque baixo
    const lowStockProducts = await prisma.product.count({
      where: {
        companyId,
        stock: { lte: prisma.product.fields.minStock },
        isActive: true,
      },
    });

    // Total de clientes
    const totalCustomers = await prisma.customer.count({
      where: { companyId, isActive: true },
    });

    // Últimas vendas
    const recentSales = await prisma.sale.findMany({
      where: { companyId },
      include: {
        customer: { select: { name: true } },
        user: { select: { name: true } },
      },
      take: 10,
      orderBy: { date: 'desc' },
    });

    // Produtos mais vendidos
    const topProducts = await prisma.saleItem.groupBy({
      by: ['productId'],
      where: {
        sale: {
          companyId,
          status: 'COMPLETED',
          date: { gte: startOfMonth, lte: endOfMonth },
        },
      },
      _sum: { quantity: true, subtotal: true },
      orderBy: { _sum: { subtotal: 'desc' } },
      take: 10,
    });

    const topProductsWithDetails = await Promise.all(
      topProducts.map(async (item) => {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          select: { id: true, name: true, price: true },
        });
        return {
          ...product,
          totalQuantity: item._sum.quantity,
          totalRevenue: item._sum.subtotal,
        };
      })
    );

    res.json({
      stats: {
        monthSales: {
          total: salesStats._sum.total || 0,
          count: salesStats._count || 0,
        },
        todaySales: {
          total: todaySales._sum.total || 0,
          count: todaySales._count || 0,
        },
        overdueReceivables: {
          total: overdueReceivables._sum.amount || 0,
          count: overdueReceivables._count || 0,
        },
        pendingPayables: {
          total: pendingPayables._sum.amount || 0,
          count: pendingPayables._count || 0,
        },
        lowStockProducts,
        totalCustomers,
      },
      recentSales,
      topProducts: topProductsWithDetails,
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
};
