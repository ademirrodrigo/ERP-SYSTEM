import { Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../config/database';

export const getProducts = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, search = '', categoryId } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {
      companyId: req.user!.companyId,
    };

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { sku: { contains: search as string, mode: 'insensitive' } },
        { barcode: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: true },
        skip,
        take: Number(limit),
        orderBy: { name: 'asc' },
      }),
      prisma.product.count({ where }),
    ]);

    res.json({
      data: products,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    res.status(500).json({ error: 'Erro ao buscar produtos' });
  }
};

export const getProductById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findFirst({
      where: {
        id,
        companyId: req.user!.companyId,
      },
      include: { category: true },
    });

    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    res.json({ product });
  } catch (error) {
    console.error('Erro ao buscar produto:', error);
    res.status(500).json({ error: 'Erro ao buscar produto' });
  }
};

export const createProduct = async (req: AuthRequest, res: Response) => {
  try {
    const data = {
      ...req.body,
      companyId: req.user!.companyId,
    };

    const product = await prisma.product.create({
      data,
      include: { category: true },
    });

    res.status(201).json({ message: 'Produto criado com sucesso', product });
  } catch (error) {
    console.error('Erro ao criar produto:', error);
    res.status(500).json({ error: 'Erro ao criar produto' });
  }
};

export const updateProduct = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Verificar se o produto pertence à empresa
    const existing = await prisma.product.findFirst({
      where: { id, companyId: req.user!.companyId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    const product = await prisma.product.update({
      where: { id },
      data: req.body,
      include: { category: true },
    });

    res.json({ message: 'Produto atualizado com sucesso', product });
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    res.status(500).json({ error: 'Erro ao atualizar produto' });
  }
};

export const deleteProduct = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Verificar se o produto pertence à empresa
    const existing = await prisma.product.findFirst({
      where: { id, companyId: req.user!.companyId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    await prisma.product.delete({ where: { id } });

    res.json({ message: 'Produto deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar produto:', error);
    res.status(500).json({ error: 'Erro ao deletar produto' });
  }
};
