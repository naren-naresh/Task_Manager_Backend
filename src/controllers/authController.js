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
  httpOnly: true, // Remains true for security
  secure: true,   // MUST be true for sameSite: 'none' to work
  sameSite: 'none', // Required for cross-site (Vercel frontend to Vercel backend)
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
    
    // SECURITY FIX 1: Verify the user still exists in the DB (prevents ghost sessions)
    const user = await User.findById(decoded.id).select('_id');
    if (!user) {
      throw new Error('User no longer exists');
    }

    // SECURITY FIX 2: Refresh Token Rotation (Issue a new pair)
    const newAccessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    // Set the new Access Token (15 min)
    res.cookie('accessToken', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000,
      path: '/',
    });

    // Set the NEW Refresh Token (1 day), replacing the old one
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/',
    });

    res.json({ success: true });
  } catch (error) {
    // SECURITY FIX 3: Actively destroy the cookies if the token is invalid/expired
    res.cookie('accessToken', '', { maxAge: 0, httpOnly: true, path: '/' });
    res.cookie('refreshToken', '', { maxAge: 0, httpOnly: true, path: '/' });
    res.status(403).json({ message: 'Invalid or expired session. Please log in again.' });
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

export const logoutUser = (req, res) => {
  const logoutOptions = {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/',
    expires: new Date(0), // Forces immediate expiration
  };

  res.cookie('accessToken', '', logoutOptions);
  res.cookie('refreshToken', '', logoutOptions); // Clear both if applicable

  res.status(200).json({ success: true, message: 'Logged out successfully' });
};