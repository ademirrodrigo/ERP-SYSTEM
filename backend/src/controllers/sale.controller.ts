import { Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../config/database';

export const getSales = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, status, startDate, endDate } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {
      companyId: req.user!.companyId,
    };

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true } },
          user: { select: { id: true, name: true } },
          items: {
            include: {
              product: { select: { id: true, name: true, unit: true } },
            },
          },
        },
        skip,
        take: Number(limit),
        orderBy: { date: 'desc' },
      }),
      prisma.sale.count({ where }),
    ]);

    res.json({
      data: sales,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Erro ao buscar vendas:', error);
    res.status(500).json({ error: 'Erro ao buscar vendas' });
  }
};

export const getSaleById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const sale = await prisma.sale.findFirst({
      where: {
        id,
        companyId: req.user!.companyId,
      },
      include: {
        customer: true,
        user: { select: { id: true, name: true } },
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!sale) {
      return res.status(404).json({ error: 'Venda não encontrada' });
    }

    res.json({ sale });
  } catch (error) {
    console.error('Erro ao buscar venda:', error);
    res.status(500).json({ error: 'Erro ao buscar venda' });
  }
};

export const createSale = async (req: AuthRequest, res: Response) => {
  try {
    const { items, customerId, discount = 0, paymentMethod, notes } = req.body;

    // Validar items
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'A venda deve ter pelo menos um item' });
    }

    // Gerar número da venda
    const lastSale = await prisma.sale.findFirst({
      where: { companyId: req.user!.companyId },
      orderBy: { createdAt: 'desc' },
    });

    const saleNumber = lastSale
      ? String(Number(lastSale.saleNumber) + 1).padStart(6, '0')
      : '000001';

    // Criar venda em transação
    const sale = await prisma.$transaction(async (tx) => {
      // Calcular totais
      let subtotal = 0;
      const processedItems = [];

      for (const item of items) {
        const product = await tx.product.findFirst({
          where: { id: item.productId, companyId: req.user!.companyId },
        });

        if (!product) {
          throw new Error(`Produto ${item.productId} não encontrado`);
        }

        if (product.stock < item.quantity) {
          throw new Error(`Estoque insuficiente para o produto ${product.name}`);
        }

        const itemSubtotal = Number(item.price) * item.quantity - (item.discount || 0);
        subtotal += itemSubtotal;

        processedItems.push({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          discount: item.discount || 0,
          subtotal: itemSubtotal,
        });

        // Atualizar estoque
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });

        // Registrar movimento de estoque
        await tx.inventoryMovement.create({
          data: {
            type: 'EXIT',
            quantity: item.quantity,
            notes: `Venda #${saleNumber}`,
            productId: item.productId,
            companyId: req.user!.companyId,
          },
        });
      }

      const total = subtotal - Number(discount);

      // Criar venda
      const newSale = await tx.sale.create({
        data: {
          saleNumber,
          status: 'COMPLETED',
          subtotal,
          discount,
          total,
          paymentMethod,
          notes,
          customerId,
          userId: req.user!.id,
          companyId: req.user!.companyId,
          items: {
            create: processedItems,
          },
        },
        include: {
          customer: true,
          user: { select: { id: true, name: true } },
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      // Registrar no fluxo de caixa
      await tx.cashFlow.create({
        data: {
          type: 'INCOME',
          amount: total,
          description: `Venda #${saleNumber}`,
          category: 'Vendas',
          userId: req.user!.id,
          companyId: req.user!.companyId,
        },
      });

      return newSale;
    });

    res.status(201).json({ message: 'Venda criada com sucesso', sale });
  } catch (error: any) {
    console.error('Erro ao criar venda:', error);
    res.status(500).json({ error: error.message || 'Erro ao criar venda' });
  }
};

export const updateSale = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.sale.findFirst({
      where: { id, companyId: req.user!.companyId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Venda não encontrada' });
    }

    if (existing.status === 'COMPLETED') {
      return res.status(400).json({ error: 'Não é possível editar uma venda concluída' });
    }

    const sale = await prisma.sale.update({
      where: { id },
      data: req.body,
      include: {
        customer: true,
        user: { select: { id: true, name: true } },
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    res.json({ message: 'Venda atualizada com sucesso', sale });
  } catch (error) {
    console.error('Erro ao atualizar venda:', error);
    res.status(500).json({ error: 'Erro ao atualizar venda' });
  }
};

export const cancelSale = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const sale = await prisma.sale.findFirst({
      where: { id, companyId: req.user!.companyId },
      include: { items: true },
    });

    if (!sale) {
      return res.status(404).json({ error: 'Venda não encontrada' });
    }

    if (sale.status === 'CANCELLED') {
      return res.status(400).json({ error: 'Venda já está cancelada' });
    }

    // Cancelar venda em transação
    await prisma.$transaction(async (tx) => {
      // Devolver produtos ao estoque
      for (const item of sale.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });

        // Registrar movimento de estoque
        await tx.inventoryMovement.create({
          data: {
            type: 'RETURN',
            quantity: item.quantity,
            notes: `Cancelamento da venda #${sale.saleNumber}`,
            productId: item.productId,
            companyId: req.user!.companyId,
          },
        });
      }

      // Atualizar status da venda
      await tx.sale.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });

      // Registrar no fluxo de caixa
      await tx.cashFlow.create({
        data: {
          type: 'EXPENSE',
          amount: sale.total,
          description: `Cancelamento da venda #${sale.saleNumber}`,
          category: 'Cancelamentos',
          userId: req.user!.id,
          companyId: req.user!.companyId,
        },
      });
    });

    res.json({ message: 'Venda cancelada com sucesso' });
  } catch (error) {
    console.error('Erro ao cancelar venda:', error);
    res.status(500).json({ error: 'Erro ao cancelar venda' });
  }
};
