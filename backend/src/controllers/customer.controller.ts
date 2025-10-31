import { Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../config/database';

export const getCustomers = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {
      companyId: req.user!.companyId,
    };

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
        { cpf: { contains: search as string, mode: 'insensitive' } },
        { cnpj: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { name: 'asc' },
      }),
      prisma.customer.count({ where }),
    ]);

    res.json({
      data: customers,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Erro ao buscar clientes:', error);
    res.status(500).json({ error: 'Erro ao buscar clientes' });
  }
};

export const getCustomerById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findFirst({
      where: {
        id,
        companyId: req.user!.companyId,
      },
      include: {
        sales: { take: 10, orderBy: { createdAt: 'desc' } },
        accountsReceivable: { take: 10, orderBy: { dueDate: 'desc' } },
      },
    });

    if (!customer) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    res.json({ customer });
  } catch (error) {
    console.error('Erro ao buscar cliente:', error);
    res.status(500).json({ error: 'Erro ao buscar cliente' });
  }
};

export const createCustomer = async (req: AuthRequest, res: Response) => {
  try {
    const data = {
      ...req.body,
      companyId: req.user!.companyId,
    };

    const customer = await prisma.customer.create({ data });

    res.status(201).json({ message: 'Cliente criado com sucesso', customer });
  } catch (error) {
    console.error('Erro ao criar cliente:', error);
    res.status(500).json({ error: 'Erro ao criar cliente' });
  }
};

export const updateCustomer = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.customer.findFirst({
      where: { id, companyId: req.user!.companyId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: req.body,
    });

    res.json({ message: 'Cliente atualizado com sucesso', customer });
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error);
    res.status(500).json({ error: 'Erro ao atualizar cliente' });
  }
};

export const deleteCustomer = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.customer.findFirst({
      where: { id, companyId: req.user!.companyId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    await prisma.customer.delete({ where: { id } });

    res.json({ message: 'Cliente deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar cliente:', error);
    res.status(500).json({ error: 'Erro ao deletar cliente' });
  }
};
