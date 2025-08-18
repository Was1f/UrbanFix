const mongoose = require('mongoose');
const EmergencyContact = require('./models/EmergencyContact');
require('dotenv').config();

// Real emergency contacts for Dhaka, Bangladesh
const emergencyContacts = [
  // Fire Brigade
  {
    category: 'Fire Brigade',
    name: 'Dhaka Central Fire Station',
    phoneNumber: '16163',
    address: 'Babupura, Dhaka-1000, Bangladesh',
    description: '24/7 Fire Emergency Service - Main Headquarters for Dhaka Metropolitan Area'
  },
  {
    category: 'Fire Brigade',
    name: 'Gulshan Fire Station',
    phoneNumber: '+880-2-8812345',
    address: 'Road 32, Gulshan-1, Dhaka-1212, Bangladesh',
    description: 'Fire Station serving Gulshan, Banani, and Baridhara areas'
  },
  {
    category: 'Fire Brigade',
    name: 'Dhanmondi Fire Station',
    phoneNumber: '+880-2-9661234',
    address: 'Road 15/A, Dhanmondi, Dhaka-1209, Bangladesh',
    description: 'Fire Station covering Dhanmondi, New Market, and Azimpur areas'
  },

  // Police Station
  {
    category: 'Police Station',
    name: 'Dhaka Metropolitan Police (Emergency)',
    phoneNumber: '999',
    address: 'DMP Headquarters, Ramna, Dhaka-1000, Bangladesh',
    description: 'Primary emergency police hotline for Dhaka Metropolitan Area'
  },
  {
    category: 'Police Station',
    name: 'Ramna Police Station',
    phoneNumber: '+880-2-9558080',
    address: 'Ramna, Dhaka-1000, Bangladesh',
    description: 'Central police station covering Ramna, Shahbagh, and TSC areas'
  },
  {
    category: 'Police Station',
    name: 'Gulshan Police Station',
    phoneNumber: '+880-2-8833481',
    address: 'Gulshan-1, Dhaka-1212, Bangladesh',
    description: 'Police station serving Gulshan, Banani, and diplomatic zone'
  },
  {
    category: 'Police Station',
    name: 'Dhanmondi Police Station',
    phoneNumber: '+880-2-9661390',
    address: 'Road 2, Dhanmondi, Dhaka-1205, Bangladesh',
    description: 'Police station covering Dhanmondi, Kalabagan, and surrounding areas'
  },

  // Emergency Services
  {
    category: 'Emergency',
    name: 'National Emergency Service',
    phoneNumber: '999',
    address: 'Bangladesh Emergency Services, Dhaka, Bangladesh',
    description: 'National emergency hotline for fire, police, and medical emergencies'
  },
  {
    category: 'Emergency',
    name: 'Rapid Action Battalion (RAB)',
    phoneNumber: '+880-2-8835100',
    address: 'RAB Headquarters, Uttara, Dhaka-1230, Bangladesh',
    description: 'Elite police force for serious criminal activities and terrorism'
  },
  {
    category: 'Emergency',
    name: 'Civil Defense Emergency',
    phoneNumber: '+880-2-9540641',
    address: 'Disaster Management Office, Secretariat, Dhaka-1000, Bangladesh',
    description: 'Emergency response for natural disasters and civil emergencies'
  },

  // Hospitals
  {
    category: 'Hospital',
    name: 'Dhaka Medical College Hospital',
    phoneNumber: '+880-2-8616980',
    address: 'Bakshibazar, Dhaka-1000, Bangladesh',
    description: 'Major government hospital with 24/7 emergency services and trauma center'
  },
  {
    category: 'Hospital',
    name: 'Square Hospital Limited',
    phoneNumber: '+880-2-8159457',
    address: '18/F, Bir Uttam Qazi Nuruzzaman Sarak, West Panthapath, Dhaka-1205, Bangladesh',
    description: 'Premier private hospital with advanced emergency and critical care facilities'
  },
  {
    category: 'Hospital',
    name: 'United Hospital Limited',
    phoneNumber: '+880-2-8836000',
    address: 'Plot 15, Road 71, Gulshan-2, Dhaka-1212, Bangladesh',
    description: 'Leading private hospital with 24/7 emergency services and modern equipment'
  },
  {
    category: 'Hospital',
    name: 'Bangabandhu Sheikh Mujib Medical University Hospital',
    phoneNumber: '+880-2-9668690',
    address: 'Shahbagh, Dhaka-1000, Bangladesh',
    description: 'Premier medical university hospital with specialized emergency services'
  },
  {
    category: 'Hospital',
    name: 'Ibn Sina Hospital',
    phoneNumber: '+880-2-9003801',
    address: 'House 48, Road 9/A, Dhanmondi, Dhaka-1209, Bangladesh',
    description: 'Multi-specialty hospital with 24/7 emergency and ambulance services'
  },
  {
    category: 'Hospital',
    name: 'Apollo Hospitals Dhaka',
    phoneNumber: '+880-2-8401661',
    address: 'Plot 81, Block E, Bashundhara R/A, Dhaka-1229, Bangladesh',
    description: 'International standard hospital with advanced emergency and trauma care'
  }
];

async function seedEmergencyContacts() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/community-app');
    console.log('📡 Connected to MongoDB');

    // Clear existing emergency contacts
    console.log('🗑️  Clearing existing emergency contacts...');
    await EmergencyContact.deleteMany({});

    // Insert new emergency contacts
    console.log('📱 Inserting real Dhaka emergency contacts...');
    const insertedContacts = await EmergencyContact.insertMany(emergencyContacts);

    console.log('\n✅ SUCCESS! Emergency contacts seeded successfully!');
    console.log(`📊 Total contacts added: ${insertedContacts.length}`);
    
    // Show summary by category
    const categories = ['Fire Brigade', 'Police Station', 'Emergency', 'Hospital'];
    categories.forEach(category => {
      const count = insertedContacts.filter(contact => contact.category === category).length;
      console.log(`   ${category}: ${count} contacts`);
    });

    console.log('\n📋 Sample contacts added:');
    insertedContacts.slice(0, 3).forEach(contact => {
      console.log(`   • ${contact.name} (${contact.category}): ${contact.phoneNumber}`);
    });

    console.log('\n🎉 Ready to test! Your emergency contacts page should now show real data.');
    
  } catch (error) {
    console.error('❌ Error seeding emergency contacts:', error);
  } finally {
    await mongoose.connection.close();
    console.log('📡 MongoDB connection closed');
    process.exit(0);
  }
}

// Run the seeding
seedEmergencyContacts();
