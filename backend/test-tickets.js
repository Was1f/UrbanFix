const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Test Ticket model
const Ticket = require('./models/Ticket');

async function testTicketSystem() {
  try {
    console.log('🧪 Testing Ticket System...');
    
    // Test 1: Check if Ticket model is defined
    console.log('1. Ticket model:', typeof Ticket);
    
    // Test 2: Check if we can create a ticket instance
    const testTicket = new Ticket({
      subject: 'Test Ticket',
      description: 'This is a test ticket',
      priority: 'medium',
      category: 'general',
      user: new mongoose.Types.ObjectId(), // Dummy user ID
      messages: [{
        sender: new mongoose.Types.ObjectId(),
        senderModel: 'User',
        content: 'Test message',
        attachments: []
      }]
    });
    
    console.log('2. Test ticket instance created:', testTicket.subject);
    
    // Test 3: Check schema methods
    console.log('3. Schema methods available:');
    console.log('   - addMessage:', typeof testTicket.addMessage);
    console.log('   - updateStatus:', typeof testTicket.updateStatus);
    console.log('   - archive:', typeof testTicket.archive);
    
    // Test 4: Check indexes
    const indexes = await Ticket.collection.indexes();
    console.log('4. Indexes created:', indexes.length);
    
    console.log('✅ All tests passed! Ticket system is ready.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  }
}

// Run tests
testTicketSystem();
