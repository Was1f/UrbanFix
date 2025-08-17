const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(
  'mongodb+srv://urbanfixclient:urbanfixclient@cluster0.h7n2f.mongodb.net/urbanfixdb?retryWrites=true&w=majority&appName=Cluster0',
  { useNewUrlParser: true, useUnifiedTopology: true }
)
.then(() => console.log('✅ MongoDB connected'))
.catch((err) => console.error('❌ MongoDB connection error:', err));

// Routes
const phoneAuthRoutes = require('./routes/PhoneAuth');
const userInfoRoutes = require('./routes/UserInfo');

app.use('/api', phoneAuthRoutes);
app.use('/api/user', userInfoRoutes);

// Server start
const PORT = process.env.PORT || 1566;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
