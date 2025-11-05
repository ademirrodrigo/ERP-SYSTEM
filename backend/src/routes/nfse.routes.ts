import { Router } from 'express';
import {
  listNfse,
  getNfse,
  createNfse,
  updateNfse,
  sendNfse,
  cancelNfse,
  deleteNfse,
  generatePdfNfse,
} from '../controllers/nfseController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', listNfse);
router.get('/:id', getNfse);
router.post('/', createNfse);
router.put('/:id', updateNfse);
router.post('/:id/send', sendNfse);
router.post('/:id/cancel', cancelNfse);
router.delete('/:id', deleteNfse);
router.get('/:id/pdf', generatePdfNfse);

export default router;
