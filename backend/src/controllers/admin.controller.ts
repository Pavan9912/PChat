import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { Message, getUserMessageModel } from '../models/Message';
import { Chat } from '../models/Chat';
import { Report } from '../models/Report';
import { FriendRequest } from '../models/FriendRequest';
import { Notification } from '../models/Notification';
import { Otp } from '../models/Otp';
import { Status } from '../models/Status';
import { AuthRequest } from '../middleware/auth.middleware';

const getUniqueMessagesCount = async (timeFilter?: Date): Promise<number> => {
  try {
    const db = mongoose.connection.db;
    if (!db) return 0;
    const collections = await db.listCollections().toArray();
    const msgCollections = collections.filter(c => c.name.startsWith('messages_user_'));
    const uniqueIds = new Set<string>();

    const promises = msgCollections.map(async (col) => {
      try {
        const partUserId = col.name.replace('messages_user_', '');
        const modelInstance = getUserMessageModel(partUserId);
        const query = timeFilter ? { createdAt: { $gte: timeFilter } } : {};
        const msgs = await modelInstance.find(query, { _id: 1 });
        return msgs.map(m => m._id.toString());
      } catch (err) {
        console.error(`Error querying collection ${col.name}:`, err);
        return [];
      }
    });

    const results = await Promise.all(promises);
    for (const ids of results) {
      for (const id of ids) {
        uniqueIds.add(id);
      }
    }
    return uniqueIds.size;
  } catch (error) {
    console.error('Error counting unique messages:', error);
    return 0;
  }
};

// @desc    Get Admin Analytics Overview
// @route   GET /api/admin/analytics
// @access  Private/Admin
export const getAnalytics = async (req: Request, res: Response) => {
  try {
    const totalUsers = await User.countDocuments();
    const onlineUsers = await User.countDocuments({ isOnline: true });
    const totalMessages = await getUniqueMessagesCount();
    const totalGroups = await Chat.countDocuments({ isGroupChat: true });
    const pendingReports = await Report.countDocuments({ status: 'pending' });

    // Activity stats: users registered in the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const newUsersLastWeek = await User.countDocuments({ createdAt: { $gte: sevenDaysAgo } });
    const newMessagesLastWeek = await getUniqueMessagesCount(sevenDaysAgo);

    return res.status(200).json({
      totalUsers,
      onlineUsers,
      totalMessages,
      totalGroups,
      pendingReports,
      newUsersLastWeek,
      newMessagesLastWeek,
    });
  } catch (error: any) {
    console.error('Get analytics error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Get all users list (paginated)
// @route   GET /api/admin/users
// @access  Private/Admin
export const getAllUsers = async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  try {
    const skip = (page - 1) * limit;
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalUsers = await User.countDocuments();

    return res.status(200).json({
      users,
      currentPage: page,
      totalPages: Math.ceil(totalUsers / limit),
      totalUsers,
    });
  } catch (error: any) {
    console.error('Get all users error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Ban or Unban a user
// @route   PUT /api/admin/users/:userId/ban
// @access  Private/Admin
export const toggleBanUser = async (req: Request, res: Response) => {
  const { userId } = req.params;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(400).json({ message: 'You cannot ban another administrator account' });
    }

    user.isBanned = !user.isBanned;
    await user.save();

    return res.status(200).json({
      message: `User ${user.isBanned ? 'banned' : 'unbanned'} successfully`,
      user,
    });
  } catch (error: any) {
    console.error('Toggle ban error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Delete user account (Admin override)
// @route   DELETE /api/admin/users/:userId
// @access  Private/Admin
export const deleteUserAdmin = async (req: Request, res: Response) => {
  const { userId } = req.params;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(400).json({ message: 'You cannot delete another administrator account' });
    }

    await User.findByIdAndDelete(userId);
    return res.status(200).json({ message: 'User deleted successfully' });
  } catch (error: any) {
    console.error('Delete user admin error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Create content abuse Report
// @route   POST /api/admin/reports
// @access  Private
export const createReport = async (req: any, res: Response) => {
  const { type, reportedUserId, reportedGroupId, reportedMessageId, reason } = req.body;
  if (!reason) return res.status(400).json({ message: 'Reason is required' });

  try {
    const reportData: any = {
      reporter: req.user._id,
      type,
      reportedUser: reportedUserId || undefined,
      reportedGroup: reportedGroupId || undefined,
      reportedMessage: reportedMessageId || undefined,
      reason,
      status: 'pending',
    };

    if (type === 'message' && reportedMessageId) {
      reportData.reportedMessageModelName = `messages_user_${req.user._id}`;
    }

    const report = await Report.create(reportData);

    return res.status(201).json({ message: 'Report submitted successfully', report });
  } catch (error: any) {
    console.error('Create report error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Get all reports (Moderator Panel)
// @route   GET /api/admin/reports
// @access  Private/Admin
export const getReports = async (req: Request, res: Response) => {
  try {
    // Ensure all dynamic user message models are registered before populating
    const reportModels = await Report.distinct('reportedMessageModelName');
    for (const modelName of reportModels) {
      if (modelName && modelName.startsWith('messages_user_')) {
        const userId = modelName.replace('messages_user_', '');
        getUserMessageModel(userId);
      }
    }

    const reports = await Report.find()
      .populate('reporter', 'name username')
      .populate('reportedUser', 'name username avatar isBanned')
      .populate('reportedGroup', 'name avatar description')
      .populate({
        path: 'reportedMessage',
        populate: { path: 'sender', select: 'name username' },
      })
      .sort({ createdAt: -1 });

    return res.status(200).json(reports);
  } catch (error: any) {
    console.error('Get reports error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Resolve reported item
// @route   PUT /api/admin/reports/:reportId/resolve
// @access  Private/Admin
export const resolveReport = async (req: Request, res: Response) => {
  const { reportId } = req.params;

  try {
    const report = await Report.findById(reportId);
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    report.status = 'resolved';
    await report.save();

    return res.status(200).json({ message: 'Report marked as resolved', report });
  } catch (error: any) {
    console.error('Resolve report error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Delete reported content (Admin override)
// @route   DELETE /api/admin/reports/:reportId/content
// @access  Private/Admin
export const deleteReportedContent = async (req: Request, res: Response) => {
  const { reportId } = req.params;

  try {
    const report = await Report.findById(reportId);
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    if (report.type === 'message' && report.reportedMessage && report.reportedMessageModelName) {
      // Find the message in the reported collection (e.g. messages_user_reporterId)
      const reporterUserId = report.reportedMessageModelName.replace('messages_user_', '');
      const userModel = getUserMessageModel(reporterUserId);
      const message = await userModel.findById(report.reportedMessage);
      if (message) {
        // Find the chat to get all participants
        const chat = await Chat.findById(message.chat);
        if (chat) {
          // Delete/mark deleted in all participants' collections
          for (const participantId of chat.participants) {
            const partModel = getUserMessageModel(participantId.toString());
            await partModel.findByIdAndUpdate(message._id, {
              deletedEveryone: true,
              content: 'This message was deleted by administration moderators',
              mediaUrl: undefined,
              mediaPublicId: undefined,
              fileName: undefined,
              fileSize: undefined,
            });
          }
        }
      }
    } else if (report.type === 'group' && report.reportedGroup) {
      // Delete the group
      await Chat.findByIdAndDelete(report.reportedGroup);
      // Delete messages of this group from all users' collections
      const db = mongoose.connection.db;
      if (db) {
        const collections = await db.listCollections().toArray();
        const msgCollections = collections.filter(c => c.name.startsWith('messages_user_'));
        for (const col of msgCollections) {
          const partUserId = col.name.replace('messages_user_', '');
          const partModel = getUserMessageModel(partUserId);
          await partModel.deleteMany({ chat: report.reportedGroup });
        }
      }
    }

    report.status = 'resolved';
    await report.save();

    return res.status(200).json({ message: 'Reported content removed and report resolved successfully' });
  } catch (error: any) {
    console.error('Delete reported content error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Get Database Storage Statistics
// @route   GET /api/admin/database/stats
// @access  Private/Admin
export const getDatabaseStats = async (req: AuthRequest, res: Response) => {
  try {
    const db = mongoose.connection.db;
    if (!db) {
      return res.status(500).json({ message: 'Database connection not ready' });
    }

    const stats = await db.stats();
    
    // Atlas free tier limit is 512MB = 536870912 bytes
    const totalStorageLimit = 512 * 1024 * 1024;
    const storageSize = stats.storageSize || 0;
    const freeSpace = Math.max(0, totalStorageLimit - storageSize);

    return res.status(200).json({
      dbName: stats.db,
      collectionsCount: stats.collections,
      documentsCount: stats.objects,
      avgObjSize: stats.avgObjSize || 0,
      dataSize: stats.dataSize || 0, // uncompressed data size
      storageSize: storageSize, // compressed/allocated size on disk
      indexSize: stats.indexSize || 0,
      totalSize: stats.totalSize || (storageSize + (stats.indexSize || 0)),
      totalStorageLimit,
      freeSpace,
    });
  } catch (error: any) {
    console.error('Get database stats error:', error);
    // Return fallback counts if stats command is not allowed on this DB server
    try {
      const db = mongoose.connection.db;
      const collections = await db?.listCollections().toArray() || [];
      const totalUsers = await User.countDocuments();
      const totalChats = await Chat.countDocuments();
      const totalReports = await Report.countDocuments();
      
      return res.status(200).json({
        dbName: mongoose.connection.name,
        collectionsCount: collections.length,
        documentsCount: totalUsers + totalChats + totalReports,
        avgObjSize: 0,
        dataSize: 0,
        storageSize: 0,
        indexSize: 0,
        totalSize: 0,
        totalStorageLimit: 512 * 1024 * 1024,
        freeSpace: 512 * 1024 * 1024,
        isFallback: true,
      });
    } catch (fallbackError) {
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  }
};

// @desc    Clear All Database Data completely (Except current admin)
// @route   DELETE /api/admin/database/clear
// @access  Private/Admin
export const clearDatabaseData = async (req: AuthRequest, res: Response) => {
  try {
    const db = mongoose.connection.db;
    if (!db) {
      return res.status(500).json({ message: 'Database connection not ready' });
    }

    const currentAdminId = req.user?._id;
    if (!currentAdminId) {
      return res.status(401).json({ message: 'Admin session user not found' });
    }

    // 1. Delete all dynamic message collections (messages_user_*)
    const collections = await db.listCollections().toArray();
    const msgCollections = collections.filter(c => c.name.startsWith('messages_user_'));
    for (const col of msgCollections) {
      await db.dropCollection(col.name);
    }

    // 2. Clear other data collections (keep the current admin user)
    await Chat.deleteMany({});
    await FriendRequest.deleteMany({});
    await Notification.deleteMany({});
    await Otp.deleteMany({});
    await Report.deleteMany({});
    await Status.deleteMany({});
    
    // Delete all users except the current admin
    await User.deleteMany({ _id: { $ne: currentAdminId } });

    return res.status(200).json({ 
      success: true, 
      message: 'All database data (messages, chats, users, notifications, reports, statuses) cleared successfully. Current admin account preserved.' 
    });
  } catch (error: any) {
    console.error('Clear database data error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

