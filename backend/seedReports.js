const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Report = require('./models/Report');
const Discussion = require('./models/Discussion');

dotenv.config();

const seedReports = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    // Get some existing discussions
    const discussions = await Discussion.find().limit(3);
    
    if (discussions.length === 0) {
      console.log('No discussions found. Please create some discussions first.');
      process.exit(0);
    }

    const reportReasons = [
      'Inappropriate Content',
      'Spam',
      'Harassment',
      'Misinformation',
      'Hate Speech',
      'Violence'
    ];

    const reports = [];
    
    // Create sample reports for each discussion
    for (let i = 0; i < discussions.length; i++) {
      const discussion = discussions[i];
      const reason = reportReasons[i % reportReasons.length];
      
      const report = new Report({
        discussionId: discussion._id,
        reason,
        reporterUsername: `User${i + 1}`,
        status: 'pending'
      });
      
      reports.push(report);
    }

    await Report.insertMany(reports);
    console.log(`Created ${reports.length} sample reports`);
    
    // Update discussions to be flagged
    for (const discussion of discussions) {
      discussion.isFlagged = true;
      discussion.flagCount = 1;
      discussion.status = 'flagged';
      await discussion.save();
    }

    console.log('Updated discussions as flagged');

  } catch (error) {
    console.error('Error seeding reports:', error);
  } finally {
    mongoose.connection.close();
  }
};

seedReports();
