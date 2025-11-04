import { Request, Response } from 'express';
import { PrismaClient, ServiceItemType } from '@prisma/client';

const prisma = new PrismaClient();

// List service orders with pagination
export const listServiceOrders = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, search = '', status } = req.query;
    const companyId = req.user!.companyId;

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where: any = {
      companyId,
      ...(search && {
        OR: [
          { orderNumber: { contains: search as string, mode: 'insensitive' } },
          { description: { contains: search as string, mode: 'insensitive' } },
          { customer: { name: { contains: search as string, mode: 'insensitive' } } },
        ],
      }),
      ...(status && { status: status as string }),
    };

    const [serviceOrders, total] = await Promise.all([
      prisma.serviceOrder.findMany({
        where,
        skip,
        take,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
          technician: {
            select: {
              id: true,
              name: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.serviceOrder.count({ where }),
    ]);

    const totalPages = Math.ceil(total / take);

    res.json({
      data: serviceOrders,
      pagination: {
        page: Number(page),
        limit: take,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Error listing service orders:', error);
    res.status(500).json({ error: 'Erro ao listar ordens de serviço' });
  }
};

// Get service order by ID
export const getServiceOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;

    const serviceOrder = await prisma.serviceOrder.findFirst({
      where: { id, companyId },
      include: {
        customer: true,
        technician: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!serviceOrder) {
      return res.status(404).json({ error: 'Ordem de serviço não encontrada' });
    }

    res.json(serviceOrder);
  } catch (error) {
    console.error('Error getting service order:', error);
    res.status(500).json({ error: 'Erro ao buscar ordem de serviço' });
  }
};

// Create service order
export const createServiceOrder = async (req: Request, res: Response) => {
  try {
    const { description, diagnosis, customerId, technicianId, items, discount = 0 } = req.body;
    const companyId = req.user!.companyId;

    if (!description || !items || items.length === 0) {
      return res.status(400).json({ error: 'Descrição e itens são obrigatórios' });
    }

    // Calculate subtotal
    const subtotal = items.reduce((sum: number, item: any) => {
      return sum + item.quantity * item.price;
    }, 0);

    const total = subtotal - discount;

    // Generate order number
    const lastOrder = await prisma.serviceOrder.findFirst({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });

    const orderNumber = lastOrder
      ? `OS${(parseInt(lastOrder.orderNumber.replace('OS', '')) + 1).toString().padStart(6, '0')}`
      : 'OS000001';

    // Create service order
    const serviceOrder = await prisma.serviceOrder.create({
      data: {
        orderNumber,
        description,
        diagnosis,
        subtotal,
        discount,
        total,
        customerId,
        technicianId,
        companyId,
        items: {
          create: items.map((item: any) => ({
            type: item.type as ServiceItemType,
            description: item.description,
            quantity: item.quantity,
            price: item.price,
            subtotal: item.quantity * item.price,
            productId: item.productId,
          })),
        },
      },
      include: {
        customer: true,
        technician: {
          select: {
            id: true,
            name: true,
          },
        },
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    // Update product stock if items contain products
    for (const item of items) {
      if (item.type === 'PRODUCT' && item.productId) {
        await prisma.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });

        // Create inventory movement
        await prisma.inventoryMovement.create({
          data: {
            type: 'EXIT',
            quantity: item.quantity,
            notes: `Ordem de Serviço ${orderNumber}`,
            productId: item.productId,
            companyId,
          },
        });
      }
    }

    res.status(201).json(serviceOrder);
  } catch (error) {
    console.error('Error creating service order:', error);
    res.status(500).json({ error: 'Erro ao criar ordem de serviço' });
  }
};

// Update service order
export const updateServiceOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, diagnosis, solution } = req.body;
    const companyId = req.user!.companyId;

    const serviceOrder = await prisma.serviceOrder.findFirst({
      where: { id, companyId },
    });

    if (!serviceOrder) {
      return res.status(404).json({ error: 'Ordem de serviço não encontrada' });
    }

    const updated = await prisma.serviceOrder.update({
      where: { id },
      data: {
        status,
        diagnosis,
        solution,
      },
      include: {
        customer: true,
        technician: {
          select: {
            id: true,
            name: true,
          },
        },
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating service order:', error);
    res.status(500).json({ error: 'Erro ao atualizar ordem de serviço' });
  }
};

// Delete service order
export const deleteServiceOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user!.companyId;

    const serviceOrder = await prisma.serviceOrder.findFirst({
      where: { id, companyId },
      include: { items: true },
    });

    if (!serviceOrder) {
      return res.status(404).json({ error: 'Ordem de serviço não encontrada' });
    }

    // Return products to stock if status is not COMPLETED or DELIVERED
    if (!['COMPLETED', 'DELIVERED'].includes(serviceOrder.status)) {
      for (const item of serviceOrder.items) {
        if (item.type === 'PRODUCT' && item.productId) {
          await prisma.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });

          // Create inventory movement
          await prisma.inventoryMovement.create({
            data: {
              type: 'ENTRY',
              quantity: item.quantity,
              notes: `Cancelamento de OS ${serviceOrder.orderNumber}`,
              productId: item.productId,
              companyId,
            },
          });
        }
      }
    }

    await prisma.serviceOrder.delete({ where: { id } });

    res.json({ message: 'Ordem de serviço deletada com sucesso' });
  } catch (error) {
    console.error('Error deleting service order:', error);
    res.status(500).json({ error: 'Erro ao deletar ordem de serviço' });
  }
};
