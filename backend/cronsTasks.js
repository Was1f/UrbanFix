// cronTasks.js - Run periodic notification tasks
require('dotenv').config();
const mongoose = require('mongoose');
const NotificationService = require('./services/notificationService');

async function runLeaderboardCheck() {
  try {
    console.log('🏆 Running leaderboard notification check...');
    
    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/community-app',
      { useNewUrlParser: true, useUnifiedTopology: true }
    );
    console.log('📊 Connected to MongoDB');
    
    // Run leaderboard checks for different periods
    await NotificationService.checkLeaderboardChanges('daily');
    console.log('✅ Daily leaderboard check completed');
    
    await NotificationService.checkLeaderboardChanges('weekly');
    console.log('✅ Weekly leaderboard check completed');
    
    await NotificationService.checkLeaderboardChanges('monthly');
    console.log('✅ Monthly leaderboard check completed');
    
  } catch (error) {
    console.error('❌ Error running leaderboard check:', error);
  }
}

async function runCleanupTask() {
  try {
    console.log('🧹 Running notification cleanup...');
    
    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/community-app',
      { useNewUrlParser: true, useUnifiedTopology: true }
    );
    console.log('📊 Connected to MongoDB');
    
    await NotificationService.cleanupOldNotifications();
    console.log('✅ Notification cleanup completed');
    
  } catch (error) {
    console.error('❌ Error running cleanup:', error);
  }
}

// Command line argument handling
const command = process.argv[2];

switch (command) {
  case 'leaderboard':
    runLeaderboardCheck().then(() => {
      console.log('🎯 Leaderboard task completed');
      process.exit(0);
    }).catch(error => {
      console.error('💥 Leaderboard task failed:', error);
      process.exit(1);
    });
    break;
    
  case 'cleanup':
    runCleanupTask().then(() => {
      console.log('🎯 Cleanup task completed');
      process.exit(0);
    }).catch(error => {
      console.error('💥 Cleanup task failed:', error);
      process.exit(1);
    });
    break;
    
  default:
    console.log('Usage: node cronTasks.js [leaderboard|cleanup]');
    console.log('');
    console.log('Commands:');
    console.log('  leaderboard - Check leaderboard rankings and notify top users');
    console.log('  cleanup     - Clean up old read notifications');
    console.log('');
    console.log('Cron job examples:');
    console.log('  # Daily leaderboard check at 9 AM');
    console.log('  0 9 * * * cd /path/to/project && node cronTasks.js leaderboard');
    console.log('');
    console.log('  # Weekly cleanup on Sundays at 2 AM');
    console.log('  0 2 * * 0 cd /path/to/project && node cronTasks.js cleanup');
    process.exit(0);
}