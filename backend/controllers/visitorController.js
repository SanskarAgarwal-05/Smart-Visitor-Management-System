const mongoose = require('mongoose');
const Visitor = require('../models/Visitor');
const generateVisitorId = require('../utils/visitorIdGenerator');

// 1. Create Visitor
const createVisitor = async (req, res) => {
  try {
    const { fullName, phoneNumber, email, purposeOfVisit, personToMeet, status } = req.body;

    if (!fullName || !phoneNumber || !purposeOfVisit || !personToMeet) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: fullName, phoneNumber, purposeOfVisit, and personToMeet',
      });
    }

    const visitorId = await generateVisitorId();

    const visitor = await Visitor.create({
      visitorId,
      fullName,
      phoneNumber,
      email,
      purposeOfVisit,
      personToMeet,
      status: status || 'pending',
    });

    res.status(201).json({
      success: true,
      message: 'Visitor registered successfully',
      visitor,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Get All Visitors
const getAllVisitors = async (req, res) => {
  try {
    const visitors = await Visitor.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      count: visitors.length,
      visitors,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Get Visitor by ID (MongoDB _id or custom visitorId)
const getVisitorById = async (req, res) => {
  try {
    const { id } = req.params;
    let visitor;

    if (mongoose.Types.ObjectId.isValid(id)) {
      visitor = await Visitor.findById(id);
    }

    if (!visitor) {
      visitor = await Visitor.findOne({ visitorId: id });
    }

    if (!visitor) {
      return res.status(404).json({
        success: false,
        message: 'Visitor not found',
      });
    }

    res.json({
      success: true,
      visitor,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 4. Update Visitor
const updateVisitor = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Find visitor first
    let visitor;
    if (mongoose.Types.ObjectId.isValid(id)) {
      visitor = await Visitor.findById(id);
    }
    if (!visitor) {
      visitor = await Visitor.findOne({ visitorId: id });
    }

    if (!visitor) {
      return res.status(404).json({
        success: false,
        message: 'Visitor not found',
      });
    }

    // Automatically set checkOutTime if status is updated to 'checked-out'
    if (updateData.status === 'checked-out' && visitor.status !== 'checked-out') {
      updateData.checkOutTime = new Date();
    }

    const updatedVisitor = await Visitor.findByIdAndUpdate(
      visitor._id,
      updateData,
      { returnDocument: 'after', runValidators: true }
    );

    res.json({
      success: true,
      message: 'Visitor updated successfully',
      visitor: updatedVisitor,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 5. Delete Visitor
const deleteVisitor = async (req, res) => {
  try {
    const { id } = req.params;

    let visitor;
    if (mongoose.Types.ObjectId.isValid(id)) {
      visitor = await Visitor.findById(id);
    }
    if (!visitor) {
      visitor = await Visitor.findOne({ visitorId: id });
    }

    if (!visitor) {
      return res.status(404).json({
        success: false,
        message: 'Visitor not found',
      });
    }

    await Visitor.findByIdAndDelete(visitor._id);

    res.json({
      success: true,
      message: 'Visitor deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createVisitor,
  getAllVisitors,
  getVisitorById,
  updateVisitor,
  deleteVisitor,
};
