import { Router } from 'express';
import {
  getUserProfile,
  updateUserProfile,
  updateUserAvatar,
  searchUsers,
  deleteUserAccount,
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

export default router;
