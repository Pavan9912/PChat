import { Router } from 'express';
import {
  getUserProfile,
  updateUserProfile,
  updateUserAvatar,
  searchUsers,
  deleteUserAccount,
  setChatLockPin,
  verifyChatLockPin,
  removeChatLockPin,
} from '../controllers/user.controller';
import { protect } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';

const router = Router();

router.use(protect); // All routes below are authenticated

router.get('/profile', getUserProfile);
router.put('/profile', updateUserProfile);
router.post('/avatar', upload.single('avatar'), updateUserAvatar);
router.get('/search', searchUsers);
router.delete('/account', deleteUserAccount);

router.post('/chat-lock/pin', setChatLockPin);
router.post('/chat-lock/verify', verifyChatLockPin);
router.delete('/chat-lock/pin', removeChatLockPin);

export default router;
