import { Response } from 'express';
import crypto from 'crypto';
import { Chat } from '../models/Chat';
import { User } from '../models/User';
import { AuthRequest } from '../middleware/auth.middleware';
import { uploadToCloudinary } from '../config/cloudinary';
import { populateChatsLastMessage, populateChatLastMessage } from '../models/Message';

const formatChatWithBlockStatus = (chat: any, currentUserId: any) => {
  if (!chat) return null;
  const chatObj = typeof chat.toObject === 'function' ? chat.toObject() : chat;
  const currentUserIdStr = currentUserId ? currentUserId.toString() : '';

  if (!chatObj.isGroupChat) {
    const partner = chatObj.participants.find((p: any) => p._id.toString() !== currentUserIdStr);
    const currentUser = chatObj.participants.find((p: any) => p._id.toString() === currentUserIdStr);

    if (partner && currentUser) {
      const partnerBlockedUsers = partner.blockedUsers || [];
      const currentUserBlockedUsers = currentUser.blockedUsers || [];

      chatObj.hasBlockedMe = partnerBlockedUsers.some((id: any) => id.toString() === currentUserIdStr);
      chatObj.hasBlockedPartner = currentUserBlockedUsers.some((id: any) => id.toString() === partner._id.toString());
    }
  }

  if (chatObj.participants) {
    chatObj.participants.forEach((p: any) => {
      if (p && typeof p === 'object') {
        delete p.blockedUsers;
      }
    });
  }

  return chatObj;
};

// @desc    Create or access a 1-to-1 Chat
// @Route   POST /api/chats
// @Access  Private
export const createChat = async (req: AuthRequest, res: Response) => {
  const { recipientId } = req.body;
  if (!req.user) return res.status(401).json({ message: 'Not authenticated' });

  if (!recipientId) {
    return res.status(400).json({ message: 'Recipient ID is required' });
  }

  try {
    // Check if 1-to-1 chat already exists
    let chat = await Chat.findOne({
      isGroupChat: false,
      participants: { $all: [req.user._id, recipientId] },
    })
      .populate('participants', 'name username email avatar bio statusMessage isOnline lastSeen blockedUsers');

    if (chat) {
      const chatWithLastMessage = await populateChatLastMessage(chat, req.user._id.toString());
      return res.status(200).json(formatChatWithBlockStatus(chatWithLastMessage, req.user._id));
    }

    // Create new 1-on-1 chat
    const newChat = await Chat.create({
      isGroupChat: false,
      participants: [req.user._id, recipientId],
      admins: [req.user._id, recipientId], // Direct chats can have both as admins for simplicity
    });

    const fullChat = await Chat.findById(newChat._id).populate(
      'participants',
      'name username email avatar bio statusMessage isOnline lastSeen blockedUsers'
    );

    const chatWithLastMessage = await populateChatLastMessage(fullChat, req.user._id.toString());
    return res.status(201).json(formatChatWithBlockStatus(chatWithLastMessage, req.user._id));
  } catch (error: any) {
    console.error('Create direct chat error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Create a Group Chat
// @Route   POST /api/chats/group
// @Access  Private
export const createGroup = async (req: AuthRequest, res: Response) => {
  const { name, description, participantIds } = req.body;
  if (!req.user) return res.status(401).json({ message: 'Not authenticated' });

  if (!name) {
    return res.status(400).json({ message: 'Group name is required' });
  }

  try {
    const inviteCode = crypto.randomBytes(4).toString('hex'); // 8-char hex code
    
    // Add current user to participants list if not present
    const participants = Array.isArray(participantIds) ? [...participantIds] : [];
    if (!participants.includes(req.user._id.toString())) {
      participants.push(req.user._id.toString());
    }

    const group = await Chat.create({
      isGroupChat: true,
      name: name.trim(),
      description: (description || '').trim(),
      creator: req.user._id,
      admins: [req.user._id],
      participants,
      inviteCode,
    });

    const fullGroup = await Chat.findById(group._id)
      .populate('participants', 'name username email avatar bio statusMessage isOnline lastSeen blockedUsers')
      .populate('creator', 'name username email');

    return res.status(201).json(formatChatWithBlockStatus(fullGroup, req.user._id));
  } catch (error: any) {
    console.error('Create group error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Get all user chats (includes direct and group)
// @Route   GET /api/chats
// @Access  Private
export const getChats = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Not authenticated' });

  try {
    const chats = await Chat.find({
      participants: { $in: [req.user._id] },
    })
      .populate('participants', 'name username email avatar bio statusMessage isOnline lastSeen blockedUsers')
      .populate('admins', 'name username email')
      .populate('creator', 'name username email')
      .sort({ updatedAt: -1 });

    const populatedChats = await populateChatsLastMessage(chats, req.user._id.toString());
    const formattedChats = populatedChats.map((chat) => formatChatWithBlockStatus(chat, req.user!._id));
    return res.status(200).json(formattedChats);
  } catch (error: any) {
    console.error('Get chats error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Get details of a single chat
// @Route   GET /api/chats/:chatId
// @Access  Private
export const getChatDetails = async (req: AuthRequest, res: Response) => {
  const { chatId } = req.params;
  if (!req.user) return res.status(401).json({ message: 'Not authenticated' });

  try {
    const chat = await Chat.findById(chatId)
      .populate('participants', 'name username email avatar bio statusMessage isOnline lastSeen blockedUsers')
      .populate('admins', 'name username email avatar bio')
      .populate('creator', 'name username email avatar');

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    if (!chat.participants.some((p: any) => p._id.toString() === req.user!._id.toString())) {
      return res.status(403).json({ message: 'You are not a participant in this conversation' });
    }

    const chatWithLastMessage = await populateChatLastMessage(chat, req.user._id.toString());
    return res.status(200).json(formatChatWithBlockStatus(chatWithLastMessage, req.user._id));
  } catch (error: any) {
    console.error('Get chat details error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Update Group settings (name, description, avatar)
// @Route   PUT /api/chats/group/:chatId
// @Access  Private
export const updateGroupSettings = async (req: AuthRequest, res: Response) => {
  const { chatId } = req.params;
  const { name, description } = req.body;
  if (!req.user) return res.status(401).json({ message: 'Not authenticated' });

  try {
    const chat = await Chat.findById(chatId);
    if (!chat || !chat.isGroupChat) {
      return res.status(404).json({ message: 'Group chat not found' });
    }

    // Verify participant
    if (!chat.participants.some((id) => id.toString() === req.user!._id.toString())) {
      return res.status(403).json({ message: 'You are not a member of this group' });
    }

    // Update avatar image if file is uploaded
    if (req.file) {
      const result = await uploadToCloudinary(req.file.path, 'pchat_groups');
      chat.avatar = result ? result.url : `/uploads/${req.file.filename}`;
    }

    if (name) chat.name = name.trim();
    if (description !== undefined) chat.description = description.trim();

    await chat.save();
    const fullChat = await Chat.findById(chatId)
      .populate('participants', 'name username email avatar bio statusMessage isOnline lastSeen blockedUsers')
      .populate('admins', 'name username email');

    return res.status(200).json(formatChatWithBlockStatus(fullChat, req.user._id));
  } catch (error: any) {
    console.error('Update group settings error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Invite members to Group
// @Route   POST /api/chats/group/:chatId/invite
// @Access  Private
export const inviteToGroup = async (req: AuthRequest, res: Response) => {
  const { chatId } = req.params;
  const { userIds } = req.body; // Array of user IDs
  if (!req.user) return res.status(401).json({ message: 'Not authenticated' });

  try {
    const chat = await Chat.findById(chatId);
    if (!chat || !chat.isGroupChat) {
      return res.status(404).json({ message: 'Group chat not found' });
    }

    // Admins or general members depending on configuration, let's allow admins only for security
    if (!chat.admins.some((id) => id.toString() === req.user!._id.toString())) {
      return res.status(403).json({ message: 'Only admins can add participants' });
    }

    // Merge participants avoiding duplicates
    userIds.forEach((id: string) => {
      if (!chat.participants.some((pId) => pId.toString() === id)) {
        chat.participants.push(id as any);
      }
    });

    await chat.save();
    const fullChat = await Chat.findById(chatId)
      .populate('participants', 'name username email avatar bio statusMessage isOnline lastSeen blockedUsers')
      .populate('admins', 'name username email');

    return res.status(200).json(formatChatWithBlockStatus(fullChat, req.user._id));
  } catch (error: any) {
    console.error('Invite to group error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Remove member from Group
// @Route   DELETE /api/chats/group/:chatId/remove/:userId
// @Access  Private
export const removeFromGroup = async (req: AuthRequest, res: Response) => {
  const { chatId, userId } = req.params;
  if (!req.user) return res.status(401).json({ message: 'Not authenticated' });

  try {
    const chat = await Chat.findById(chatId);
    if (!chat || !chat.isGroupChat) {
      return res.status(404).json({ message: 'Group chat not found' });
    }

    // Must be admin to remove others
    if (!chat.admins.some((id) => id.toString() === req.user!._id.toString())) {
      return res.status(403).json({ message: 'Only admins can remove participants' });
    }

    chat.participants = chat.participants.filter((id) => id.toString() !== userId);
    chat.admins = chat.admins.filter((id) => id.toString() !== userId);

    await chat.save();
    const fullChat = await Chat.findById(chatId)
      .populate('participants', 'name username email avatar bio statusMessage isOnline lastSeen blockedUsers')
      .populate('admins', 'name username email');

    return res.status(200).json(formatChatWithBlockStatus(fullChat, req.user._id));
  } catch (error: any) {
    console.error('Remove member error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Promote member to Admin
// @Route   PUT /api/chats/group/:chatId/promote
// @Access  Private
export const promoteAdmin = async (req: AuthRequest, res: Response) => {
  const { chatId } = req.params;
  const { userId } = req.body;
  if (!req.user) return res.status(401).json({ message: 'Not authenticated' });

  try {
    const chat = await Chat.findById(chatId);
    if (!chat || !chat.isGroupChat) {
      return res.status(404).json({ message: 'Group chat not found' });
    }

    // Must be admin to promote others
    if (!chat.admins.some((id) => id.toString() === req.user!._id.toString())) {
      return res.status(403).json({ message: 'Only admins can promote members' });
    }

    if (!chat.admins.some((id) => id.toString() === userId)) {
      chat.admins.push(userId);
    }

    await chat.save();
    const fullChat = await Chat.findById(chatId)
      .populate('participants', 'name username email avatar bio statusMessage isOnline lastSeen blockedUsers')
      .populate('admins', 'name username email');

    return res.status(200).json(formatChatWithBlockStatus(fullChat, req.user._id));
  } catch (error: any) {
    console.error('Promote admin error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Leave Group
// @Route   DELETE /api/chats/group/:chatId/leave
// @Access  Private
export const leaveGroup = async (req: AuthRequest, res: Response) => {
  const { chatId } = req.params;
  if (!req.user) return res.status(401).json({ message: 'Not authenticated' });

  try {
    const chat = await Chat.findById(chatId);
    if (!chat || !chat.isGroupChat) {
      return res.status(404).json({ message: 'Group chat not found' });
    }

    chat.participants = chat.participants.filter((id) => id.toString() !== req.user!._id.toString());
    chat.admins = chat.admins.filter((id) => id.toString() !== req.user!._id.toString());

    if (chat.participants.length === 0) {
      // Delete empty group
      await Chat.findByIdAndDelete(chatId);
      return res.status(200).json({ message: 'Left group. Group deleted because it became empty.' });
    }

    // If no admins are left, promote the next oldest participant
    if (chat.admins.length === 0) {
      chat.admins.push(chat.participants[0]);
    }

    await chat.save();
    return res.status(200).json({ message: 'Left group successfully' });
  } catch (error: any) {
    console.error('Leave group error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Pin Chat
// @Route   POST /api/chats/:chatId/pin
// @Access  Private
export const pinChat = async (req: AuthRequest, res: Response) => {
  const { chatId } = req.params;
  if (!req.user) return res.status(401).json({ message: 'Not authenticated' });

  try {
    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ message: 'Chat not found' });

    if (!chat.isPinnedBy.includes(req.user._id as any)) {
      chat.isPinnedBy.push(req.user._id as any);
      await chat.save();
    }
    return res.status(200).json({ message: 'Chat pinned successfully', isPinned: true });
  } catch (error: any) {
    console.error('Pin chat error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Unpin Chat
// @Route   POST /api/chats/:chatId/unpin
// @Access  Private
export const unpinChat = async (req: AuthRequest, res: Response) => {
  const { chatId } = req.params;
  if (!req.user) return res.status(401).json({ message: 'Not authenticated' });

  try {
    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ message: 'Chat not found' });

    chat.isPinnedBy = chat.isPinnedBy.filter((id) => id.toString() !== req.user!._id.toString());
    await chat.save();

    return res.status(200).json({ message: 'Chat unpinned successfully', isPinned: false });
  } catch (error: any) {
    console.error('Unpin chat error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Archive Chat
// @Route   POST /api/chats/:chatId/archive
// @Access  Private
export const archiveChat = async (req: AuthRequest, res: Response) => {
  const { chatId } = req.params;
  if (!req.user) return res.status(401).json({ message: 'Not authenticated' });

  try {
    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ message: 'Chat not found' });

    if (!chat.isArchivedBy.includes(req.user._id as any)) {
      chat.isArchivedBy.push(req.user._id as any);
      await chat.save();
    }
    return res.status(200).json({ message: 'Chat archived successfully', isArchived: true });
  } catch (error: any) {
    console.error('Archive chat error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Unarchive Chat
// @Route   POST /api/chats/:chatId/unarchive
// @Access  Private
export const unarchiveChat = async (req: AuthRequest, res: Response) => {
  const { chatId } = req.params;
  if (!req.user) return res.status(401).json({ message: 'Not authenticated' });

  try {
    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ message: 'Chat not found' });

    chat.isArchivedBy = chat.isArchivedBy.filter((id) => id.toString() !== req.user!._id.toString());
    await chat.save();

    return res.status(200).json({ message: 'Chat unarchived successfully', isArchived: false });
  } catch (error: any) {
    console.error('Unarchive chat error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Join Group Chat via invite link code
// @Route   POST /api/chats/join/:inviteCode
// @Access  Private
export const joinGroupByInviteCode = async (req: AuthRequest, res: Response) => {
  const { inviteCode } = req.params;
  if (!req.user) return res.status(401).json({ message: 'Not authenticated' });

  try {
    const chat = await Chat.findOne({ inviteCode, isGroupChat: true });
    if (!chat) {
      return res.status(404).json({ message: 'Group not found with this invite link' });
    }

    if (chat.participants.includes(req.user._id as any)) {
      return res.status(200).json({ message: 'You are already a participant in this group', chat });
    }

    chat.participants.push(req.user._id as any);
    await chat.save();

    const fullChat = await Chat.findById(chat._id)
      .populate('participants', 'name username email avatar bio statusMessage isOnline lastSeen blockedUsers')
      .populate('creator', 'name username email');

    return res.status(200).json({ message: 'Joined group successfully', chat: formatChatWithBlockStatus(fullChat, req.user._id) });
  } catch (error: any) {
    console.error('Join group by code error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Lock Chat for current user
// @route   POST /api/chats/:chatId/lock
// @access  Private
export const lockChat = async (req: AuthRequest, res: Response) => {
  const { chatId } = req.params;
  const { pin } = req.body;

  if (!req.user) return res.status(401).json({ message: 'Not authenticated' });

  if (!pin) {
    return res.status(400).json({ message: 'PIN is required to lock chat' });
  }

  try {
    const user = await User.findById(req.user._id);
    if (!user || !user.chatLockPin) {
      return res.status(400).json({ message: 'Please set up a chat lock PIN first' });
    }

    const isMatch = await user.compareChatLockPin(pin);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid PIN' });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ message: 'Chat not found' });

    // Check if user is participant
    if (!chat.participants.some((p) => p.toString() === req.user!._id.toString())) {
      return res.status(403).json({ message: 'You are not a participant in this conversation' });
    }

    if (!chat.lockedBy.includes(req.user._id as any)) {
      chat.lockedBy.push(req.user._id as any);
      await chat.save();
    }

    const fullChat = await Chat.findById(chatId)
      .populate('participants', 'name username email avatar bio statusMessage isOnline lastSeen blockedUsers')
      .populate('admins', 'name username email')
      .populate('creator', 'name username email');

    const chatWithLastMessage = await populateChatLastMessage(fullChat, req.user._id.toString());
    return res.status(200).json(formatChatWithBlockStatus(chatWithLastMessage, req.user._id));
  } catch (error: any) {
    console.error('Lock chat error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Unlock Chat for current user
// @route   POST /api/chats/:chatId/unlock
// @access  Private
export const unlockChat = async (req: AuthRequest, res: Response) => {
  const { chatId } = req.params;
  const { pin } = req.body;

  if (!req.user) return res.status(401).json({ message: 'Not authenticated' });

  if (!pin) {
    return res.status(400).json({ message: 'PIN is required to unlock chat' });
  }

  try {
    const user = await User.findById(req.user._id);
    if (!user || !user.chatLockPin) {
      return res.status(400).json({ message: 'Please set up a chat lock PIN first' });
    }

    const isMatch = await user.compareChatLockPin(pin);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid PIN' });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ message: 'Chat not found' });

    chat.lockedBy = chat.lockedBy.filter((id) => id.toString() !== req.user!._id.toString());
    await chat.save();

    const fullChat = await Chat.findById(chatId)
      .populate('participants', 'name username email avatar bio statusMessage isOnline lastSeen blockedUsers')
      .populate('admins', 'name username email')
      .populate('creator', 'name username email');

    const chatWithLastMessage = await populateChatLastMessage(fullChat, req.user._id.toString());
    return res.status(200).json(formatChatWithBlockStatus(chatWithLastMessage, req.user._id));
  } catch (error: any) {
    console.error('Unlock chat error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};
