import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import institutionRoutes from './routes/institution.routes';
import productRoutes from './routes/product.routes';
import newsRoutes from './routes/news.routes';

dotenv.config();

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Routes
app.use('/api/v1/Auth', authRoutes);
app.use('/api/v1/Users', userRoutes);
app.use('/api/v1/Institutions', institutionRoutes);
app.use('/api/v1/Products', productRoutes);
app.use('/api/v1/News', newsRoutes);
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'ResolveBridge Node Backend',
    timestamp: new Date().toISOString() 
  });
});

export default app;
