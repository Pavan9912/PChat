import { Response } from 'express';
import { Message } from '../models/Message';
import { Chat } from '../models/Chat';
import { User } from '../models/User';
import { AuthRequest } from '../middleware/auth.middleware';
import { uploadToCloudinary } from '../config/cloudinary';

// Helper to determine message type from mime-type
const getMessageType = (mimeType: string, isVoice?: boolean): 'image' | 'video' | 'audio' | 'voice' | 'document' | 'gif' => {
  if (isVoice) return 'voice';
  if (mimeType.startsWith('image/')) {
    if (mimeType.includes('gif')) return 'gif';
    return 'image';
  }
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'document';
};

// @desc    Send a Message (Text / Attachment)
// @route   POST /api/messages
// @access  Private
export const sendMessage = async (req: AuthRequest, res: Response) => {
  const { chatId, content, repliedToId, isVoice } = req.body;
  if (!req.user) return res.status(401).json({ message: 'Not authenticated' });

  if (!chatId) {
    return res.status(400).json({ message: 'Chat ID is required' });
  }

  try {
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Verify participant
    if (!chat.participants.some((id) => id.toString() === req.user!._id.toString())) {
      return res.status(403).json({ message: 'You are not a member of this chat' });
    }

    let messageData: any = {
      sender: req.user._id,
      chat: chatId,
      content: content || '',
      messageType: 'text',
      readBy: [req.user._id], // Sender automatically read it
      deliveredTo: [req.user._id],
    };

    if (repliedToId) {
      messageData.repliedTo = repliedToId;
    }

    // Handle file upload if present
    if (req.file) {
      const mimeType = req.file.mimetype;
      const isVoiceMsg = isVoice === 'true' || isVoice === true;
      const computedType = getMessageType(mimeType, isVoiceMsg);
      
      const uploadResult = await uploadToCloudinary(req.file.path, 'pchat_messages');
      
      messageData.messageType = computedType;
      messageData.mediaUrl = uploadResult ? uploadResult.url : `/uploads/${req.file.filename}`;
      messageData.mediaPublicId = uploadResult ? uploadResult.publicId : undefined;
      messageData.fileName = req.file.originalname;
      messageData.fileSize = req.file.size;

      // If text content is empty, set filename as content fallback
      if (!messageData.content) {
        messageData.content = req.file.originalname;
      }
    }

    const message = await Message.create(messageData);

    // Populate sender info
    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'name username email avatar bio statusMessage isOnline')
      .populate({
        path: 'repliedTo',
        populate: {
          path: 'sender',
          select: 'name username',
        },
      });

    // Update lastMessage in Chat
    chat.lastMessage = message._id as any;
    await chat.save();

    // Broadcast message via Socket.IO
    const io = req.app.get('socketio');
    if (io) {
      io.to(chatId).emit('messageReceived', populatedMessage);
    }

    return res.status(201).json(populatedMessage);
  } catch (error: any) {
    console.error('Send message error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Get Chat Messages (Paginated)
// @route   GET /api/messages/:chatId
// @access  Private
export const getMessages = async (req: AuthRequest, res: Response) => {
  const { chatId } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  if (!req.user) return res.status(401).json({ message: 'Not authenticated' });

  try {
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Verify participant
    if (!chat.participants.some((id) => id.toString() === req.user!._id.toString())) {
      return res.status(403).json({ message: 'You are not a member of this chat' });
    }

    const skip = (page - 1) * limit;

    const messages = await Message.find({
      chat: chatId,
      deletedFor: { $ne: req.user._id as any }, // Don't return messages user deleted for themselves
    })
      .populate('sender', 'name username email avatar bio statusMessage isOnline')
      .populate({
        path: 'repliedTo',
        populate: {
          path: 'sender',
          select: 'name username',
        },
      })
      .sort({ createdAt: -1 }) // Get newest first, client will reverse for layout
      .skip(skip)
      .limit(limit);

    const totalMessages = await Message.countDocuments({
      chat: chatId,
      deletedFor: { $ne: req.user._id as any },
    });

    return res.status(200).json({
      messages: messages.reverse(), // Reverse back to chronological order
      currentPage: page,
      totalPages: Math.ceil(totalMessages / limit),
      totalMessages,
    });
  } catch (error: any) {
    console.error('Get messages error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Edit Message Content
// @route   PUT /api/messages/:messageId
// @access  Private
export const editMessage = async (req: AuthRequest, res: Response) => {
  const { messageId } = req.params;
  const { content } = req.body;
  if (!req.user) return res.status(401).json({ message: 'Not authenticated' });

  if (!content) return res.status(400).json({ message: 'Content is required' });

  try {
    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: 'Message not found' });

    // Verify sender
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only edit your own messages' });
    }

    if (message.messageType !== 'text') {
      return res.status(400).json({ message: 'You can only edit text messages' });
    }

    message.content = content.trim();
    message.isEdited = true;
    await message.save();

    const populatedMessage = await Message.findById(messageId)
      .populate('sender', 'name username email avatar bio statusMessage isOnline')
      .populate({
        path: 'repliedTo',
        populate: {
          path: 'sender',
          select: 'name username',
        },
      });

    // Broadcast message edit in real-time
    const io = req.app.get('socketio');
    if (io && populatedMessage) {
      io.to(populatedMessage.chat.toString()).emit('messageUpdated', populatedMessage);
    }

    return res.status(200).json(populatedMessage);
  } catch (error: any) {
    console.error('Edit message error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Delete Message (Self or Everyone)
// @route   DELETE /api/messages/:messageId
// @access  Private
export const deleteMessage = async (req: AuthRequest, res: Response) => {
  const { messageId } = req.params;
  const { type } = req.query; // 'me' or 'everyone'
  if (!req.user) return res.status(401).json({ message: 'Not authenticated' });

  try {
    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: 'Message not found' });

    if (type === 'everyone') {
      // Verify sender
      if (message.sender.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'You can only delete your own messages for everyone' });
      }

      message.deletedEveryone = true;
      message.content = 'This message was deleted';
      message.mediaUrl = undefined;
      message.fileName = undefined;
      message.fileSize = undefined;
      await message.save();

      // Broadcast message deletion in real-time
      const io = req.app.get('socketio');
      if (io) {
        io.to(message.chat.toString()).emit('messageUpdated', message);
      }

      return res.status(200).json({ messageId, type: 'everyone', message });
    } else {
      // Delete for me
      if (!message.deletedFor.includes(req.user._id as any)) {
        message.deletedFor.push(req.user._id as any);
        await message.save();
      }
      return res.status(200).json({ messageId, type: 'me' });
    }
  } catch (error: any) {
    console.error('Delete message error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    React to a Message with Emoji
// @route   POST /api/messages/:messageId/react
// @access  Private
export const reactToMessage = async (req: AuthRequest, res: Response) => {
  const { messageId } = req.params;
  const { emoji } = req.body; // Emoji symbol string
  if (!req.user) return res.status(401).json({ message: 'Not authenticated' });

  if (!emoji) return res.status(400).json({ message: 'Emoji is required' });

  try {
    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: 'Message not found' });

    // Check if user already reacted
    const existingReactionIndex = message.reactions.findIndex(
      (r) => r.user.toString() === req.user!._id.toString()
    );

    if (existingReactionIndex > -1) {
      if (message.reactions[existingReactionIndex].emoji === emoji) {
        // Toggle off reaction if clicked twice
        message.reactions.splice(existingReactionIndex, 1);
      } else {
        // Update reaction emoji if changed
        message.reactions[existingReactionIndex].emoji = emoji;
      }
    } else {
      // Add new reaction
      message.reactions.push({ user: req.user._id as any, emoji });
    }

    await message.save();

    const populatedMessage = await Message.findById(messageId)
      .populate('sender', 'name username email avatar bio statusMessage isOnline')
      .populate({
        path: 'repliedTo',
        populate: {
          path: 'sender',
          select: 'name username',
        },
      });

    // Broadcast reactions update in real-time
    const io = req.app.get('socketio');
    if (io && populatedMessage) {
      io.to(populatedMessage.chat.toString()).emit('messageUpdated', populatedMessage);
    }

    return res.status(200).json(populatedMessage);
  } catch (error: any) {
    console.error('React to message error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Pin Message in Conversation
// @route   POST /api/messages/:messageId/pin
// @access  Private
export const pinMessage = async (req: AuthRequest, res: Response) => {
  const { messageId } = req.params;
  if (!req.user) return res.status(401).json({ message: 'Not authenticated' });

  try {
    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: 'Message not found' });

    message.isPinned = !message.isPinned;
    await message.save();

    return res.status(200).json({ messageId, isPinned: message.isPinned });
  } catch (error: any) {
    console.error('Pin message error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Star / Favorite Message
// @route   POST /api/messages/:messageId/star
// @access  Private
export const starMessage = async (req: AuthRequest, res: Response) => {
  const { messageId } = req.params;
  if (!req.user) return res.status(401).json({ message: 'Not authenticated' });

  try {
    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: 'Message not found' });

    const isStarred = message.starredBy.includes(req.user._id as any);
    if (isStarred) {
      message.starredBy = message.starredBy.filter((id) => id.toString() !== req.user!._id.toString());
    } else {
      message.starredBy.push(req.user._id as any);
    }

    await message.save();
    return res.status(200).json({ messageId, isStarred: !isStarred });
  } catch (error: any) {
    console.error('Star message error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Get Starred messages of a chat
// @route   GET /api/messages/starred/:chatId
// @access  Private
export const getStarredMessages = async (req: AuthRequest, res: Response) => {
  const { chatId } = req.params;
  if (!req.user) return res.status(401).json({ message: 'Not authenticated' });

  try {
    const starredMessages = await Message.find({
      chat: chatId,
      starredBy: { $in: [req.user._id as any] },
    }).populate('sender', 'name username avatar');

    return res.status(200).json(starredMessages);
  } catch (error: any) {
    console.error('Get starred messages error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};
