import { Router } from 'express';
import {
  listAccountsPayable,
  getAccountPayable,
  createAccountPayable,
  updateAccountPayable,
  markAsPaid,
  deleteAccountPayable,
} from '../controllers/accountPayableController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', listAccountsPayable);
router.get('/:id', getAccountPayable);
router.post('/', createAccountPayable);
router.put('/:id', updateAccountPayable);
router.put('/:id/mark-paid', markAsPaid);
router.delete('/:id', deleteAccountPayable);

export default router;
