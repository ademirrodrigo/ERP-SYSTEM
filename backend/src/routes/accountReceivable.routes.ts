import { Router } from 'express';
import {
  listAccountsReceivable,
  getAccountReceivable,
  createAccountReceivable,
  updateAccountReceivable,
  markAsPaid,
  deleteAccountReceivable,
} from '../controllers/accountReceivableController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', listAccountsReceivable);
router.get('/:id', getAccountReceivable);
router.post('/', createAccountReceivable);
router.put('/:id', updateAccountReceivable);
router.put('/:id/mark-paid', markAsPaid);
router.delete('/:id', deleteAccountReceivable);

export default router;
