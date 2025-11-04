import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// List categories with pagination
export const listCategories = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const companyId = req.user!.companyId;

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where: any = {
      companyId,
      ...(search && {
        OR: [
          { name: { contains: search as string, mode: 'insensitive' } },
          { description: { contains: search as string, mode: 'insensitive' } },
        ],
      }),
    };

    const [categories, total] = await Promise.all([
      prisma.category.findMany({
        where,
        skip,
        take,
        include: {
          _count: {
            select: { products: true },
          },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.category.count({ where }),
    ]);

    const totalPages = Math.ceil(total / take);

    res.json({
      data: categories,
      pagination: {
        page: Number(page),
        limit: take,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Error listing categories:', error);
    res.status(500).json({ error: 'Erro ao listar categorias' });
  }
};

// Get category by ID
export const getCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;

    const category = await prisma.category.findFirst({
      where: { id, companyId },
      include: {
        products: {
          select: {
            id: true,
            name: true,
            price: true,
            stock: true,
          },
        },
      },
    });

    if (!category) {
      return res.status(404).json({ error: 'Categoria não encontrada' });
    }

    res.json(category);
  } catch (error) {
    console.error('Error getting category:', error);
    res.status(500).json({ error: 'Erro ao buscar categoria' });
  }
};

// Create category
export const createCategory = async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;
    const companyId = req.user!.companyId;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }

    // Check if category name already exists
    const existing = await prisma.category.findFirst({
      where: {
        companyId,
        name: { equals: name.trim(), mode: 'insensitive' },
      },
    });

    if (existing) {
      return res.status(400).json({ error: 'Já existe uma categoria com este nome' });
    }

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        description: description?.trim(),
        companyId,
      },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    res.status(201).json(category);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Erro ao criar categoria' });
  }
};

// Update category
export const updateCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const companyId = req.user!.companyId;

    const category = await prisma.category.findFirst({
      where: { id, companyId },
    });

    if (!category) {
      return res.status(404).json({ error: 'Categoria não encontrada' });
    }

    if (name && name.trim()) {
      // Check if new name already exists (excluding current category)
      const existing = await prisma.category.findFirst({
        where: {
          companyId,
          name: { equals: name.trim(), mode: 'insensitive' },
          id: { not: id },
        },
      });

      if (existing) {
        return res.status(400).json({ error: 'Já existe uma categoria com este nome' });
      }
    }

    const updated = await prisma.category.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        description: description?.trim(),
      },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Erro ao atualizar categoria' });
  }
};

// Delete category
export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;

    const category = await prisma.category.findFirst({
      where: { id, companyId },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!category) {
      return res.status(404).json({ error: 'Categoria não encontrada' });
    }

    if (category._count.products > 0) {
      return res.status(400).json({
        error: `Não é possível deletar categoria com ${category._count.products} produto(s) associado(s)`,
      });
    }

    await prisma.category.delete({ where: { id } });

    res.json({ message: 'Categoria deletada com sucesso' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Erro ao deletar categoria' });
  }
};
