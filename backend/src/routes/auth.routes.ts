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
  sendRegisterOtp,
  sendOtpGeneric,
  verifyOtpGeneric,
  sendLoginOtp,
  loginWithOtp,
} from '../controllers/auth.controller';
import {
  validateRegister,
  validateLogin,
  validatePasswordChange,
  validateFields,
  validateRegisterOtp,
  validateSendOtp,
  validateVerifyOtp,
} from '../utils/validators';
import { protect } from '../middleware/auth.middleware';
import { authLimiter } from '../middleware/rateLimiter.middleware';

const router = Router();

router.post('/register-otp', authLimiter, validateRegisterOtp, validateFields, sendRegisterOtp);
router.post('/send-otp', authLimiter, validateSendOtp, validateFields, sendOtpGeneric);
router.post('/verify-otp', authLimiter, validateVerifyOtp, validateFields, verifyOtpGeneric);
router.post('/register', authLimiter, validateRegister, validateFields, registerUser);
router.post('/login', authLimiter, validateLogin, validateFields, loginUser);
router.post('/login-otp', authLimiter, validateSendOtp, validateFields, sendLoginOtp);
router.post('/login-otp-verify', authLimiter, validateVerifyOtp, validateFields, loginWithOtp);
router.post('/social-login', socialLogin);
router.post('/google-login', googleLogin);
router.post('/logout', protect, logoutUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.put('/change-password', protect, validatePasswordChange, validateFields, changePassword);
router.post('/verify-email', verifyEmail);

export default router;
