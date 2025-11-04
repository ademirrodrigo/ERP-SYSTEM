import { Router } from 'express';
import {
  listServiceOrders,
  getServiceOrder,
  createServiceOrder,
  updateServiceOrder,
  deleteServiceOrder,
} from '../controllers/serviceOrderController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', listServiceOrders);
router.get('/:id', getServiceOrder);
router.post('/', createServiceOrder);
router.put('/:id', updateServiceOrder);
router.delete('/:id', deleteServiceOrder);

export default router;
