const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema(
  {
    visitorId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    purposeOfVisit: {
      type: String,
      required: true,
      trim: true,
    },
    personToMeet: {
      type: String,
      required: true,
      trim: true,
    },
    checkInTime: {
      type: Date,
      default: Date.now,
    },
    checkOutTime: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'checked-out'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Visitor', visitorSchema);
