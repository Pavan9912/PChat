import { Request, Response } from 'express';
import crypto from 'crypto';
import { User } from '../models/User';
import { Otp } from '../models/Otp';
import { generateToken } from '../utils/generateToken';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendEmail } from '../utils/sendEmail';
import { OAuth2Client } from 'google-auth-library';

// @desc    Send OTP code to email for user registration
// @route   POST /api/auth/register-otp
// @access  Public
export const sendRegisterOtp = async (req: Request, res: Response) => {
  const { email } = req.body;

  try {
    const emailLower = email.toLowerCase().trim();

    // Check if user already exists
    const userExists = await User.findOne({ email: emailLower });
    if (userExists) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Generate a 6-digit random code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes in the future

    // Upsert the OTP in database
    await Otp.findOneAndUpdate(
      { email: emailLower },
      { otp, expiresAt },
      { upsert: true, new: true }
    );

    // Send OTP email asynchronously in the background
    sendEmail({
      to: emailLower,
      subject: 'PChatNow - Verify Your Email Address',
      text: `Your email verification code is ${otp}. This code will expire in 10 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 25px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
          <h2 style="color: #10b981; text-align: center; margin-bottom: 20px; font-weight: bold;">Verify Your Email</h2>
          <p style="color: #4b5563; font-size: 16px;">Hello,</p>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">Thank you for choosing PChatNow. Please use the following One-Time Password (OTP) to complete your registration:</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #111827; background-color: #f3f4f6; padding: 12px 24px; border-radius: 8px; display: inline-block;">${otp}</span>
          </div>
          <p style="color: #ef4444; font-size: 14px; font-weight: 500; text-align: center;">This code is valid for 10 minutes. Do not share this code with anyone.</p>
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 32px; border-t: 1px solid #f3f4f6; padding-top: 16px;">
            If you did not request this verification code, you can safely ignore this email.
          </p>
        </div>
      `,
    }).catch(err => {
      console.error('[PChatNow] Async registration OTP email send failed:', err.message);
    });

    return res.status(200).json({ message: 'Verification code sent successfully. Please check your email inbox.' });
  } catch (error: any) {
    console.error('Send registration OTP error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req: Request, res: Response) => {
  const { name, username, email, password, otp } = req.body;

  try {
    const emailLower = email.toLowerCase().trim();

    const checkQuery: any[] = [
      { username: username.toLowerCase().trim() },
      { email: emailLower }
    ];

    const userExists = await User.findOne({ $or: checkQuery });
    if (userExists) {
      return res.status(400).json({ message: 'User with this email or username already exists' });
    }

    // Verify OTP code
    const otpRecord = await Otp.findOne({ email: emailLower });
    if (!otpRecord) {
      return res.status(400).json({ message: 'No verification code was sent for this email address' });
    }
    if (otpRecord.otp !== otp) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }
    if (otpRecord.expiresAt < new Date()) {
      return res.status(400).json({ message: 'Verification code has expired' });
    }

    const user = await User.create({
      name,
      username: username.toLowerCase().trim(),
      email: emailLower,
      password,
    });

    if (user) {
      // Delete the OTP record once verification succeeds
      await Otp.deleteOne({ email: emailLower });

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
        isOnline: user.isOnline,
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
    const loginIdentifier = email ? email.trim().toLowerCase() : '';
    const user = await User.findOne({ email: loginIdentifier });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (user.isBanned) {
      return res.status(403).json({ message: 'This account has been banned by the administrator' });
    }

    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
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
      isOnline: user.isOnline,
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

  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ message: 'Direct social login requests are disabled in production' });
  }

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
      isOnline: user.isOnline,
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

    const resetUrl = `http://localhost:5173/reset-password/${resetToken}`;

    // Send password recovery link via real email asynchronously in the background
    sendEmail({
      to: email,
      subject: 'PChatNow Password Reset Request',
      text: `To reset your PChatNow account password, please click on the following link or copy-paste it into your browser: ${resetUrl}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 25px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
          <h2 style="color: #10b981; text-align: center; margin-bottom: 20px; font-weight: bold;">Password Reset Request</h2>
          <p style="color: #4b5563; font-size: 16px;">Hello,</p>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">You are receiving this email because you (or someone else) requested a password reset for your PChatNow account.</p>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">Please click the button below to choose a new password. This link will expire in 1 hour:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #10b981; color: #ffffff; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 8px; font-size: 16px; display: inline-block;">Reset Password</a>
          </div>
          <p style="color: #6b7280; font-size: 14px;">If the button above does not work, copy and paste this URL into your browser:</p>
          <p style="color: #2563eb; font-size: 14px; word-break: break-all;"><a href="${resetUrl}">${resetUrl}</a></p>
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 32px; border-t: 1px solid #f3f4f6; padding-top: 16px;">
            If you did not make this request, you can safely ignore this email. Your password will remain unchanged.
          </p>
        </div>
      `,
    }).catch(err => {
      console.error('[PChatNow] Async forgot password email send failed:', err.message);
    });

    return res.status(200).json({
      message: 'Password reset instructions have been logged to the server console.',
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



const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// @desc    Google OAuth Login
// @route   POST /api/auth/google-login
// @access  Public
export const googleLogin = async (req: Request, res: Response) => {
  const { credential } = req.body;

  if (!credential) {
    return res.status(400).json({ message: 'Google credential token is required' });
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      console.warn('[PChatNow Security] GOOGLE_CLIENT_ID not configured in backend env.');
    }

    // Verify token with Google
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: clientId,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      return res.status(400).json({ message: 'Invalid Google credential token' });
    }

    const { email, name, picture, sub: googleId } = payload;

    if (!email) {
      return res.status(400).json({ message: 'Email address not provided by Google' });
    }

    // Check if user exists by email
    let user = await User.findOne({ email: email.toLowerCase().trim() });

    if (user) {
      // If user exists, check if googleId is already set
      let needsSave = false;
      if (!user.googleId) {
        user.googleId = googleId;
        needsSave = true;
      }
      if (picture && !user.avatar) {
        user.avatar = picture;
        needsSave = true;
      }
      if (needsSave) {
        await user.save();
      }
    } else {
      // Create a new user with randomized username and empty password
      const baseUsername = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '');
      const tempUsername = baseUsername + Math.floor(Math.random() * 10000);

      user = await User.create({
        name: name || 'Google User',
        username: tempUsername.toLowerCase().trim(),
        email: email.toLowerCase().trim(),
        avatar: picture || '',
        googleId,
        isVerified: true, // Trusted email from Google auth
      });
    }

    if (user.isBanned) {
      return res.status(403).json({ message: 'This account has been banned by the administrator' });
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
      isOnline: user.isOnline,
      token,
    });
  } catch (error: any) {
    console.error('Google login error:', error);
    return res.status(400).json({ message: 'Google authentication failed: ' + error.message });
  }
};

// @desc    Send general OTP code to email
// @route   POST /api/auth/send-otp
// @access  Public
export const sendOtpGeneric = async (req: Request, res: Response) => {
  const { email } = req.body;

  try {
    const emailLower = email.toLowerCase().trim();

    // Generate a 6-digit random code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes in the future

    // Upsert the OTP in database
    await Otp.findOneAndUpdate(
      { email: emailLower },
      { otp, expiresAt },
      { upsert: true, new: true }
    );

    // Send OTP email asynchronously in the background
    sendEmail({
      to: emailLower,
      subject: 'PChatNow - Verification Code',
      text: `Your verification code is ${otp}. This code will expire in 5 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 25px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
          <h2 style="color: #10b981; text-align: center; margin-bottom: 20px; font-weight: bold;">Security Verification</h2>
          <p style="color: #4b5563; font-size: 16px;">Hello,</p>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">You requested a verification code. Please use the following One-Time Password (OTP) to complete the verification process:</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #111827; background-color: #f3f4f6; padding: 12px 24px; border-radius: 8px; display: inline-block;">${otp}</span>
          </div>
          <p style="color: #ef4444; font-size: 14px; font-weight: 500; text-align: center;">This code is valid for 5 minutes. Do not share this code with anyone.</p>
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 32px; border-t: 1px solid #f3f4f6; padding-top: 16px;">
            If you did not request this verification code, you can safely ignore this email.
          </p>
        </div>
      `,
    }).catch(err => {
      console.error('[PChatNow] Async generic OTP email send failed:', err.message);
    });

    return res.status(200).json({ message: 'Verification code sent successfully. Please check your email inbox.' });
  } catch (error: any) {
    console.error('Send generic OTP error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Verify general OTP code
// @route   POST /api/auth/verify-otp
// @access  Public
export const verifyOtpGeneric = async (req: Request, res: Response) => {
  const { email, otp } = req.body;

  try {
    const emailLower = email.toLowerCase().trim();

    // Verify OTP code
    const otpRecord = await Otp.findOne({ email: emailLower });
    if (!otpRecord) {
      return res.status(400).json({ message: 'No verification code was sent for this email address' });
    }
    if (otpRecord.otp !== otp) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }
    if (otpRecord.expiresAt < new Date()) {
      return res.status(400).json({ message: 'Verification code has expired' });
    }

    // Delete the OTP record once verification succeeds
    await Otp.deleteOne({ email: emailLower });

    return res.status(200).json({ message: 'OTP verified successfully!' });
  } catch (error: any) {
    console.error('Verify generic OTP error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};
