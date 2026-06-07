import { Request, Response } from 'express';
import { User } from '../models/User';
import { Message } from '../models/Message';
import { Chat } from '../models/Chat';
import { Report } from '../models/Report';

// @desc    Get Admin Analytics Overview
// @route   GET /api/admin/analytics
// @access  Private/Admin
export const getAnalytics = async (req: Request, res: Response) => {
  try {
    const totalUsers = await User.countDocuments();
    const onlineUsers = await User.countDocuments({ isOnline: true });
    const totalMessages = await Message.countDocuments();
    const totalGroups = await Chat.countDocuments({ isGroupChat: true });
    const pendingReports = await Report.countDocuments({ status: 'pending' });

    // Activity stats: users registered in the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const newUsersLastWeek = await User.countDocuments({ createdAt: { $gte: sevenDaysAgo } });
    const newMessagesLastWeek = await Message.countDocuments({ createdAt: { $gte: sevenDaysAgo } });

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
    const report = await Report.create({
      reporter: req.user._id,
      type,
      reportedUser: reportedUserId || undefined,
      reportedGroup: reportedGroupId || undefined,
      reportedMessage: reportedMessageId || undefined,
      reason,
      status: 'pending',
    });

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

    if (report.type === 'message' && report.reportedMessage) {
      // Delete the message
      const message = await Message.findById(report.reportedMessage);
      if (message) {
        message.deletedEveryone = true;
        message.content = 'This message was deleted by administration moderators';
        message.mediaUrl = undefined;
        message.fileName = undefined;
        message.fileSize = undefined;
        await message.save();
      }
    } else if (report.type === 'group' && report.reportedGroup) {
      // Delete the group
      await Chat.findByIdAndDelete(report.reportedGroup);
      await Message.deleteMany({ chat: report.reportedGroup });
    }

    report.status = 'resolved';
    await report.save();

    return res.status(200).json({ message: 'Reported content removed and report resolved successfully' });
  } catch (error: any) {
    console.error('Delete reported content error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};
