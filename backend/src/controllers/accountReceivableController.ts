import { Request, Response } from 'express';
import { PrismaClient, AccountStatus } from '@prisma/client';

const prisma = new PrismaClient();

// List accounts receivable with pagination
export const listAccountsReceivable = async (req: Request, res: Response) => {
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
          { customer: { name: { contains: search as string, mode: 'insensitive' } } },
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
      prisma.accountReceivable.findMany({
        where,
        skip,
        take,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { dueDate: 'asc' },
      }),
      prisma.accountReceivable.count({ where }),
    ]);

    const totalPages = Math.ceil(total / take);

    // Calculate totals
    const totals = await prisma.accountReceivable.groupBy({
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
    console.error('Error listing accounts receivable:', error);
    res.status(500).json({ error: 'Erro ao listar contas a receber' });
  }
};

// Get account receivable by ID
export const getAccountReceivable = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;

    const account = await prisma.accountReceivable.findFirst({
      where: { id, companyId },
      include: {
        customer: true,
      },
    });

    if (!account) {
      return res.status(404).json({ error: 'Conta a receber não encontrada' });
    }

    res.json(account);
  } catch (error) {
    console.error('Error getting account receivable:', error);
    res.status(500).json({ error: 'Erro ao buscar conta a receber' });
  }
};

// Create account receivable
export const createAccountReceivable = async (req: Request, res: Response) => {
  try {
    const { description, amount, dueDate, customerId, category, notes } = req.body;
    const companyId = req.user!.companyId;

    if (!description || !amount || !dueDate) {
      return res.status(400).json({ error: 'Descrição, valor e data de vencimento são obrigatórios' });
    }

    // Check if due date is overdue
    const now = new Date();
    const due = new Date(dueDate);
    const status = due < now ? 'OVERDUE' : 'PENDING';

    const account = await prisma.accountReceivable.create({
      data: {
        description,
        amount: Number(amount),
        dueDate: new Date(dueDate),
        status,
        category,
        notes,
        customerId,
        companyId,
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.status(201).json(account);
  } catch (error) {
    console.error('Error creating account receivable:', error);
    res.status(500).json({ error: 'Erro ao criar conta a receber' });
  }
};

// Update account receivable
export const updateAccountReceivable = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { description, amount, dueDate, status, paymentDate, category, notes } = req.body;
    const companyId = req.user!.companyId;

    const account = await prisma.accountReceivable.findFirst({
      where: { id, companyId },
    });

    if (!account) {
      return res.status(404).json({ error: 'Conta a receber não encontrada' });
    }

    const updated = await prisma.accountReceivable.update({
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
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating account receivable:', error);
    res.status(500).json({ error: 'Erro ao atualizar conta a receber' });
  }
};

// Mark as paid
export const markAsPaid = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { paymentDate } = req.body;
    const companyId = req.user!.companyId;

    const account = await prisma.accountReceivable.findFirst({
      where: { id, companyId },
    });

    if (!account) {
      return res.status(404).json({ error: 'Conta a receber não encontrada' });
    }

    const updated = await prisma.accountReceivable.update({
      where: { id },
      data: {
        status: 'PAID',
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      },
      include: {
        customer: {
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

// Delete account receivable
export const deleteAccountReceivable = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;

    const account = await prisma.accountReceivable.findFirst({
      where: { id, companyId },
    });

    if (!account) {
      return res.status(404).json({ error: 'Conta a receber não encontrada' });
    }

    await prisma.accountReceivable.delete({ where: { id } });

    res.json({ message: 'Conta a receber deletada com sucesso' });
  } catch (error) {
    console.error('Error deleting account receivable:', error);
    res.status(500).json({ error: 'Erro ao deletar conta a receber' });
  }
};
