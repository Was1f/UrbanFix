const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Admin = require('./models/Admin');

dotenv.config();

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ username: 'admin' });
    if (existingAdmin) {
      console.log('Admin user already exists');
      console.log('Username: admin');
      console.log('Password: 123');
      console.log('Email: admin@urbanfix.com');
      process.exit(0);
    }

    // Create new admin user
    const admin = new Admin({
      username: 'admin',
      password: '123',
      email: 'admin@urbanfix.com',
      role: 'admin'
    });

    await admin.save();
    console.log('✅ Admin user created successfully!');
    console.log('📝 Login Credentials:');
    console.log('   Username: admin');
    console.log('   Password: 123');
    console.log('   Email: admin@urbanfix.com');
    console.log('\n🚀 You can now login to the admin dashboard!');

  } catch (error) {
    console.error('❌ Error seeding admin:', error);
  } finally {
    mongoose.connection.close();
  }
};

seedAdmin();
