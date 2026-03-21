import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { generateAccessToken, generateRefreshToken } from '../utils/token.js';
import { logger } from '../utils/logger.js';

export const registerUser = async (req, res) => {
  const { email, password } = req.body;
  const userExists = await User.findOne({ email });

  if (userExists) {
    res.status(400);
    throw new Error('User already exists'); // Express 5 catches this automatically!
  }

  const user = await User.create({ email, password });

  logger.info(`User registered: ${user.email}`);
  res.status(201).json({
    success: true,
    _id: user._id,
    email: user.email,
    theme: user.theme,
    token: generateAccessToken(user._id),
  });
};

const cookieOptions = {
  httpOnly: true, // Prevents JS access
  secure: process.env.NODE_ENV === 'production', 
  sameSite: 'strict',
  path: '/',
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (user && (await user.comparePassword(password))) {
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Set Access Token (15 min)
    res.cookie('accessToken', accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
    // Set Refresh Token (1 day)
    res.cookie('refreshToken', refreshToken, { ...cookieOptions, maxAge: 24 * 60 * 60 * 1000 });

    res.json({ success: true, _id: user._id, email: user.email });
  } else {
    res.status(401);
    throw new Error('Invalid email or password');
  }
};


export const refreshAccessToken = async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ message: 'Refresh token missing' });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    
    // Optional: Verify ISSUER and AUDIENCE for production grade
    // if (decoded.iss !== 'task-manager-api') throw new Error('Invalid Issuer');

    const newAccessToken = generateAccessToken(decoded.id);

    // Set the new Access Token in a secure cookie (15 min)
    res.cookie('accessToken', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000,
      path: '/',
    });

    res.json({ success: true });
  } catch (error) {
    res.status(403).json({ message: 'Invalid or expired refresh token' });
  }
};


export const getMe = async (req, res) => {
  // req.user is populated by the 'protect' middleware using the secure cookie
  if (req.user) {
    res.status(200).json({
      success: true,
      data: {
        _id: req.user._id,
        email: req.user.email,
        theme: req.user.theme
      }
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
};