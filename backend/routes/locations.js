const express = require('express');
const router = express.Router();

// Pre-built Dhaka locations
const dhakaLocations = [
  'Badda',
  'Rampura', 
  'Gulshan',
  'Banani',
  'Dhanmondi',
  'Mohammadpur',
  'Mirpur',
  'Uttara',

  'Narayanganj',
  'Gazipur',


  'Motijheel',
  'Ramna',
  'Shahbagh',
  'Dhanmondi',


  'Paltan',
  'Motijheel',
  'Ramna',
  'Shahbagh',
  'Dhanmondi',
  'Wari',

  'Jatrabari'
];

// Remove duplicates and sort alphabetically
const uniqueLocations = [...new Set(dhakaLocations)].sort();

// GET /api/locations - Get all available locations
router.get('/', (req, res) => {
  try {
    res.json({
      success: true,
      locations: uniqueLocations,
      count: uniqueLocations.length,
      region: 'Dhaka, Bangladesh'
    });
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch locations'
    });
  }
});

// GET /api/locations/search?q=query - Search locations
router.get('/search', (req, res) => {
  try {
    const query = req.query.q?.toLowerCase();
    
    if (!query) {
      return res.json({
        success: true,
        locations: uniqueLocations,
        count: uniqueLocations.length
      });
    }

    const filteredLocations = uniqueLocations.filter(location =>
      location.toLowerCase().includes(query)
    );

    res.json({
      success: true,
      locations: filteredLocations,
      count: filteredLocations.length,
      query: query
    });
  } catch (error) {
    console.error('Error searching locations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search locations'
    });
  }
});

module.exports = router;
