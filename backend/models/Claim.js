const mongoose = require('mongoose');

const claimSchema = new mongoose.Schema(
  {
    listing: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodListing', required: true },
    volunteer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    note: { type: String, trim: true, maxlength: 200 },
    status: {
      type: String,
      enum: ['claimed', 'picked_up', 'delivered', 'cancelled'],
      default: 'claimed'
    },
    pickupTime: { type: Date, default: null }
  },
  { timestamps: true }
);

claimSchema.index({ listing: 1, volunteer: 1 }, { unique: true });
claimSchema.index({ volunteer: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Claim', claimSchema);
