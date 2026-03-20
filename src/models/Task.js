import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  // UUID from client to prevent duplicates during offline sync
  _id: { type: String, required: true }, 
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  status: {
    type: String,
    enum: ['pending', 'completed'],
    default: 'pending',
  },
  orderIndex: { type: Number, default: 0 }, // For Drag & Drop sorting
  lastModified: { type: Date, default: Date.now }, // For conflict resolution
  isDeleted: { type: Boolean, default: false }, // Soft delete for sync
}, { timestamps: true, _id: false }); // Disable auto-gen _id to use client UUID

taskSchema.index({ userId: 1, isDeleted: 1 });

const Task = mongoose.model('Task', taskSchema);
export default Task;