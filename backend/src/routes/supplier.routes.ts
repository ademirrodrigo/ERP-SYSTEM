import { Router } from 'express';
import { authenticate } from '../middleware/auth';
const router = Router();
router.use(authenticate);
// Rotas similares a customers - implementação básica
export default router;
