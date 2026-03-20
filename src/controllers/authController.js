import User from '../models/User.js';
import { generateToken } from '../utils/token.js';
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
    token: generateToken(user._id),
  });
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body;
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
};