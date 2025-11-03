import { Router } from 'express';
import {
  getSales,
  getSaleById,
  createSale,
  updateSale,
  cancelSale,
} from '../controllers/sale.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getSales);
router.get('/:id', getSaleById);
router.post('/', createSale);
router.put('/:id', updateSale);
router.post('/:id/cancel', cancelSale);

export default router;
