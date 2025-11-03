import { Router } from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../controllers/product.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticate);

router.get('/', getProducts);
router.get('/:id', getProductById);
router.post('/', authorize('ADMIN', 'MANAGER'), createProduct);
router.put('/:id', authorize('ADMIN', 'MANAGER'), updateProduct);
router.delete('/:id', authorize('ADMIN', 'MANAGER'), deleteProduct);

export default router;
