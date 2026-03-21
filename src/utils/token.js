import jwt from 'jsonwebtoken';

const ISSUER = 'task-manager-api';
const AUDIENCE = 'task-manager-client';

export const generateAccessToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '15m',
    issuer: ISSUER,
    audience: AUDIENCE,
  });
};

export const generateRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '1d',
    issuer: ISSUER,
    audience: AUDIENCE,
  });
};