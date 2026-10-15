const express = require('express');
const FoodListing = require('../models/FoodListing');
const Claim = require('../models/Claim');
const { protect, allowRoles } = require('../middleware/auth');

const router = express.Router();

function cleanTags(tags) {
  if (!Array.isArray(tags)) return [];
  return tags.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean).slice(0, 8);
}

// Public list endpoint: filters demonstrate indexed queries and text search.
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 8, 1), 30);
    const query = { status: req.query.status || 'available' };

    if (req.query.pincode) query['pickup.pincode'] = req.query.pincode;
    if (req.query.category) query.category = req.query.category;
    if (req.query.search) query.$text = { $search: req.query.search };

    const [listings, total] = await Promise.all([
      FoodListing.find(query)
        .select('title category description quantity unit expiryAt tags pickup status donor createdAt')
        .populate('donor', 'name organizationName role')
        .sort(req.query.search ? { score: { $meta: 'textScore' }, expiryAt: 1 } : { expiryAt: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      FoodListing.countDocuments(query)
    ]);

    return res.json({ listings, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    next(error);
  }
});

router.get('/mine', protect, async (req, res, next) => {
  try {
    const listings = await FoodListing.find({ donor: req.user._id }).sort({ createdAt: -1 }).lean();
    return res.json({ listings });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const listing = await FoodListing.findById(req.params.id).populate('donor', 'name organizationName phone');
    if (!listing) return res.status(404).json({ message: 'Food listing not found.' });
    return res.json({ listing });
  } catch (error) {
    next(error);
  }
});

router.post('/', protect, allowRoles('donor', 'ngo', 'admin'), async (req, res, next) => {
  try {
    const listing = await FoodListing.create({ ...req.body, tags: cleanTags(req.body.tags), donor: req.user._id });
    return res.status(201).json({ listing });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', protect, async (req, res, next) => {
  try {
    const listing = await FoodListing.findById(req.params.id);
    if (!listing) return res.status(404).json({ message: 'Food listing not found.' });
    if (String(listing.donor) !== String(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only the donor can update this listing.' });
    }
    if (!['available', 'expired'].includes(listing.status) && req.user.role !== 'admin') {
      return res.status(400).json({ message: 'Claimed listings cannot be edited.' });
    }

    const allowedFields = ['title', 'category', 'description', 'quantity', 'unit', 'preparedAt', 'expiryAt', 'pickup', 'status'];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) listing[field] = req.body[field];
    });
    if (req.body.tags !== undefined) listing.tags = cleanTags(req.body.tags);
    await listing.save();
    return res.json({ listing });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', protect, async (req, res, next) => {
  try {
    const listing = await FoodListing.findById(req.params.id);
    if (!listing) return res.status(404).json({ message: 'Food listing not found.' });
    if (String(listing.donor) !== String(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only the donor can delete this listing.' });
    }
    if (listing.status === 'claimed') return res.status(400).json({ message: 'A claimed listing cannot be deleted.' });
    await Claim.deleteMany({ listing: listing._id });
    await listing.deleteOne();
    return res.json({ message: 'Food listing deleted.' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
