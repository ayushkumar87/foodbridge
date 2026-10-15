const express = require('express');
const FoodListing = require('../models/FoodListing');
const Claim = require('../models/Claim');
const { protect, allowRoles } = require('../middleware/auth');

const router = express.Router();

router.get('/dashboard', protect, allowRoles('admin'), async (req, res, next) => {
  try {
    const [summary] = await FoodListing.aggregate([
      {
        $group: {
          _id: null,
          totalListings: { $sum: 1 },
          availableListings: { $sum: { $cond: [{ $eq: ['$status', 'available'] }, 1, 0] } },
          deliveredMeals: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, '$quantity', 0] } },
          expiredMeals: { $sum: { $cond: [{ $eq: ['$status', 'expired'] }, '$quantity', 0] } }
        }
      },
      { $project: { _id: 0 } }
    ]);

    // $lookup and $unwind connect references only for the report, not every normal query.
    const topDonors = await FoodListing.aggregate([
      { $match: { status: { $in: ['picked_up', 'delivered'] } } },
      { $group: { _id: '$donor', listings: { $sum: 1 }, meals: { $sum: '$quantity' } } },
      { $sort: { meals: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'donor' } },
      { $unwind: '$donor' },
      { $project: { _id: 0, name: '$donor.name', organization: '$donor.organizationName', listings: 1, meals: 1 } }
    ]);

    const monthlyImpact = await Claim.aggregate([
      { $match: { status: 'delivered' } },
      { $lookup: { from: 'foodlistings', localField: 'listing', foreignField: '_id', as: 'listing' } },
      { $unwind: '$listing' },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          meals: { $sum: '$listing.quantity' },
          deliveries: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 6 }
    ]);

    return res.json({ summary: summary || { totalListings: 0, availableListings: 0, deliveredMeals: 0, expiredMeals: 0 }, topDonors, monthlyImpact });
  } catch (error) {
    next(error);
  }
});

router.get('/urgent', protect, async (req, res, next) => {
  try {
    const hours = Math.min(Math.max(Number(req.query.hours) || 6, 1), 24);
    const now = new Date();
    const deadline = new Date(now.getTime() + hours * 60 * 60 * 1000);
    const listings = await FoodListing.find({ status: 'available', expiryAt: { $gt: now, $lte: deadline } })
      .select('title quantity unit expiryAt pickup donor')
      .populate('donor', 'name organizationName')
      .sort({ expiryAt: 1 });
    return res.json({ listings });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
