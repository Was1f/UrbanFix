// models/Notification.js
const NotificationSchema = new mongoose.Schema({
  recipient: { type: String, required: true }, // username
  sender: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['help_offered', 'help_accepted', 'comment_added', 'post_liked'],
    required: true 
  },
  relatedPost: { type: mongoose.Schema.Types.ObjectId, ref: 'Discussion' },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});