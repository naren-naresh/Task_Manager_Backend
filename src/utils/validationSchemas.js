import * as yup from 'yup';

export const authSchema = yup.object({
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
});

export const taskSchema = yup.object({
  _id: yup.string().uuid('Invalid task ID').required(),
  title: yup.string().required('Title is required').max(100),
  description: yup.string().max(500),
  status: yup.string().oneOf(['pending', 'completed']),
  orderIndex: yup.number().integer(),
});