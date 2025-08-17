const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const seedDemoUser = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/community-app',
      { useNewUrlParser: true, useUnifiedTopology: true }
    );

    console.log('Connected to MongoDB');

    // Check if demo user already exists
    const existingUser = await User.findOne({ phone: '1234' });
    if (existingUser) {
      console.log('Demo user already exists:', existingUser);
      return;
    }

    // Create demo user
    const demoUser = new User({
      fname: 'Demo',
      lname: 'User',
      phone: '+1234567890',
      email: 'demo@urbanfix.com',
      address: '123 Demo Street, Demo City',
      profession: 'Software Developer',
      gender: 'Other',
      verificationBadge: true
    });

    const savedUser = await demoUser.save();
    console.log('Demo user created successfully:', savedUser);

    // Create a few more demo users with different phone numbers
    const demoUsers = [
      {
        fname: 'John',
        lname: 'Doe',
        phone: '+1111111111',
        email: 'john@example.com',
        address: '456 Main St, City A',
        profession: 'Teacher',
        gender: 'Male'
      },
      {
        fname: 'Jane',
        lname: 'Smith',
        phone: '+2222222222',
        email: 'jane@example.com',
        address: '789 Oak Ave, City B',
        profession: 'Doctor',
        gender: 'Female'
      }
    ];

    for (const userData of demoUsers) {
      const existingDemoUser = await User.findOne({ phone: userData.phone });
      if (!existingDemoUser) {
        const user = new User(userData);
        await user.save();
        console.log(`Demo user created: ${userData.fname} ${userData.lname} (${userData.phone})`);
      } else {
        console.log(`Demo user already exists: ${userData.phone}`);
      }
    }

  } catch (error) {
    console.error('Error seeding demo user:', error);
  } finally {
    mongoose.connection.close();
    console.log('Database connection closed');
  }
};

// Run the seeder
seedDemoUser();
