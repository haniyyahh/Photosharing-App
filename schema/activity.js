import mongoose from "mongoose";

/**
 * Activity types:
 * - PHOTO_UPLOAD
 * - COMMENT_ADDED
 * - USER_REGISTER
 * - USER_LOGIN
 * - USER_LOGOUT
 */

const activitySchema = new mongoose.Schema({
  // Type of activity
  activity_type: {
    type: String,
    required: true,
    enum: ['PHOTO_UPLOAD', 'COMMENT_ADDED', 'USER_REGISTER', 'USER_LOGIN', 'USER_LOGOUT']
  },
  
  // Timestamp of the activity
  date_time: {
    type: Date,
    default: Date.now,
    required: true
  },
  
  // User who performed the activity
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Optional: photo_id for photo uploads and comments
  photo_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Photo',
    default: null
  },
  
  // Optional: file_name for showing thumbnails
  file_name: {
    type: String,
    default: null
  }
});

// Index for efficient querying (most recent first)
activitySchema.index({ date_time: -1 });

const Activity = mongoose.model("Activity", activitySchema);

export default Activity;