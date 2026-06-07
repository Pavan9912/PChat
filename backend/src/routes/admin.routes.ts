import { Router } from 'express';
import {
  getAnalytics,
  getAllUsers,
  toggleBanUser,
  deleteUserAdmin,
  createReport,
  getReports,
  resolveReport,
  deleteReportedContent,
} from '../controllers/admin.controller';
import { protect, admin } from '../middleware/auth.middleware';

const router = Router();

// Submit report is public to all authenticated users
router.post('/reports', protect, createReport);

// All other routes require Admin status
router.get('/analytics', protect, admin, getAnalytics);
router.get('/users', protect, admin, getAllUsers);
router.put('/users/:userId/ban', protect, admin, toggleBanUser);
router.delete('/users/:userId', protect, admin, deleteUserAdmin);
router.get('/reports', protect, admin, getReports);
router.put('/reports/:reportId/resolve', protect, admin, resolveReport);
router.delete('/reports/:reportId/content', protect, admin, deleteReportedContent);

export default router;
