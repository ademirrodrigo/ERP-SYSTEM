import { Router } from 'express';
import {
  uploadCertificate,
  getCertificateStatus,
  deleteCertificate,
  updateFiscalData,
  getFiscalData,
  upload,
} from '../controllers/certificateController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// Certificado Digital
router.post('/upload', upload.single('certificate'), uploadCertificate);
router.get('/status', getCertificateStatus);
router.delete('/', deleteCertificate);

// Dados Fiscais
router.get('/fiscal', getFiscalData);
router.put('/fiscal', updateFiscalData);

export default router;
