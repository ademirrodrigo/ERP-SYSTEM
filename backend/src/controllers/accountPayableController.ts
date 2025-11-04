import { Request, Response } from 'express';
import { PrismaClient, AccountStatus } from '@prisma/client';

const prisma = new PrismaClient();

// List accounts payable with pagination
export const listAccountsPayable = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, search = '', status, startDate, endDate } = req.query;
    const companyId = req.user!.companyId;

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where: any = {
      companyId,
      ...(search && {
        OR: [
          { description: { contains: search as string, mode: 'insensitive' } },
          { supplier: { name: { contains: search as string, mode: 'insensitive' } } },
        ],
      }),
      ...(status && { status: status as AccountStatus }),
      ...(startDate && endDate && {
        dueDate: {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string),
        },
      }),
    };

    const [accounts, total] = await Promise.all([
      prisma.accountPayable.findMany({
        where,
        skip,
        take,
        include: {
          supplier: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { dueDate: 'asc' },
      }),
      prisma.accountPayable.count({ where }),
    ]);

    const totalPages = Math.ceil(total / take);

    // Calculate totals
    const totals = await prisma.accountPayable.groupBy({
      by: ['status'],
      where: { companyId },
      _sum: {
        amount: true,
      },
    });

    const summary = {
      pending: totals.find((t) => t.status === 'PENDING')?._sum.amount || 0,
      paid: totals.find((t) => t.status === 'PAID')?._sum.amount || 0,
      overdue: totals.find((t) => t.status === 'OVERDUE')?._sum.amount || 0,
    };

    res.json({
      data: accounts,
      pagination: {
        page: Number(page),
        limit: take,
        total,
        totalPages,
      },
      summary,
    });
  } catch (error) {
    console.error('Error listing accounts payable:', error);
    res.status(500).json({ error: 'Erro ao listar contas a pagar' });
  }
};

// Get account payable by ID
export const getAccountPayable = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;

    const account = await prisma.accountPayable.findFirst({
      where: { id, companyId },
      include: {
        supplier: true,
      },
    });

    if (!account) {
      return res.status(404).json({ error: 'Conta a pagar não encontrada' });
    }

    res.json(account);
  } catch (error) {
    console.error('Error getting account payable:', error);
    res.status(500).json({ error: 'Erro ao buscar conta a pagar' });
  }
};

// Create account payable
export const createAccountPayable = async (req: Request, res: Response) => {
  try {
    const { description, amount, dueDate, supplierId, category, notes } = req.body;
    const companyId = req.user!.companyId;

    if (!description || !amount || !dueDate) {
      return res.status(400).json({ error: 'Descrição, valor e data de vencimento são obrigatórios' });
    }

    // Check if due date is overdue
    const now = new Date();
    const due = new Date(dueDate);
    const status = due < now ? 'OVERDUE' : 'PENDING';

    const account = await prisma.accountPayable.create({
      data: {
        description,
        amount: Number(amount),
        dueDate: new Date(dueDate),
        status,
        category,
        notes,
        supplierId,
        companyId,
      },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.status(201).json(account);
  } catch (error) {
    console.error('Error creating account payable:', error);
    res.status(500).json({ error: 'Erro ao criar conta a pagar' });
  }
};

// Update account payable
export const updateAccountPayable = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { description, amount, dueDate, status, paymentDate, category, notes } = req.body;
    const companyId = req.user!.companyId;

    const account = await prisma.accountPayable.findFirst({
      where: { id, companyId },
    });

    if (!account) {
      return res.status(404).json({ error: 'Conta a pagar não encontrada' });
    }

    const updated = await prisma.accountPayable.update({
      where: { id },
      data: {
        ...(description && { description }),
        ...(amount && { amount: Number(amount) }),
        ...(dueDate && { dueDate: new Date(dueDate) }),
        ...(status && { status }),
        ...(paymentDate !== undefined && { paymentDate: paymentDate ? new Date(paymentDate) : null }),
        category,
        notes,
      },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating account payable:', error);
    res.status(500).json({ error: 'Erro ao atualizar conta a pagar' });
  }
};

// Mark as paid
export const markAsPaid = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { paymentDate } = req.body;
    const companyId = req.user!.companyId;

    const account = await prisma.accountPayable.findFirst({
      where: { id, companyId },
    });

    if (!account) {
      return res.status(404).json({ error: 'Conta a pagar não encontrada' });
    }

    const updated = await prisma.accountPayable.update({
      where: { id },
      data: {
        status: 'PAID',
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error marking account as paid:', error);
    res.status(500).json({ error: 'Erro ao marcar conta como paga' });
  }
};

// Delete account payable
export const deleteAccountPayable = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;

    const account = await prisma.accountPayable.findFirst({
      where: { id, companyId },
    });

    if (!account) {
      return res.status(404).json({ error: 'Conta a pagar não encontrada' });
    }

    await prisma.accountPayable.delete({ where: { id } });

    res.json({ message: 'Conta a pagar deletada com sucesso' });
  } catch (error) {
    console.error('Error deleting account payable:', error);
    res.status(500).json({ error: 'Erro ao deletar conta a pagar' });
  }
};
