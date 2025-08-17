const mongoose = require('mongoose');
const EmergencyContact = require('./models/EmergencyContact');
require('dotenv').config();

const emergencyContacts = [
  {
    category: 'Fire Brigade',
    name: 'Dhaka Fire Service',
    phoneNumber: '16163',
    address: 'Dhaka Central Fire Station, Dhaka',
    description: '24/7 Fire Emergency Service'
  },
  {
    category: 'Fire Brigade',
    name: 'Gulshan Fire Station',
    phoneNumber: '+880-2-988-1234',
    address: 'Gulshan-1, Dhaka',
    description: 'Local Fire Station'
  },
  {
    category: 'Police Station',
    name: 'Dhaka Metropolitan Police',
    phoneNumber: '999',
    address: 'DMP Headquarters, Dhaka',
    description: 'Emergency Police Service'
  },
  {
    category: 'Police Station',
    name: 'Gulshan Police Station',
    phoneNumber: '+880-2-988-5678',
    address: 'Gulshan-2, Dhaka',
    description: 'Local Police Station'
  },
  {
    category: 'Emergency',
    name: 'National Emergency Service',
    phoneNumber: '999',
    address: 'Emergency Control Room, Dhaka',
    description: 'General Emergency Service'
  },
  {
    category: 'Emergency',
    name: 'Civil Defense',
    phoneNumber: '+880-2-955-4321',
    address: 'Civil Defense Headquarters, Dhaka',
    description: 'Civil Defense Emergency'
  },
  {
    category: 'Hospital',
    name: 'Dhaka Medical College Hospital',
    phoneNumber: '+880-2-966-1551',
    address: 'Dhaka Medical College, Dhaka',
    description: 'Emergency Medical Service'
  },
  {
    category: 'Hospital',
    name: 'Square Hospital',
    phoneNumber: '+880-2-814-2431',
    address: 'Square Hospital, Dhaka',
    description: 'Private Hospital Emergency'
  },
  {
    category: 'Hospital',
    name: 'Apollo Hospitals Dhaka',
    phoneNumber: '+880-2-843-1661',
    address: 'Apollo Hospitals, Dhaka',
    description: 'International Standard Hospital'
  }
];

async function seedEmergencyContacts() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    // Clear existing contacts
    await EmergencyContact.deleteMany({});
    console.log('Cleared existing emergency contacts');

    // Insert new contacts
    const result = await EmergencyContact.insertMany(emergencyContacts);
    console.log(`Seeded ${result.length} emergency contacts`);

    mongoose.connection.close();
  } catch (error) {
    console.error('Error seeding emergency contacts:', error);
    mongoose.connection.close();
  }
}

seedEmergencyContacts();
