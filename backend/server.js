import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes.js';
import adminRoutes from './routes/admin.routes.js';
import patientRoutes from './routes/patient.routes.js';
import patientAuthRoutes from './routes/patientAuth.routes.js';
import patientDashboardRoutes from './routes/patientDashboard.routes.js';
import homeVisitRoutes from './routes/homeVisit.routes.js';
import masterRoutes from './routes/master.routes.js';
import resultRoutes from './routes/result.routes.js';
import signatureRoutes from './routes/signature.routes.js';
import doctorRevenueRoutes from './routes/doctor-revenue.routes.js';
import pdfExtractRoutes from './routes/pdf-extract.routes.js';
import machineRoutes from './routes/machine.routes.js';
import machineConfigRoutes from './routes/machine-config.routes.js';
import inventoryRoutes from './routes/inventory.routes.js';
import reportSettingsRoutes from './routes/report-settings.routes.js';
import reportQRRoutes from './routes/report-qr.routes.js';
import organizationSettlementRoutes from './routes/organization-settlement.routes.js';
import referralDoctorSettlementRoutes from './routes/referral-doctor-settlement.routes.js';
import doctorComparativeReportRoutes from './routes/doctor-comparative-report.routes.js';
import inventoryStockManagementReportRoutes from './routes/inventory-stock-management-report.routes.js';
import { emailService } from './services/notification.service.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://192.168.0.105:3000',  // ← Your phone IP
  'http://192.168.0.105:5000',  // ← Your phone can access backend too
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded attachments
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/patient/auth', patientAuthRoutes);
app.use('/api/patient/dashboard', patientDashboardRoutes);
app.use('/api/home-visit', homeVisitRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/master', masterRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/signatures', signatureRoutes);
app.use('/api/machines', machineConfigRoutes);
app.use('/api/doctor-revenue', doctorRevenueRoutes);
app.use('/api/pdf-extract', pdfExtractRoutes);
app.use('/api/machine/v1', machineRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/report-settings', reportSettingsRoutes);
app.use('/api/report-qr', reportQRRoutes);
app.use('/api/organization-settlement', organizationSettlementRoutes);
app.use('/api/referral-doctor-settlement', referralDoctorSettlementRoutes);
app.use('/api/doctor-comparative-report', doctorComparativeReportRoutes);
app.use('/api/inventory-stock-management-report', inventoryStockManagementReportRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Shraddha Pathology Laboratory API is running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Start server
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV}`);
  console.log(`🌐 CORS enabled for: ${process.env.FRONTEND_URL}`);
  
  // Verify email service
  console.log('\n📧 Checking email service...');
  const emailVerified = await emailService.verifyConnection();
  if (emailVerified) {
    console.log('✅ Email service is ready to send credentials');
  } else {
    console.error('❌ Email service verification failed - credentials may not be sent');
    console.error('   Check your .env file for EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS');
  }
});
