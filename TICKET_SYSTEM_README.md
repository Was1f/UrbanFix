# UrbanFix Ticket System

A comprehensive support ticket system that allows users to create support tickets and admins to manage them.

## Features

### User Features
- **Create Tickets**: Users can create support tickets with subject, description, priority, and category
- **Attach Images**: Support for image attachments using base64 encoding
- **View Tickets**: Users can view all their tickets from the Profile page
- **Search & Filter**: Users can search and filter tickets by status
- **Real-time Updates**: Ticket status updates in real-time

### Admin Features
- **Ticket Management**: Admins can view and manage all tickets
- **Status Updates**: Admins can update ticket status (open, in_progress, resolved, closed)
- **Response System**: Admins can respond to tickets with messages and attachments
- **Advanced Filtering**: Filter by status, priority, category, and assignment
- **Statistics Dashboard**: View ticket statistics and counts
- **Archived Tickets**: Access to resolved and closed tickets

## Architecture

### Backend Components

#### 1. Ticket Model (`backend/models/Ticket.js`)
- **Schema**: Comprehensive ticket schema with messages, attachments, and metadata
- **Methods**: Built-in methods for adding messages, updating status, and archiving
- **Indexes**: Optimized database indexes for efficient queries
- **Validation**: Input validation and data integrity

#### 2. Ticket Routes (`backend/routes/tickets.js`)
- **User Endpoints**: Create tickets, view user tickets, add messages
- **Admin Endpoints**: View all tickets, update status, assign tickets
- **Authentication**: JWT-based authentication for both users and admins
- **File Handling**: Support for image attachments

#### 3. Upload System (`backend/routes/upload.js`)
- **Base64 Support**: Handle image uploads from mobile devices
- **File Storage**: Organized file storage in dedicated directories
- **Ticket Attachments**: Special handling for ticket-related files

### Frontend Components

#### 1. Create Ticket (`UrbanFixMobile/app/create-ticket.js`)
- **Form Interface**: User-friendly ticket creation form
- **Image Upload**: Camera/gallery integration for attachments
- **Validation**: Client-side form validation
- **Priority Selection**: Visual priority selection with color coding

#### 2. Ticket Inbox (`UrbanFixMobile/app/ticket-inbox.js`)
- **Ticket List**: Comprehensive list of user's tickets
- **Search & Filter**: Advanced filtering by status and content
- **Sort Options**: Multiple sorting options (date, priority, subject)
- **Pull to Refresh**: Real-time data updates

#### 3. Ticket Detail (`UrbanFixMobile/app/ticket-detail.js`)
- **Conversation View**: Chat-like interface for ticket conversations
- **Status Management**: Admin controls for ticket status updates
- **Attachment Display**: View and manage ticket attachments
- **Real-time Updates**: Live ticket updates

#### 4. Admin Tickets (`UrbanFixMobile/app/admin-tickets.js`)
- **Dashboard View**: Overview of all tickets with statistics
- **Advanced Filtering**: Filter by status, priority, category, assignment
- **Bulk Operations**: Efficient ticket management
- **Statistics**: Real-time ticket counts and metrics

#### 5. Admin Archived Tickets (`UrbanFixMobile/app/admin-archived-tickets.js`)
- **Archive Access**: View resolved and closed tickets
- **Search Capabilities**: Search by content and user information
- **Historical Data**: Access to ticket resolution history

## API Endpoints

### User Endpoints
- `POST /api/tickets` - Create a new ticket
- `GET /api/tickets/user` - Get user's tickets
- `GET /api/tickets/:ticketId` - Get specific ticket
- `POST /api/tickets/:ticketId/messages` - Add message to ticket

### Admin Endpoints
- `GET /api/tickets/admin/all` - Get all tickets for admin
- `GET /api/tickets/admin/archived` - Get archived tickets
- `PATCH /api/tickets/:ticketId/status` - Update ticket status
- `PATCH /api/tickets/:ticketId/assign` - Assign ticket to admin
- `GET /api/tickets/admin/stats` - Get ticket statistics

### File Upload
- `POST /api/upload/base64` - Upload base64 encoded images
- `GET /api/upload/tickets/:filename` - Serve ticket attachments

## Database Schema

### Ticket Document
```javascript
{
  user: ObjectId,           // Reference to User
  subject: String,          // Ticket subject
  description: String,      // Initial description
  status: String,           // open, in_progress, resolved, closed
  priority: String,         // low, medium, high
  category: String,         // general, technical, complaint, etc.
  messages: [Message],      // Array of messages
  assignedAdmin: ObjectId,  // Reference to Admin
  resolvedBy: ObjectId,     // Admin who resolved the ticket
  resolvedAt: Date,         // Resolution timestamp
  closedAt: Date,          // Closure timestamp
  isArchived: Boolean,      // Archive status
  createdAt: Date,          // Creation timestamp
  updatedAt: Date           // Last update timestamp
}
```

### Message Document
```javascript
{
  sender: ObjectId,         // Reference to sender (User or Admin)
  senderModel: String,      // 'User' or 'Admin'
  content: String,          // Message content
  attachments: [Attachment], // Array of file attachments
  timestamp: Date           // Message timestamp
}
```

### Attachment Document
```javascript
{
  uri: String,              // File path
  type: String,             // MIME type
  size: Number,             // File size
  filename: String          // Original filename
}
```

## Installation & Setup

### Backend Setup
1. Ensure MongoDB is running
2. Install dependencies: `npm install`
3. Set environment variables in `.env`:
   ```
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   ```
4. Start the server: `npm start`

### Frontend Setup
1. Navigate to `UrbanFixMobile/`
2. Install dependencies: `npm install`
3. Start the development server: `npx expo start`

### Testing
Run the test script to verify the system:
```bash
cd backend
node test-tickets.js
```

## Usage

### For Users
1. Navigate to Profile page
2. Tap "Support Tickets" button
3. Create new tickets or view existing ones
4. Add messages and attachments as needed

### For Admins
1. Access admin dashboard
2. Navigate to "Support Tickets" section
3. Manage tickets, update status, and respond to users
4. Access archived tickets for historical data

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-based Access**: Separate user and admin permissions
- **Input Validation**: Server-side validation for all inputs
- **File Security**: Secure file upload and serving
- **Session Management**: Proper session handling and expiration

## Performance Optimizations

- **Database Indexes**: Optimized queries for ticket operations
- **Pagination**: Efficient data loading for large ticket lists
- **Caching**: Smart caching for frequently accessed data
- **File Compression**: Optimized image handling and storage

## Future Enhancements

- **Email Notifications**: Automated email updates for ticket status changes
- **Push Notifications**: Real-time mobile push notifications
- **Ticket Templates**: Predefined ticket templates for common issues
- **Analytics Dashboard**: Advanced reporting and analytics
- **Integration APIs**: Third-party service integrations
- **Multi-language Support**: Internationalization support

## Troubleshooting

### Common Issues
1. **Image Upload Failures**: Check file size and format restrictions
2. **Authentication Errors**: Verify JWT token validity and expiration
3. **Database Connection**: Ensure MongoDB is running and accessible
4. **File Permissions**: Check upload directory permissions

### Debug Mode
Enable debug logging by setting environment variables:
```
DEBUG=true
LOG_LEVEL=debug
```

## Support

For technical support or questions about the ticket system, please refer to the project documentation or contact the development team.

---

**Version**: 1.0.0  
**Last Updated**: December 2024  
**Maintainer**: UrbanFix Development Team
