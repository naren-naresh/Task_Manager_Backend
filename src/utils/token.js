import jwt from 'jsonwebtoken';

const ISSUER = 'task-manager-api';
const AUDIENCE = 'task-manager-client';

export const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
    issuer: ISSUER,      // Sender validation
    audience: AUDIENCE,  // Receiver validation
  });
};