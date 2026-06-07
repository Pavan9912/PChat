import { Router } from 'express';
import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriends,
  getFriendRequests,
  removeFriend,
  blockUser,
  unblockUser,
} from '../controllers/friend.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.use(protect); // All friend routes require JWT login

router.get('/', getFriends);
router.get('/requests', getFriendRequests);
router.post('/request', sendFriendRequest);
router.post('/accept', acceptFriendRequest);
router.post('/reject', rejectFriendRequest);
router.delete('/:friendId', removeFriend);
router.post('/block', blockUser);
router.post('/unblock', unblockUser);

export default router;
