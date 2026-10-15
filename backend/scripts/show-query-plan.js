require('dotenv').config();

const mongoose = require('mongoose');
const connectDatabase = require('../config/db');
const FoodListing = require('../models/FoodListing');

async function showQueryPlan() {
  await connectDatabase();
  const query = { status: 'available', 'pickup.pincode': '110001', expiryAt: { $gt: new Date() } };
  const plan = await FoodListing.find(query)
    .select('title expiryAt pickup.pincode -_id')
    .sort({ expiryAt: 1 })
    .explain('executionStats');

  console.log('Query filter:', query);
  console.log('Winning plan:', JSON.stringify(plan.queryPlanner.winningPlan, null, 2));
  console.log('Execution statistics:', JSON.stringify(plan.executionStats, null, 2));
  await mongoose.disconnect();
}

showQueryPlan().catch((error) => {
  console.error(error);
  mongoose.disconnect();
  process.exit(1);
});
