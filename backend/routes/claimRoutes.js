const express = require('express');
const FoodListing = require('../models/FoodListing');
const Claim = require('../models/Claim');
const { protect, allowRoles } = require('../middleware/auth');

const router = express.Router();

router.get('/mine', protect, allowRoles('volunteer', 'ngo', 'admin'), async (req, res, next) => {
  try {
    const filter = req.user.role === 'admin' && req.query.all === 'true' ? {} : { volunteer: req.user._id };
    const claims = await Claim.find(filter)
      .populate({ path: 'listing', populate: { path: 'donor', select: 'name organizationName phone' } })
      .populate('volunteer', 'name email')
      .sort({ createdAt: -1 });
    return res.json({ claims });
  } catch (error) {
    next(error);
  }
});

router.post('/:listingId', protect, allowRoles('volunteer', 'ngo', 'admin'), async (req, res, next) => {
  try {
    const listing = await FoodListing.findById(req.params.listingId);
    if (!listing) return res.status(404).json({ message: 'Food listing not found.' });
    if (listing.status !== 'available') return res.status(400).json({ message: 'This food is no longer available.' });
    if (listing.expiryAt <= new Date()) {
      listing.status = 'expired';
      await listing.save();
      return res.status(400).json({ message: 'This food has expired.' });
    }
    if (String(listing.donor) === String(req.user._id)) {
      return res.status(400).json({ message: 'You cannot claim your own listing.' });
    }

    const claim = await Claim.create({ listing: listing._id, volunteer: req.user._id, note: req.body.note });
    listing.status = 'claimed';
    listing.claimedBy = req.user._id;
    await listing.save();
    return res.status(201).json({ claim, message: 'Food claimed. Please contact the donor for pickup.' });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'You have already claimed this listing.' });
    next(error);
  }
});

router.patch('/:id/status', protect, async (req, res, next) => {
  try {
    const claim = await Claim.findById(req.params.id).populate('listing');
    if (!claim) return res.status(404).json({ message: 'Claim not found.' });

    const isVolunteer = String(claim.volunteer) === String(req.user._id);
    const isDonor = String(claim.listing.donor) === String(req.user._id);
    if (!isVolunteer && !isDonor && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You cannot update this claim.' });
    }

    const allowedStatuses = ['picked_up', 'delivered', 'cancelled'];
    if (!allowedStatuses.includes(req.body.status)) return res.status(400).json({ message: 'Invalid claim status.' });

    claim.status = req.body.status;
    if (req.body.status === 'picked_up') claim.pickupTime = new Date();
    await claim.save();

    if (req.body.status === 'cancelled') {
      claim.listing.status = 'available';
      claim.listing.claimedBy = null;
    } else {
      claim.listing.status = req.body.status;
    }
    await claim.listing.save();
    return res.json({ claim });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
