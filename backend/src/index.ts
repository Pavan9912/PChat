import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

// Import configurations & middlewares
import { connectDB } from './config/db';
import { initSocket } from './socket/socket';
import { notFound, errorHandler } from './middleware/error.middleware';
import { apiLimiter } from './middleware/rateLimiter.middleware';
import { uploadDir } from './middleware/upload.middleware';

// Import routers
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import friendRoutes from './routes/friend.routes';
import chatRoutes from './routes/chat.routes';
import messageRoutes from './routes/message.routes';
import adminRoutes from './routes/admin.routes';
import statusRoutes from './routes/status.routes';

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);

// Connect to MongoDB
connectDB();

// Init Socket.IO and attach it to Express app
const io = initSocket(server);
app.set('socketio', io);

const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map(url => url.trim())
  : ['http://localhost:5173'];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Apply global rate limiting to all API endpoints
app.use('/api', apiLimiter);

// Ensure local uploads directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Serve uploaded files statically
app.use('/uploads', express.static(uploadDir));

// Route bindings
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/status', statusRoutes);

// Base route for server health check
app.get('/', (req, res) => {
  res.status(200).json({ status: 'success', message: 'PVN Chat API Gateway running' });
});

// Error Interceptors
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`========================================`);
  console.log(`   PVN Chat Server listening on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`========================================`);
});
