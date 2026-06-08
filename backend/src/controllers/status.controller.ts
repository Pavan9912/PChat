import { Response } from 'express';
import { Status } from '../models/Status';
import { FriendRequest } from '../models/FriendRequest';
import { uploadToCloudinary } from '../config/cloudinary';
import { AuthRequest } from '../middleware/auth.middleware';
import fs from 'fs';

// @desc    Create new Status update (Stories)
// @route   POST /api/status
// @access  Private
export const createStatus = async (req: AuthRequest, res: Response) => {
  const { content, backgroundColor } = req.body;
  if (!req.user) return res.status(401).json({ message: 'Not authenticated' });

  try {
    let mediaUrl: string | undefined = undefined;
    let type: 'text' | 'image' | 'video' = 'text';

    if (req.file) {
      // Determine media type
      if (req.file.mimetype.startsWith('video')) {
        type = 'video';
      } else {
        type = 'image';
      }

      // Try uploading to Cloudinary
      const cloudinaryResult = await uploadToCloudinary(req.file.path, 'pchat_statuses');
      if (cloudinaryResult) {
        mediaUrl = cloudinaryResult.url;
        // Clean up temporary local upload file
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkErr) {
          console.warn('Failed to delete temporary local file:', unlinkErr);
        }
      } else {
        // Fallback to serving locally
        mediaUrl = `/uploads/${req.file.filename}`;
      }
    }

    const newStatus = await Status.create({
      user: req.user._id,
      type,
      content: content || undefined,
      backgroundColor: type === 'text' ? backgroundColor || '#1e293b' : undefined,
      mediaUrl,
      views: [],
    });

    // Populate user info
    await newStatus.populate('user', 'name username avatar');

    return res.status(201).json(newStatus);
  } catch (error: any) {
    console.error('Create status error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Get active Status updates (Self + Friends)
// @route   GET /api/status
// @access  Private
export const getStatuses = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Not authenticated' });

  try {
    // 1. Fetch user's friends list
    const friendships = await FriendRequest.find({
      $or: [{ sender: req.user._id }, { recipient: req.user._id }],
      status: 'accepted',
    });

    const friendIds = friendships.map((f) => {
      const isSender = f.sender.toString() === req.user!._id.toString();
      return isSender ? f.recipient : f.sender;
    });

    // We can view our own and friends' statuses
    const allowedUserIds = [...friendIds, req.user._id];

    // 2. Query active, non-expired statuses
    const statuses = await Status.find({
      user: { $in: allowedUserIds },
      expiresAt: { $gt: new Date() },
    })
      .populate('user', 'name username avatar')
      .sort({ createdAt: 1 }); // oldest to newest for playing sequence

    return res.status(200).json(statuses);
  } catch (error: any) {
    console.error('Get active statuses error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Mark Status as viewed
// @route   PUT /api/status/:statusId/view
// @access  Private
export const viewStatus = async (req: AuthRequest, res: Response) => {
  const { statusId } = req.params;
  if (!req.user) return res.status(401).json({ message: 'Not authenticated' });

  try {
    const status = await Status.findById(statusId);
    if (!status) {
      return res.status(404).json({ message: 'Status update not found' });
    }

    // Add user to views if not already present
    if (!status.views.includes(req.user._id as any)) {
      status.views.push(req.user._id as any);
      await status.save();
    }

    // Populate user
    await status.populate('user', 'name username avatar');

    return res.status(200).json(status);
  } catch (error: any) {
    console.error('View status error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};
