/**
 * Point d'entrée du serveur
 * Configure Express, Socket.io et les handlers
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  GAME_CONSTANTS,
} from '../../../packages/shared/types';
import { setupRoomHandlers } from './handlers/roomHandler';
import { setupGameHandlers } from './handlers/gameHandler';
import { authMiddleware } from './middlewares/auth';
import authRoutes from './routes/auth';
import profileRoutes from './routes/profile';
import dailyRoutes from './routes/daily';

/**
 * Configuration du serveur
 */
const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

/**
 * Initialise l'application Express
 */
const app = express();

// Trust Railway / Vercel reverse proxy (ensures req.protocol = 'https' in prod)
app.set('trust proxy', 1);

// Middlewares
app.use(cors({
  origin: CLIENT_URL,
  credentials: true,
}));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(authMiddleware);

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/daily', dailyRoutes);

app.get('/api/rooms', (req, res) => {
  res.json({ rooms: [] });
});

/**
 * Crée le serveur HTTP
 */
const httpServer = createServer(app);

/**
 * Configure Socket.io avec typage
 */
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: CLIENT_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  // Configuration optimisée pour le temps réel
  pingInterval: 10000, // 10 secondes
  pingTimeout: 5000,   // 5 secondes
  transports: ['websocket', 'polling'],
});

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

/**
 * Parse cookies from a raw cookie header string
 */
function parseCookies(cookieHeader?: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(';').forEach((c) => {
    const [name, ...rest] = c.trim().split('=');
    if (name) cookies[name] = decodeURIComponent(rest.join('='));
  });
  return cookies;
}

/**
 * Socket.io middleware: attach userId from JWT cookie (guests are allowed)
 */
io.use((socket, next) => {
  const cookies = parseCookies(socket.handshake.headers.cookie);
  const token = cookies['bt_access'];
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as { userId: string; pseudo: string };
      socket.data.userId = payload.userId;
      socket.data.authPseudo = payload.pseudo;
    } catch {
      // Guest - no auth
    }
  }
  next();
});

/**
 * Gestion des connexions Socket.io
 */
io.on('connection', (socket) => {
  console.log(`✓ Client connected: ${socket.id}`);

  // Configurer les handlers pour ce socket
  setupRoomHandlers(socket, io);
  setupGameHandlers(socket, io);

  // Synchronisation du temps serveur (pour corriger le drift)
  const syncInterval = setInterval(() => {
    socket.emit('time_sync', {
      serverTime: Date.now(),
    });
  }, GAME_CONSTANTS.TIME_SYNC_INTERVAL_MS);

  // Nettoyer à la déconnexion
  socket.on('disconnect', (reason) => {
    console.log(`✗ Client disconnected: ${socket.id} (${reason})`);
    clearInterval(syncInterval);
  });

  // Gestion des erreurs
  socket.on('error', (error) => {
    console.error(`Socket error for ${socket.id}:`, error);
  });
});

/**
 * Gestion des erreurs Express
 */
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Express error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

/**
 * Démarre le serveur
 */
function startServer() {
  httpServer.listen(Number(PORT), '0.0.0.0', () => {
    console.log('');
    console.log('🎵 =================================== 🎵');
    console.log('🎧  Blind Test Server is running!  🎧');
    console.log('🎵 =================================== 🎵');
    console.log('');
    console.log(`  📡 HTTP Server:  http://localhost:${PORT}`);
    console.log(`  🔌 Socket.io:    ws://localhost:${PORT}`);
    console.log(`  🌍 Client URL:   ${CLIENT_URL}`);
    console.log('');
    console.log(`  Environment:    ${process.env.NODE_ENV || 'development'}`);
    console.log('');
    console.log('  Ready to accept connections...');
    console.log('');
  });
}

/**
 * Gestion gracieuse de l'arrêt
 */
process.on('SIGINT', () => {
  console.log('\n\nShutting down gracefully...');

  httpServer.close(() => {
    console.log('HTTP server closed');

    // Fermer toutes les connexions Socket.io
    io.close(() => {
      console.log('Socket.io server closed');
      process.exit(0);
    });
  });

  // Forcer l'arrêt après 10 secondes
  setTimeout(() => {
    console.error('Forcing shutdown after timeout');
    process.exit(1);
  }, 10000);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  httpServer.close(() => {
    process.exit(0);
  });
});

// Démarrer le serveur
startServer();

// Export pour les tests
export { app, io, httpServer, startServer };
