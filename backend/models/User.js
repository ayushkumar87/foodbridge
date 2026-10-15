const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const volunteerProfileSchema = new mongoose.Schema(
  {
    preferredPincode: {
      type: String,
      trim: true,
      match: [/^\d{6}$/, 'Please enter a valid 6-digit pincode']
    },
    availableHours: {
      type: String,
      trim: true,
      maxlength: 80
    }
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    role: {
      type: String,
      enum: ['donor', 'volunteer', 'ngo', 'admin'],
      default: 'donor'
    },
    phone: { type: String, trim: true, maxlength: 15 },
    organizationName: { type: String, trim: true, maxlength: 100 },
    // Embedded one-to-one data: only volunteers need these extra details.
    volunteerProfile: volunteerProfileSchema
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
