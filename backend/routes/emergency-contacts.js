const express = require('express');
const router = express.Router();
const EmergencyContact = require('../models/EmergencyContact');

// Get all emergency contacts
router.get('/', async (req, res) => {
  try {
    const contacts = await EmergencyContact.find({ isActive: true }).sort({ category: 1, name: 1 });
    res.json(contacts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get emergency contacts by category
router.get('/category/:category', async (req, res) => {
  try {
    const contacts = await EmergencyContact.find({ 
      category: req.params.category, 
      isActive: true 
    }).sort({ name: 1 });
    res.json(contacts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new emergency contact
router.post('/', async (req, res) => {
  const contact = new EmergencyContact({
    category: req.body.category,
    name: req.body.name,
    phoneNumber: req.body.phoneNumber,
    address: req.body.address,
    description: req.body.description
  });

  try {
    const newContact = await contact.save();
    res.status(201).json(newContact);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get a specific emergency contact
router.get('/:id', async (req, res) => {
  try {
    const contact = await EmergencyContact.findById(req.params.id);
    if (contact) {
      res.json(contact);
    } else {
      res.status(404).json({ message: 'Contact not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update an emergency contact
router.patch('/:id', async (req, res) => {
  try {
    const contact = await EmergencyContact.findById(req.params.id);
    if (contact) {
      Object.keys(req.body).forEach(key => {
        contact[key] = req.body[key];
      });
      const updatedContact = await contact.save();
      res.json(updatedContact);
    } else {
      res.status(404).json({ message: 'Contact not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete an emergency contact (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const contact = await EmergencyContact.findById(req.params.id);
    if (contact) {
      contact.isActive = false;
      await contact.save();
      res.json({ message: 'Contact deactivated' });
    } else {
      res.status(404).json({ message: 'Contact not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
