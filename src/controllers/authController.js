import User from '../models/User.js';
import { generateToken } from '../utils/token.js';
import { logger } from '../utils/logger.js';

// @desc    Register a new user
// @route   POST /api/auth/register
export const registerUser = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    const userExists = await User.findOne({ email });

    if (userExists) {
      res.status(400);
      throw new Error('User already exists');
    }

    const user = await User.create({
      email,
      password,
    });

    if (user) {
      logger.info(`User registered: ${user.email}`);
      res.status(201).json({
        success: true,
        _id: user._id,
        email: user.email,
        theme: user.theme,
        token: generateToken(user._id),
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
export const loginUser = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (user && (await user.comparePassword(password))) {
      logger.info(`User logged in: ${user.email}`);
      res.json({
        success: true,
        _id: user._id,
        email: user.email,
        theme: user.theme,
        token: generateToken(user._id),
      });
    } else {
      res.status(401);
      throw new Error('Invalid email or password');
    }
  } catch (error) {
    next(error);
  }
};