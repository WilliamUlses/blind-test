/**
 * Point d'entrée du serveur
 * Configure Express, Socket.io et les handlers
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  GAME_CONSTANTS,
} from '../../../packages/shared/types';
import { setupRoomHandlers } from './handlers/roomHandler';
import { setupGameHandlers } from './handlers/gameHandler';

/**
 * Configuration du serveur
 */
const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

/**
 * Initialise l'application Express
 */
const app = express();

// Middlewares
app.use(cors({
  origin: CLIENT_URL,
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes API (pour les requêtes HTTP classiques si nécessaire)
app.get('/api/rooms', (req, res) => {
  // TODO: Implémenter la liste des rooms publiques si nécessaire
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

/**
 * Middleware Socket.io pour logger les connexions
 */
io.use((socket, next) => {
  const userAgent = socket.handshake.headers['user-agent'];
  console.log(`New connection attempt: ${socket.id} from ${userAgent}`);
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
  httpServer.listen(PORT, () => {
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
if (require.main === module) {
  startServer();
}

// Export pour les tests
export { app, io, httpServer, startServer };
