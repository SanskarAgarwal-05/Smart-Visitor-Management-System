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
    // Audit fields
    registeredBy: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
      name: { type: String, default: '' },
      role: { type: String, default: '' }
    },
    registeredAt: {
      type: Date,
      default: Date.now
    },
    approvedBy: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
      name: { type: String, default: '' },
      role: { type: String, default: '' }
    },
    approvedAt: {
      type: Date
    },
    rejectedBy: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
      name: { type: String, default: '' },
      role: { type: String, default: '' }
    },
    rejectedAt: {
      type: Date
    },
    checkedInBy: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
      name: { type: String, default: '' },
      role: { type: String, default: '' }
    },
    checkedInAt: {
      type: Date
    },
    checkedOutBy: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
      name: { type: String, default: '' },
      role: { type: String, default: '' }
    },
    checkedOutAt: {
      type: Date
    },
    isSuspicious: {
      type: Boolean,
      default: false
    },
    suspiciousAlerts: {
      type: [String],
      default: []
    },
    suspiciousAlertTimestamp: {
      type: Date
    },
    suspiciousAlertsDetail: [
      {
        text: { type: String, required: true },
        status: { type: String, enum: ['active', 'dismissed', 'resolved'], default: 'active' },
        timestamp: { type: Date, default: Date.now },
        dismissedBy: {
          id: { type: String },
          name: { type: String }
        },
        dismissedAt: { type: Date }
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model('Visitor', visitorSchema);
