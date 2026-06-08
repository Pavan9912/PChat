import { Response } from 'express';
import { FriendRequest } from '../models/FriendRequest';
import { User } from '../models/User';
import { Notification } from '../models/Notification';
import { AuthRequest } from '../middleware/auth.middleware';

// @desc    Send Friend Request
// @route   POST /api/friends/request
// @access  Private
export const sendFriendRequest = async (req: AuthRequest, res: Response) => {
  const { recipientId } = req.body;
  if (!req.user) return res.status(401).json({ message: 'Not authenticated' });

  if (req.user._id.toString() === recipientId) {
    return res.status(400).json({ message: 'You cannot send a friend request to yourself' });
  }

  try {
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ message: 'Recipient user not found' });
    }

    // Check if user is blocked
    if (recipient.blockedUsers.includes(req.user._id as any) || req.user.blockedUsers.includes(recipientId)) {
      return res.status(403).json({ message: 'Action not allowed' });
    }

    // Check if existing request exists
    const existingRequest = await FriendRequest.findOne({
      $or: [
        { sender: req.user._id, recipient: recipientId },
        { sender: recipientId, recipient: req.user._id },
      ],
    });

    if (existingRequest) {
      if (existingRequest.status === 'accepted') {
        return res.status(400).json({ message: 'You are already friends with this user' });
      }
      if (existingRequest.status === 'pending') {
        return res.status(400).json({ message: 'Friend request is already pending' });
      }
      // If rejected, let's reopen it
      existingRequest.status = 'pending';
      existingRequest.sender = req.user._id as any;
      existingRequest.recipient = recipientId;
      await existingRequest.save();
      
      // Create notification
      await Notification.create({
        recipient: recipientId,
        sender: req.user._id,
        type: 'friend_request',
        content: `${req.user.name} sent you a friend request.`,
      });

      return res.status(200).json({ message: 'Friend request sent', request: existingRequest });
    }

    const request = await FriendRequest.create({
      sender: req.user._id,
      recipient: recipientId,
      status: 'pending',
    });

    // Create notification
    await Notification.create({
      recipient: recipientId,
      sender: req.user._id,
      type: 'friend_request',
      content: `${req.user.name} sent you a friend request.`,
    });

    return res.status(201).json({ message: 'Friend request sent', request });
  } catch (error) {
    console.error('Send friend request error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Accept Friend Request
// @route   POST /api/friends/accept
// @access  Private
export const acceptFriendRequest = async (req: AuthRequest, res: Response) => {
  const { requestId } = req.body;
  if (!req.user) return res.status(401).json({ message: 'Not authenticated' });

  try {
    const request = await FriendRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Friend request not found' });
    }

    if (request.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You are not authorized to accept this request' });
    }

    request.status = 'accepted';
    await request.save();

    // Notify sender
    await Notification.create({
      recipient: request.sender,
      sender: req.user._id,
      type: 'friend_accept',
      content: `${req.user.name} accepted your friend request.`,
    });

    return res.status(200).json({ message: 'Friend request accepted', request });
  } catch (error) {
    console.error('Accept friend request error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Reject Friend Request
// @route   POST /api/friends/reject
// @access  Private
export const rejectFriendRequest = async (req: AuthRequest, res: Response) => {
  const { requestId } = req.body;
  if (!req.user) return res.status(401).json({ message: 'Not authenticated' });

  try {
    const request = await FriendRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Friend request not found' });
    }

    if (request.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You are not authorized to reject this request' });
    }

    request.status = 'rejected';
    await request.save();

    return res.status(200).json({ message: 'Friend request rejected', request });
  } catch (error) {
    console.error('Reject friend request error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Get Friends List
// @route   GET /api/friends
// @access  Private
export const getFriends = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Not authenticated' });

  try {
    const friendships = await FriendRequest.find({
      $or: [{ sender: req.user._id }, { recipient: req.user._id }],
      status: 'accepted',
    }).populate('sender recipient', 'name username email avatar bio statusMessage isOnline lastSeen');

    const friends = friendships.map((f) => {
      const isSender = (f.sender as any)._id.toString() === req.user!._id.toString();
      return isSender ? f.recipient : f.sender;
    });

    return res.status(200).json(friends);
  } catch (error) {
    console.error('Get friends error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Get Pending Friend Requests
// @route   GET /api/friends/requests
// @access  Private
export const getFriendRequests = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Not authenticated' });

  try {
    const requests = await FriendRequest.find({
      recipient: req.user._id,
      status: 'pending',
    }).populate('sender', 'name username email avatar bio');

    return res.status(200).json(requests);
  } catch (error) {
    console.error('Get friend requests error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Remove Friend
// @route   DELETE /api/friends/:friendId
// @access  Private
export const removeFriend = async (req: AuthRequest, res: Response) => {
  const { friendId } = req.params;
  if (!req.user) return res.status(401).json({ message: 'Not authenticated' });

  try {
    await FriendRequest.findOneAndDelete({
      $or: [
        { sender: req.user._id, recipient: friendId },
        { sender: friendId, recipient: req.user._id },
      ],
      status: 'accepted',
    });

    return res.status(200).json({ message: 'Friend removed successfully' });
  } catch (error) {
    console.error('Remove friend error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Block User
// @route   POST /api/friends/block
// @access  Private
export const blockUser = async (req: AuthRequest, res: Response) => {
  const { targetUserId } = req.body;
  if (!req.user) return res.status(401).json({ message: 'Not authenticated' });

  try {
    // Add to blockedUsers
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.blockedUsers.includes(targetUserId)) {
      return res.status(400).json({ message: 'User is already blocked' });
    }

    user.blockedUsers.push(targetUserId);
    await user.save();

    // Remove any friendship
    await FriendRequest.findOneAndDelete({
      $or: [
        { sender: req.user._id, recipient: targetUserId },
        { sender: targetUserId, recipient: req.user._id },
      ],
    });

    // Broadcast block event via Socket.IO
    const io = req.app.get('socketio');
    if (io) {
      io.to(req.user._id.toString()).emit('userBlocked', { blockerId: req.user._id.toString(), blockedId: targetUserId });
      io.to(targetUserId.toString()).emit('userBlocked', { blockerId: req.user._id.toString(), blockedId: targetUserId });
    }

    return res.status(200).json({ message: 'User blocked successfully', blockedUsers: user.blockedUsers });
  } catch (error) {
    console.error('Block user error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Unblock User
// @route   POST /api/friends/unblock
// @access  Private
export const unblockUser = async (req: AuthRequest, res: Response) => {
  const { targetUserId } = req.body;
  if (!req.user) return res.status(401).json({ message: 'Not authenticated' });

  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.blockedUsers = user.blockedUsers.filter((id) => id.toString() !== targetUserId);
    await user.save();

    // Broadcast unblock event via Socket.IO
    const io = req.app.get('socketio');
    if (io) {
      io.to(req.user._id.toString()).emit('userUnblocked', { blockerId: req.user._id.toString(), unblockedId: targetUserId });
      io.to(targetUserId.toString()).emit('userUnblocked', { blockerId: req.user._id.toString(), unblockedId: targetUserId });
    }

    return res.status(200).json({ message: 'User unblocked successfully', blockedUsers: user.blockedUsers });
  } catch (error) {
    console.error('Unblock user error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};
