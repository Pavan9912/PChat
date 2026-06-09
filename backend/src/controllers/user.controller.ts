import { Response } from 'express';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { AuthRequest } from '../middleware/auth.middleware';
import { uploadToCloudinary } from '../config/cloudinary';

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
export const getUserProfile = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const userObj = user.toObject();
    const hasChatLockPin = !!userObj.chatLockPin;
    delete userObj.chatLockPin;

    return res.status(200).json({
      ...userObj,
      hasChatLockPin,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
export const updateUserProfile = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  const { name, username, bio, statusMessage } = req.body;

  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (username && username !== user.username) {
      const usernameExists = await User.findOne({ username: username.toLowerCase().trim() });
      if (usernameExists) {
        return res.status(400).json({ message: 'Username is already taken' });
      }
      user.username = username.toLowerCase().trim();
    }

    if (name) user.name = name.trim();
    if (bio !== undefined) user.bio = bio.trim();
    if (statusMessage !== undefined) user.statusMessage = statusMessage.trim();

    const updatedUser = await user.save();
    return res.status(200).json({
      _id: updatedUser._id,
      name: updatedUser.name,
      username: updatedUser.username,
      email: updatedUser.email,
      avatar: updatedUser.avatar,
      bio: updatedUser.bio,
      statusMessage: updatedUser.statusMessage,
      role: updatedUser.role,
      isVerified: updatedUser.isVerified,
      hasChatLockPin: !!updatedUser.chatLockPin,
      blockedUsers: updatedUser.blockedUsers || [],
      isOnline: updatedUser.isOnline,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Update avatar (Supports Cloudinary and Local directory fallbacks)
// @route   POST /api/users/avatar
// @access  Private
export const updateUserAvatar = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  if (!req.file) {
    return res.status(400).json({ message: 'Please upload an image file' });
  }

  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const localFilePath = req.file.path;
    
    // Attempt uploading to Cloudinary
    const cloudinaryResult = await uploadToCloudinary(localFilePath, 'pchat_avatars');
    
    let avatarUrl = '';
    if (cloudinaryResult) {
      avatarUrl = cloudinaryResult.url;
    } else {
      // Local serving fallback: serve via uploads route on localhost
      const port = process.env.PORT || 5000;
      // In production or local, relative url is better or fully qualified
      avatarUrl = `/uploads/${req.file.filename}`;
    }

    user.avatar = avatarUrl;
    await user.save();

    return res.status(200).json({
      message: 'Avatar updated successfully',
      avatar: avatarUrl,
    });
  } catch (error) {
    console.error('Upload avatar error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Search for users
// @route   GET /api/users/search
// @access  Private
export const searchUsers = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  const query = req.query.q ? String(req.query.q).trim() : '';
  if (!query) {
    return res.status(200).json([]);
  }

  // Escape special regular expression characters to prevent catastrophic backtracking (ReDoS)
  const escapedQuery = query.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');

  try {
    // Exclude current user and anyone who has blocked the user or is blocked by the user
    const user = await User.findById(req.user._id);
    const exclusions = [req.user._id, ...(user?.blockedUsers || [])];

    const users = await User.find({
      _id: { $nin: exclusions },
      isBanned: false,
      $or: [
        { name: { $regex: escapedQuery, $options: 'i' } },
        { username: { $regex: escapedQuery, $options: 'i' } },
        { email: { $regex: escapedQuery, $options: 'i' } },
      ],
    })
      .select('name username email avatar bio statusMessage isOnline lastSeen')
      .limit(20);

    return res.status(200).json(users);
  } catch (error) {
    console.error('Search users error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Delete User Account
// @route   DELETE /api/users/account
// @access  Private
export const deleteUserAccount = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    // Delete account
    await User.findByIdAndDelete(req.user._id);
    res.clearCookie('token');
    return res.status(200).json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Set/Update Chat Lock PIN
// @route   POST /api/users/chat-lock/pin
// @access  Private
export const setChatLockPin = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  const { pin } = req.body;
  if (!pin || typeof pin !== 'string' || !/^\d{4}$/.test(pin)) {
    return res.status(400).json({ message: 'PIN must be a 4-digit number' });
  }

  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const salt = await bcrypt.genSalt(10);
    user.chatLockPin = await bcrypt.hash(pin, salt);
    await user.save();

    return res.status(200).json({ message: 'Chat lock PIN set successfully' });
  } catch (error) {
    console.error('Set chat lock PIN error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Verify Chat Lock PIN
// @route   POST /api/users/chat-lock/verify
// @access  Private
export const verifyChatLockPin = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  const { pin } = req.body;
  if (!pin || typeof pin !== 'string') {
    return res.status(400).json({ message: 'PIN is required' });
  }

  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.chatLockPin) {
      return res.status(400).json({ message: 'No chat lock PIN is configured' });
    }

    const isMatch = await user.compareChatLockPin(pin);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid PIN' });
    }

    return res.status(200).json({ success: true, message: 'PIN verified successfully' });
  } catch (error) {
    console.error('Verify chat lock PIN error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Remove Chat Lock PIN
// @route   DELETE /api/users/chat-lock/pin
// @access  Private
export const removeChatLockPin = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  const { pin } = req.body;
  if (!pin || typeof pin !== 'string') {
    return res.status(400).json({ message: 'PIN is required to disable chat lock' });
  }

  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.chatLockPin) {
      return res.status(400).json({ message: 'No chat lock PIN is configured' });
    }

    const isMatch = await user.compareChatLockPin(pin);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid PIN' });
    }

    user.chatLockPin = undefined;
    await user.save();

    return res.status(200).json({ message: 'Chat lock PIN removed successfully' });
  } catch (error) {
    console.error('Remove chat lock PIN error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Get all online users
// @route   GET /api/users/online
// @access  Private
export const getOnlineUsers = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    // Exclude current user and anyone blocked or who blocked the user
    const user = await User.findById(req.user._id);
    const exclusions = [req.user._id, ...(user?.blockedUsers || [])];

    const onlineCount = await User.countDocuments({
      _id: { $nin: exclusions },
      isOnline: true,
      isBanned: false,
    });

    const users = await User.find({
      _id: { $nin: exclusions },
      isBanned: false,
    })
      .select('name username email avatar bio statusMessage isOnline lastSeen')
      .sort({ isOnline: -1, lastSeen: -1 })
      .limit(50);

    return res.status(200).json({
      onlineCount,
      users,
    });
  } catch (error) {
    console.error('Get online users error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

