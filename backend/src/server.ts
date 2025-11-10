import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { config } from './config/env';
import { errorHandler } from './middleware/errorHandler';

// Import routes
import authRoutes from './routes/auth.routes';
import companyRoutes from './routes/company.routes';
import userRoutes from './routes/user.routes';
import customerRoutes from './routes/customer.routes';
import supplierRoutes from './routes/supplier.routes';
import productRoutes from './routes/product.routes';
import categoryRoutes from './routes/category.routes';
import saleRoutes from './routes/sale.routes';
import purchaseRoutes from './routes/purchase.routes';
import serviceOrderRoutes from './routes/serviceOrder.routes';
import accountPayableRoutes from './routes/accountPayable.routes';
import accountReceivableRoutes from './routes/accountReceivable.routes';
import nfseRoutes from './routes/nfse.routes';
import certificateRoutes from './routes/certificate.routes';
import cashFlowRoutes from './routes/cashFlow.routes';
import inventoryRoutes from './routes/inventory.routes';
import dashboardRoutes from './routes/dashboard.routes';

const app = express();

// Middlewares
app.use(helmet());
app.use(cors({ origin: config.cors.origin, credentials: true }));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan(config.nodeEnv === 'development' ? 'dev' : 'combined'));

// Root endpoint - API info
app.get('/', (req, res) => {
  res.json({
    name: 'ERP SaaS API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      api: '/api',
      documentation: {
        auth: '/api/auth (POST /login, POST /register)',
        companies: '/api/companies',
        users: '/api/users',
        customers: '/api/customers',
        suppliers: '/api/suppliers',
        products: '/api/products',
        categories: '/api/categories',
        sales: '/api/sales',
        purchases: '/api/purchases',
        serviceOrders: '/api/service-orders',
        accountsPayable: '/api/accounts-payable',
        accountsReceivable: '/api/accounts-receivable',
        nfse: '/api/nfse',
        certificate: '/api/certificate',
        cashFlow: '/api/cash-flow',
        inventory: '/api/inventory',
        dashboard: '/api/dashboard'
      }
    },
    frontend: config.cors.origin,
    message: 'API está rodando! Acesse o frontend em: ' + config.cors.origin
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/users', userRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/service-orders', serviceOrderRoutes);
app.use('/api/accounts-payable', accountPayableRoutes);
app.use('/api/accounts-receivable', accountReceivableRoutes);
app.use('/api/nfse', nfseRoutes);
app.use('/api/certificate', certificateRoutes);
app.use('/api/cash-flow', cashFlowRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/dashboard', dashboardRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// Error handler
app.use(errorHandler);

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📝 Ambiente: ${config.nodeEnv}`);
  console.log(`🌐 CORS: ${config.cors.origin}`);
});

export default app;
