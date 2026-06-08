import { Router } from 'express';
import {
  registerUser,
  loginUser,
  socialLogin,
  logoutUser,
  forgotPassword,
  resetPassword,
  changePassword,
  verifyEmail,
  googleLogin,
} from '../controllers/auth.controller';
import {
  validateRegister,
  validateLogin,
  validatePasswordChange,
  validateFields,
} from '../utils/validators';
import { protect } from '../middleware/auth.middleware';
import { authLimiter } from '../middleware/rateLimiter.middleware';

const router = Router();

router.post('/register', authLimiter, validateRegister, validateFields, registerUser);
router.post('/login', authLimiter, validateLogin, validateFields, loginUser);
router.post('/social-login', socialLogin);
router.post('/google-login', googleLogin);
router.post('/logout', protect, logoutUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.put('/change-password', protect, validatePasswordChange, validateFields, changePassword);
router.post('/verify-email', verifyEmail);

export default router;
