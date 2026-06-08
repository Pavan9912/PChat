import { Request, Response } from 'express';
import crypto from 'crypto';
import { User } from '../models/User';
import { generateToken } from '../utils/generateToken';
import { AuthRequest } from '../middleware/auth.middleware';

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req: Request, res: Response) => {
  const { name, username, email, password } = req.body;

  try {
    const userExists = await User.findOne({ $or: [{ email }, { username }] });
    if (userExists) {
      return res.status(400).json({ message: 'User with this email or username already exists' });
    }

    const user = await User.create({
      name,
      username,
      email,
      password,
    });

    if (user) {
      const token = generateToken(res, user._id.toString());
      return res.status(201).json({
        _id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        role: user.role,
        isVerified: user.isVerified,
        hasChatLockPin: !!user.chatLockPin,
        blockedUsers: user.blockedUsers || [],
        token,
      });
    } else {
      return res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error: any) {
    console.error('Register error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (user.isBanned) {
      return res.status(403).json({ message: 'This account has been banned by the administrator' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = generateToken(res, user._id.toString());
    return res.status(200).json({
      _id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      bio: user.bio,
      role: user.role,
      isVerified: user.isVerified,
      hasChatLockPin: !!user.chatLockPin,
      blockedUsers: user.blockedUsers || [],
      token,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Social Login (Google/Facebook)
// @route   POST /api/auth/social-login
// @access  Public
export const socialLogin = async (req: Request, res: Response) => {
  const { name, email, avatar, googleId, facebookId } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required from social provider' });
  }

  try {
    let user = await User.findOne({ email });

    if (user) {
      // If user exists, update social ID if not already present
      if (googleId && !user.googleId) user.googleId = googleId;
      if (facebookId && !user.facebookId) user.facebookId = facebookId;
      if (avatar && !user.avatar) user.avatar = avatar;
      await user.save();
    } else {
      // Create user with randomized username and empty password
      const tempUsername = email.split('@')[0] + Math.floor(Math.random() * 10000);
      user = await User.create({
        name,
        username: tempUsername,
        email,
        avatar: avatar || '',
        googleId,
        facebookId,
        isVerified: true, // Social accounts are trusted
      });
    }

    if (user.isBanned) {
      return res.status(403).json({ message: 'This account has been banned' });
    }

    const token = generateToken(res, user._id.toString());
    return res.status(200).json({
      _id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      bio: user.bio,
      role: user.role,
      isVerified: user.isVerified,
      hasChatLockPin: !!user.chatLockPin,
      blockedUsers: user.blockedUsers || [],
      token,
    });
  } catch (error: any) {
    console.error('Social Login error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Logout user & clear cookie
// @route   POST /api/auth/logout
// @access  Private
export const logoutUser = async (req: Request, res: Response) => {
  res.cookie('token', '', {
    httpOnly: true,
    expires: new Date(0),
  });
  return res.status(200).json({ message: 'Logged out successfully' });
};

// @desc    Forgot Password - generates recovery link/code
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'No account with that email address exists' });
    }

    // Create random reset token
    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour expiration
    await user.save();

    // Log token to console for easy developer local verification (simulating emails)
    console.log(`[PChat Security] Password Reset Request for ${email}`);
    console.log(`[Token Code] ${resetToken}`);
    console.log(`[Reset Link] http://localhost:5173/reset-password/${resetToken}`);

    return res.status(200).json({
      message: 'Password reset instructions have been logged to the server console. Use code to reset.',
      resetToken, // Return reset token so client can auto-fill or simulate emails directly
    });
  } catch (error: any) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Reset Password
// @route   POST /api/auth/reset-password/:token
// @access  Public
export const resetPassword = async (req: Request, res: Response) => {
  const { token } = req.params;
  const { password } = req.body;

  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Password reset token is invalid or has expired' });
    }

    user.password = password; // pre-save hook hashes password
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return res.status(200).json({ message: 'Password has been reset successfully. You can now login.' });
  } catch (error: any) {
    console.error('Reset password error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Change Password
// @route   PUT /api/auth/change-password
// @access  Private
export const changePassword = async (req: AuthRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;

  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect current password' });
    }

    user.password = newPassword;
    await user.save();

    return res.status(200).json({ message: 'Password changed successfully' });
  } catch (error: any) {
    console.error('Change password error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Mock verify email
// @route   POST /api/auth/verify-email
// @access  Public
export const verifyEmail = async (req: Request, res: Response) => {
  const { token } = req.body;
  try {
    const user = await User.findOne({ verificationToken: token });
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired verification token' });
    }
    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();
    return res.status(200).json({ message: 'Email verified successfully!' });
  } catch (error: any) {
    console.error('Verify email error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};
