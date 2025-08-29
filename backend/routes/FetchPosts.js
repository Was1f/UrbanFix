const express = require("express");
const router = express.Router();
const Discussion = require("../models/Discussion");
const User = require("../models/User"); // adjust path if needed

/**
 * Fetch discussions by userId
 * - Finds the user
 * - Fetches discussions using phone first, then name fallback
 */
router.get("/user/:userId/discussions", async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ message: "User not found" });

    const conditions = [];

    if (user.phone) conditions.push({ authorPhone: user.phone });

    let fullName = user.name?.trim() || `${user.fname || ""} ${user.lname || ""}`.trim();
    if (fullName) conditions.push({ author: fullName });

    if (conditions.length === 0) return res.json([]);

    const discussions = await Discussion.find({ $or: conditions })
      .select('title description type author authorPhone location time image likeCount comments createdAt')
      .sort({ createdAt: -1 })
      .lean();

    console.log('Discussions found:', discussions.length);
    if (discussions.length > 0) {
      console.log('First discussion sample:', {
        title: discussions[0].title,
        image: discussions[0].image,
        hasImage: !!discussions[0].image
      });
    }

    res.json(discussions);
  } catch (err) {
    console.error("Error fetching discussions by userId:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * Fetch discussions directly by phone
 */
router.get("/phone/:phone/discussions", async (req, res) => {
  try {
    const { phone } = req.params;

    if (!phone) return res.status(400).json({ message: "Phone is required" });

    const discussions = await Discussion.find({ authorPhone: phone })
      .sort({ createdAt: -1 })
      .lean();

    res.json(discussions);
  } catch (err) {
    console.error("Error fetching discussions by phone:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
