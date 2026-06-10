import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';

// Middleware to report validation errors
export const validateFields = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
  }
  next();
};

// Validation rules for Register OTP Request
export const validateRegisterOtp = [
  body('email')
    .notEmpty().withMessage('Email Address is required')
    .isEmail().withMessage('Please enter a valid email address')
    .trim()
    .normalizeEmail(),
];

// Validation rules for Generic Send OTP Request
export const validateSendOtp = [
  body('email')
    .notEmpty().withMessage('Email Address is required')
    .isEmail().withMessage('Please enter a valid email address')
    .trim()
    .normalizeEmail(),
];

// Validation rules for Generic Verify OTP Request
export const validateVerifyOtp = [
  body('email')
    .notEmpty().withMessage('Email Address is required')
    .isEmail().withMessage('Please enter a valid email address')
    .trim()
    .normalizeEmail(),
  body('otp')
    .notEmpty().withMessage('Verification code is required')
    .isLength({ min: 6, max: 6 }).withMessage('Verification code must be exactly 6 digits')
    .isNumeric().withMessage('Verification code must contain only numbers')
    .trim(),
];

// Validation rules for Register
export const validateRegister = [
  body('name').notEmpty().withMessage('Full Name is required').trim(),
  body('username')
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 3 }).withMessage('Username must be at least 3 characters')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers and underscores')
    .trim(),
  body('email')
    .notEmpty().withMessage('Email Address is required')
    .isEmail().withMessage('Please enter a valid email address').trim().normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Passwords do not match');
    }
    return true;
  }),
  body('otp')
    .notEmpty().withMessage('Verification code is required')
    .isLength({ min: 6, max: 6 }).withMessage('Verification code must be exactly 6 digits')
    .isNumeric().withMessage('Verification code must contain only numbers')
    .trim(),
];

// Validation rules for Login
export const validateLogin = [
  body('email')
    .notEmpty().withMessage('Email Address is required')
    .isEmail().withMessage('Please enter a valid email address')
    .trim()
    .normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

// Validation rules for Password change
export const validatePasswordChange = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
];
