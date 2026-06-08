import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import cookie from 'cookie';
import { User } from '../models/User';

// Maps userId -> set of socketIds
export const onlineUsers = new Map<string, Set<string>>();

export const getReceiverSockets = (userId: string): string[] => {
  const sockets = onlineUsers.get(userId.toString());
  return sockets ? Array.from(sockets) : [];
};

export const initSocket = (server: HttpServer): Server => {
  const allowedOrigins = process.env.CLIENT_URL
    ? process.env.CLIENT_URL.split(',').map(url => url.trim())
    : ['http://localhost:5173'];

  const io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST'],
    },
  });

  // Socket authentication middleware
  io.use(async (socket: Socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie || '';
      const cookies = cookie.parse(cookieHeader);
      let token = cookies.token || socket.handshake.auth?.token || socket.handshake.query?.token;

      if (typeof token === 'string' && token.startsWith('Bearer ')) {
        token = token.split(' ')[1];
      }

      if (!token) {
        return next(new Error('Authentication error: Token not provided'));
      }

      const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'pchat_secret_fallback_key');
      const user = await User.findById(decoded.userId).select('name username isBanned');

      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      if (user.isBanned) {
        return next(new Error('Authentication error: User has been banned'));
      }

      socket.data.user = user;
      next();
    } catch (err) {
      console.error('Socket authentication error:', err);
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', async (socket: Socket) => {
    const user = socket.data.user;
    const userId = user._id.toString();

    console.log(`Socket Connected: User ${user.username} (${socket.id})`);

    // Add socket to online users tracking map
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
      
      // Update online status in database
      try {
        const fullUser = await User.findByIdAndUpdate(userId, { isOnline: true }, { new: true })
          .select('name username email avatar bio statusMessage isOnline lastSeen');
        // Broadcast online status to all sockets
        io.emit('userStatus', { userId, isOnline: true, user: fullUser || undefined });
      } catch (error) {
        console.error(`Failed to update online status for user ${userId}:`, error);
      }
    }
    onlineUsers.get(userId)!.add(socket.id);

    // Join user to their own private room for direct notifications
    socket.join(userId);

    // Join specific Chat Room
    socket.on('joinChat', (chatId: string) => {
      socket.join(chatId);
      console.log(`User ${user.username} joined chat room: ${chatId}`);
    });

    // Leave Chat Room
    socket.on('leaveChat', (chatId: string) => {
      socket.leave(chatId);
      console.log(`User ${user.username} left chat room: ${chatId}`);
    });

    // Handle typing status
    socket.on('typing', ({ chatId, recipientIds }: { chatId: string; recipientIds: string[] }) => {
      if (chatId) {
        // Emit to chat room excluding sender
        socket.to(chatId).emit('typing', { chatId, userId, username: user.username });
      } else if (recipientIds) {
        // Fallback for direct notifications
        recipientIds.forEach((rId) => {
          socket.to(rId).emit('typing', { chatId, userId, username: user.username });
        });
      }
    });

    socket.on('stopTyping', ({ chatId, recipientIds }: { chatId: string; recipientIds: string[] }) => {
      if (chatId) {
        socket.to(chatId).emit('stopTyping', { chatId, userId });
      } else if (recipientIds) {
        recipientIds.forEach((rId) => {
          socket.to(rId).emit('stopTyping', { chatId, userId });
        });
      }
    });

    // ----------------------------------------------------
    // WEBRTC CALLING SIGNALLING LOGIC
    // ----------------------------------------------------

    // 1. Call User
    socket.on('callUser', ({
      targetUserId,
      offer,
      chatId,
      callType, // 'voice' | 'video'
      callerName,
      callerAvatar,
    }) => {
      const recipientSockets = getReceiverSockets(targetUserId);
      console.log(`Signalling: callUser from ${userId} to ${targetUserId} (sockets found: ${recipientSockets.length})`);
      
      recipientSockets.forEach((sId) => {
        io.to(sId).emit('incomingCall', {
          fromUserId: userId,
          callerName: callerName || user.name,
          callerAvatar: callerAvatar || '',
          offer,
          chatId,
          callType,
        });
      });
    });

    // 2. Answer Call
    socket.on('acceptCall', ({ targetUserId, answer }) => {
      const callerSockets = getReceiverSockets(targetUserId);
      console.log(`Signalling: acceptCall from ${userId} to ${targetUserId}`);

      callerSockets.forEach((sId) => {
        io.to(sId).emit('callAccepted', {
          fromUserId: userId,
          answer,
        });
      });
    });

    // 3. Reject Call
    socket.on('rejectCall', ({ targetUserId }) => {
      const callerSockets = getReceiverSockets(targetUserId);
      console.log(`Signalling: rejectCall from ${userId} to ${targetUserId}`);

      callerSockets.forEach((sId) => {
        io.to(sId).emit('callRejected', {
          fromUserId: userId,
        });
      });
    });

    // 4. ICE Candidates exchange
    socket.on('iceCandidate', ({ targetUserId, candidate }) => {
      const targetSockets = getReceiverSockets(targetUserId);
      targetSockets.forEach((sId) => {
        io.to(sId).emit('iceCandidate', {
          fromUserId: userId,
          candidate,
        });
      });
    });

    // 5. End/Hang up Call
    socket.on('endCall', ({ targetUserId }) => {
      const targetSockets = getReceiverSockets(targetUserId);
      console.log(`Signalling: endCall from ${userId} to ${targetUserId}`);

      targetSockets.forEach((sId) => {
        io.to(sId).emit('callEnded', {
          fromUserId: userId,
        });
      });
    });

    // Disconnect handler
    socket.on('disconnect', async () => {
      console.log(`Socket Disconnected: Socket ${socket.id} (User ${user.username})`);
      
      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          
          // Set offline status in DB
          try {
            const fullUser = await User.findByIdAndUpdate(userId, {
              isOnline: false,
              lastSeen: new Date(),
            }, { new: true })
              .select('name username email avatar bio statusMessage isOnline lastSeen');
            // Broadcast offline status
            io.emit('userStatus', {
              userId,
              isOnline: false,
              lastSeen: fullUser?.lastSeen || new Date(),
              user: fullUser || undefined,
            });
          } catch (error) {
            console.error(`Failed to update offline status for user ${userId}:`, error);
          }
        }
      }
    });
  });

  return io;
};
