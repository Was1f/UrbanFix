# UrbanFix - MERN Stack Mobile App

A mobile application for reporting and tracking urban infrastructure issues in communities. Built with React Native (frontend) and Node.js/Express/MongoDB (backend).

## Features

- **User Authentication**: Register, login, and profile management
- **Issue Reporting**: Report infrastructure problems with location, photos, and descriptions
- **Real-time Updates**: Track issue status and progress
- **Community Engagement**: Vote and comment on issues
- **Location-based**: Find issues near your location
- **Modern UI**: Beautiful and intuitive mobile interface

## Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **express-validator** - Input validation

### Frontend
- **React Native** - Mobile framework
- **Expo** - Development platform
- **React Navigation** - Navigation
- **React Native Paper** - UI components
- **Axios** - HTTP client
- **AsyncStorage** - Local storage
- **React Native Maps** - Maps integration

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v14 or higher)
- **npm** or **yarn**
- **MongoDB** (local installation or MongoDB Atlas account)
- **Expo CLI** (`npm install -g expo-cli`)
- **Expo Go** app on your mobile device (for testing)

## Installation & Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd UrbanFix
```

### 2. Install Dependencies

Install all dependencies for both backend and frontend:

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 3. Backend Setup

#### Environment Configuration

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a `.env` file based on the example:
```bash
cp env.example .env
```

3. Update the `.env` file with your configuration:
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/urbanfix

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=24h
```

#### Database Setup

1. **Local MongoDB**: Start your MongoDB service
2. **MongoDB Atlas**: Use the connection string from your Atlas cluster

#### Start the Backend Server

```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

The backend will be available at `http://localhost:5000`

### 4. Frontend Setup

#### Environment Configuration

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Update the API base URL in `src/services/api.js`:
```javascript
baseURL: 'http://your-backend-url:5000/api'
```

#### Start the React Native App

```bash
# Start Expo development server
npm start

# Or use specific platforms
npm run android  # Android
npm run ios      # iOS
npm run web      # Web
```

3. **Testing on Device**:
   - Install Expo Go on your mobile device
   - Scan the QR code displayed in the terminal
   - The app will load on your device

## Project Structure

```
UrbanFix/
├── backend/                 # Backend API
│   ├── models/             # MongoDB schemas
│   ├── routes/             # API routes
│   ├── server.js           # Main server file
│   ├── package.json        # Backend dependencies
│   └── env.example         # Environment variables example
├── frontend/               # React Native app
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── screens/        # App screens
│   │   ├── context/        # React context
│   │   ├── services/       # API services
│   │   └── utils/          # Utility functions
│   ├── assets/             # Images, fonts, etc.
│   ├── App.js              # Main app component
│   ├── app.json            # Expo configuration
│   └── package.json        # Frontend dependencies
├── package.json            # Root package.json
└── README.md               # This file
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `PUT /api/users/password` - Change password

### Issues
- `GET /api/issues` - Get all issues (with filters)
- `GET /api/issues/:id` - Get issue by ID
- `POST /api/issues` - Create new issue
- `PUT /api/issues/:id` - Update issue
- `POST /api/issues/:id/vote` - Vote on issue
- `POST /api/issues/:id/comments` - Add comment

## Development Workflow

### Running Both Backend and Frontend

From the root directory:

```bash
# Install all dependencies
npm run install-all

# Start both backend and frontend
npm run dev
```

### Individual Commands

```bash
# Backend only
npm run server

# Frontend only
npm run client
```

## Testing

### Backend Testing

```bash
cd backend
npm test
```

### Frontend Testing

```bash
cd frontend
npm test
```

## Deployment

### Backend Deployment

1. **Heroku**:
   ```bash
   cd backend
   heroku create your-app-name
   git push heroku main
   ```

2. **Railway**:
   - Connect your GitHub repository
   - Set environment variables
   - Deploy automatically

### Frontend Deployment

1. **Expo Application Services (EAS)**:
   ```bash
   cd frontend
   eas build --platform all
   eas submit --platform all
   ```

2. **App Store/Google Play**:
   - Build with EAS
   - Submit through respective stores

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Troubleshooting

### Common Issues

1. **MongoDB Connection Error**:
   - Ensure MongoDB is running
   - Check connection string in `.env`
   - Verify network connectivity

2. **Expo Build Issues**:
   - Clear Expo cache: `expo r -c`
   - Update Expo CLI: `npm install -g expo-cli@latest`

3. **API Connection Issues**:
   - Verify backend is running
   - Check API base URL in frontend
   - Ensure CORS is properly configured

### Getting Help

- Check the [Expo documentation](https://docs.expo.dev/)
- Review [React Native documentation](https://reactnative.dev/)
- Consult [Express.js documentation](https://expressjs.com/)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

---

**Happy coding! 🚀** 