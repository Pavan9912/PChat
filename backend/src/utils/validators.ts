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

// Validation rules for Register
export const validateRegister = [
  body('name').notEmpty().withMessage('Full Name is required').trim(),
  body('username')
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 3 }).withMessage('Username must be at least 3 characters')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers and underscores')
    .trim(),
  body('email')
    .optional({ checkFalsy: true })
    .isEmail().withMessage('Please enter a valid email address').trim().normalizeEmail(),
  body('phoneNumber')
    .optional({ checkFalsy: true })
    .matches(/^\+?[1-9]\d{1,14}$/).withMessage('Please enter a valid phone number')
    .trim(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Passwords do not match');
    }
    return true;
  }),
  body().custom((value, { req }) => {
    if (!req.body.email && !req.body.phoneNumber) {
      throw new Error('Either Email Address or Phone Number is required');
    }
    return true;
  }),
];

// Validation rules for Login
export const validateLogin = [
  body('email')
    .notEmpty().withMessage('Email or Phone Number is required')
    .custom((value) => {
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      const isPhone = /^\+?[1-9]\d{1,14}$/.test(value);
      if (!isEmail && !isPhone) {
        throw new Error('Please enter a valid email address or phone number');
      }
      return true;
    }).trim(),
  body('password').notEmpty().withMessage('Password is required'),
];

// Validation rules for Password change
export const validatePasswordChange = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
];
