const mongoose = require('mongoose');

const pickupSchema = new mongoose.Schema(
  {
    address: { type: String, required: true, trim: true, maxlength: 180 },
    pincode: { type: String, required: true, match: [/^\d{6}$/, 'Enter a valid 6-digit pincode'] },
    contactName: { type: String, required: true, trim: true, maxlength: 60 },
    contactPhone: { type: String, required: true, trim: true, maxlength: 15 }
  },
  { _id: false }
);

const foodListingSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 80 },
    category: {
      type: String,
      required: true,
      enum: ['Cooked Meal', 'Packaged Food', 'Fruits and Vegetables', 'Bakery', 'Other']
    },
    description: { type: String, trim: true, maxlength: 300 },
    quantity: { type: Number, required: true, min: 1, max: 10000 },
    unit: { type: String, enum: ['meals', 'packs', 'kg', 'items'], default: 'meals' },
    preparedAt: { type: Date, required: true, default: Date.now },
    expiryAt: { type: Date, required: true },
    tags: [{ type: String, trim: true, lowercase: true, maxlength: 30 }],
    pickup: { type: pickupSchema, required: true },
    status: {
      type: String,
      enum: ['available', 'claimed', 'picked_up', 'delivered', 'expired'],
      default: 'available'
    },
    // Referenced because a donor can create many listings.
    donor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    claimedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { timestamps: true }
);

foodListingSchema.pre('validate', function validateExpiry(next) {
  if (this.expiryAt && this.preparedAt && this.expiryAt <= this.preparedAt) {
    this.invalidate('expiryAt', 'Expiry time must be after the prepared time');
  }
  next();
});

// Indexes demonstrated in the course.
foodListingSchema.index({ expiryAt: 1 }); // single index
foodListingSchema.index({ status: 1, 'pickup.pincode': 1, expiryAt: 1 }); // compound index
foodListingSchema.index({ title: 'text', description: 'text', tags: 'text' }); // text index
foodListingSchema.index({ donor: 1, createdAt: -1 });

module.exports = mongoose.model('FoodListing', foodListingSchema);
