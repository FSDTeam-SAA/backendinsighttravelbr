import { Server } from 'socket.io';
import { verifyToken } from '../utils/jwt.js';

export const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Admin dashboard joins a dedicated room after supplying a valid JWT
    socket.on('join-admin', (token) => {
      try {
        const decoded = verifyToken(token, process.env.JWT_SECRET);
        if (decoded?.role === 'admin') {
          socket.join('admin-room');
          socket.emit('joined-admin', { message: 'Joined admin room' });
        } else {
          socket.emit('error', { message: 'Unauthorized: admin only' });
        }
      } catch {
        socket.emit('error', { message: 'Invalid or expired token' });
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
};

// ── Emit helpers (use in controllers via req.app.get('io')) ───────────────────
export const emitTripCreated = (io, trip) =>
  io.to('admin-room').emit('trip:created', trip);

export const emitTravelerAdded = (io, traveler) =>
  io.to('admin-room').emit('traveler:added', traveler);
