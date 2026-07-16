const mongoose = require('mongoose');
const Visitor = require('../models/Visitor');
const Admin = require('../models/Admin');
const generateVisitorId = require('../utils/visitorIdGenerator');

// Helpers for Visitor Overstay calculation
const getSettingsThreshold = async () => {
  const admin = await Admin.findOne();
  return admin && admin.visitorTimeLimit ? admin.visitorTimeLimit : 4;
};

const updateAlertsForVisitor = async (visitor, newAlertTexts) => {
  const now = new Date();
  
  if (!visitor.suspiciousAlertsDetail) {
    visitor.suspiciousAlertsDetail = [];
  }
  
  // 1. Mark existing active/dismissed alerts as resolved if they are NOT in newAlertTexts
  for (const alert of visitor.suspiciousAlertsDetail) {
    if (alert.status !== 'resolved' && !newAlertTexts.includes(alert.text)) {
      alert.status = 'resolved';
    }
  }
  
  // 2. Add or update new alerts
  for (const text of newAlertTexts) {
    const existing = visitor.suspiciousAlertsDetail.find(a => a.text === text);
    if (existing) {
      if (existing.status === 'resolved') {
        existing.status = 'active';
        existing.timestamp = now;
      }
    } else {
      visitor.suspiciousAlertsDetail.push({
        text,
        status: 'active',
        timestamp: now
      });
    }
  }
  
  // 3. Sync suspiciousAlerts array and isSuspicious flag (only active alerts visible externally)
  const activeAlerts = visitor.suspiciousAlertsDetail.filter(a => a.status === 'active');
  visitor.suspiciousAlerts = activeAlerts.map(a => a.text);
  visitor.isSuspicious = activeAlerts.length > 0;
  
  if (activeAlerts.length > 0) {
    visitor.suspiciousAlertTimestamp = visitor.suspiciousAlertTimestamp || now;
  } else {
    visitor.suspiciousAlertTimestamp = undefined;
  }
  
  await visitor.save();
};

const syncSuspiciousAlertsForPhone = async (phoneNumber) => {
  if (!phoneNumber) return;
  const visitors = await Visitor.find({ phoneNumber });
  
  const distinctNamesMap = new Map();
  visitors.forEach(v => {
    if (v.fullName) {
      const trimmed = v.fullName.trim();
      const normalized = trimmed.toLowerCase().replace(/\s+/g, ' ');
      if (!distinctNamesMap.has(normalized)) {
        distinctNamesMap.set(normalized, trimmed);
      }
    }
  });
  const distinctNames = [...distinctNamesMap.values()];
  
  if (distinctNames.length > 1) {
    const namesList = distinctNames.map(name => `* ${name}`).join('\n');
    const alertText = `Phone number ${phoneNumber} is associated with multiple visitor identities:\n${namesList}`;
    
    for (const v of visitors) {
      const otherAlerts = v.suspiciousAlertsDetail
        ? v.suspiciousAlertsDetail.filter(a => a.status !== 'resolved' && !a.text.includes('associated with multiple visitor identities')).map(a => a.text)
        : [];
      await updateAlertsForVisitor(v, [...otherAlerts, alertText]);
    }
  } else {
    for (const v of visitors) {
      const otherAlerts = v.suspiciousAlertsDetail
        ? v.suspiciousAlertsDetail.filter(a => a.status !== 'resolved' && !a.text.includes('associated with multiple visitor identities')).map(a => a.text)
        : [];
      await updateAlertsForVisitor(v, otherAlerts);
    }
  }
};

const getLocalHour = (date) => {
  const tz = process.env.TZ || 'Asia/Kolkata';
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: 'numeric',
      hour12: false
    });
    return parseInt(formatter.format(date), 10);
  } catch (e) {
    return date.getHours();
  }
};

const detectSuspiciousActivity = async (visitor, allVisitors = []) => {
  const alerts = [];
  const phone = visitor.phoneNumber;
  const regTime = new Date(visitor.createdAt || visitor.registeredAt || visitor.checkInTime || Date.now());

  if (!phone) return alerts;

  // 1. Multiple Rejections (3 or more times within 24 hours)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const rejections = allVisitors.length > 0 
    ? allVisitors.filter(v => 
        v.phoneNumber === phone && 
        v.status === 'rejected' && 
        new Date(v.createdAt || v.registeredAt || v.checkInTime) >= oneDayAgo
      )
    : await Visitor.find({
        phoneNumber: phone,
        status: 'rejected',
        createdAt: { $gte: oneDayAgo }
      });

  if (rejections.length >= 3) {
    alerts.push('Multiple Rejections: Rejected 3 or more times within 24 hours');
  }

  // 2. Multiple Visits (registers more than 5 times in one day / last 24h)
  const visits = allVisitors.length > 0
    ? allVisitors.filter(v => 
        v.phoneNumber === phone && 
        new Date(v.createdAt || v.registeredAt || v.checkInTime) >= oneDayAgo
      )
    : await Visitor.find({
        phoneNumber: phone,
        createdAt: { $gte: oneDayAgo }
      });

  if (visits.length > 5) {
    alerts.push('Multiple Visits: Registered more than 5 times in 24 hours');
  }

  // 4. Out of Hours Registration (outside 8 AM to 8 PM)
  const hour = getLocalHour(regTime);
  if (hour < 8 || hour >= 20) {
    const timeString = regTime.toLocaleTimeString('en-US', {
      timeZone: process.env.TZ || 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    alerts.push(`Out of Hours Registration: Registered at ${timeString} (Office hours: 8 AM - 8 PM)`);
  }

  return alerts;
};

const enrichVisitor = async (visitor, thresholdHours, allVisitors = []) => {
  const visitorObj = visitor.toObject ? visitor.toObject() : visitor;

  if (visitorObj.status === 'approved' || visitorObj.status === 'checked-out') {
    const checkIn = new Date(visitorObj.checkInTime || visitorObj.checkedInAt || visitorObj.createdAt);
    const end = visitorObj.status === 'checked-out' && visitorObj.checkOutTime 
      ? new Date(visitorObj.checkOutTime) 
      : new Date();
      
    const durationMs = end - checkIn;
    const thresholdMs = thresholdHours * 60 * 60 * 1000;

    // 1. Calculate Current/Spent Duration (capitalized casing)
    const totalDurationMinutes = Math.max(0, Math.floor(durationMs / 60000));
    const dHours = Math.floor(totalDurationMinutes / 60);
    const dMinutes = totalDurationMinutes % 60;
    let dStr = '';
    if (dHours > 0) {
      dStr += `${dHours} Hour${dHours > 1 ? 's' : ''}`;
    }
    if (dMinutes > 0 || dStr === '') {
      if (dStr) dStr += ' ';
      dStr += `${dMinutes} Minute${dMinutes > 1 ? 's' : ''}`;
    }
    visitorObj.currentDuration = dStr;

    // 2. Calculate Overstay Duration (capitalized casing)
    const overstayMs = durationMs - thresholdMs;
    if (overstayMs > 0) {
      const totalOverstayMinutes = Math.floor(overstayMs / 60000);
      const oHours = Math.floor(totalOverstayMinutes / 60);
      const oMinutes = totalOverstayMinutes % 60;
      let oStr = '';
      if (oHours > 0) {
        oStr += `${oHours} Hour${oHours > 1 ? 's' : ''}`;
      }
      if (oMinutes > 0 || oStr === '') {
        if (oStr) oStr += ' ';
        oStr += `${oMinutes} Minute${oMinutes > 1 ? 's' : ''}`;
      }
      visitorObj.overstayDuration = oStr;
      visitorObj.overstayDurationMinutes = totalOverstayMinutes;

      // Only mark as currently overstayed if the visitor is still checked in (status approved)
      if (visitorObj.status === 'approved') {
        visitorObj.isOverstayed = true;
      } else {
        visitorObj.isOverstayed = false;
      }
    } else {
      visitorObj.isOverstayed = false;
      visitorObj.overstayDuration = '0 Minutes';
      visitorObj.overstayDurationMinutes = 0;
    }
  } else {
    visitorObj.isOverstayed = false;
    visitorObj.currentDuration = '0 Minutes';
    visitorObj.overstayDuration = '0 Minutes';
  }

  // 3. Detect Suspicious Activity and Sync
  const dynamicAlerts = await detectSuspiciousActivity(visitor, allVisitors);
  const currentDbAlerts = visitor.suspiciousAlertsDetail 
    ? visitor.suspiciousAlertsDetail.filter(a => a.status !== 'resolved').map(a => a.text)
    : [];
  
  const phoneAlert = currentDbAlerts.find(a => a.includes('associated with multiple visitor identities'));
  const expectedAlerts = [...dynamicAlerts];
  if (phoneAlert) {
    expectedAlerts.push(phoneAlert);
  }
  
  const setExpected = new Set(expectedAlerts);
  const setCurrent = new Set(currentDbAlerts);
  let needsSync = setExpected.size !== setCurrent.size;
  if (!needsSync) {
    for (const a of expectedAlerts) {
      if (!setCurrent.has(a)) {
        needsSync = true;
        break;
      }
    }
  }
  
  if (needsSync) {
    await updateAlertsForVisitor(visitor, expectedAlerts);
    visitorObj.suspiciousAlertsDetail = visitor.suspiciousAlertsDetail;
    visitorObj.suspiciousAlerts = visitor.suspiciousAlerts;
    visitorObj.isSuspicious = visitor.isSuspicious;
    visitorObj.suspiciousAlertTimestamp = visitor.suspiciousAlertTimestamp;
  } else {
    const activeAlerts = (visitor.suspiciousAlertsDetail || []).filter(a => a.status === 'active');
    visitorObj.suspiciousAlerts = activeAlerts.map(a => a.text);
    visitorObj.isSuspicious = activeAlerts.length > 0;
    visitorObj.suspiciousAlertsDetail = visitor.suspiciousAlertsDetail;
  }

  return visitorObj;
};

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

    const registeredBy = {
      id: req.admin._id,
      name: req.admin.fullName || req.admin.email,
      role: req.admin.role || 'admin',
    };
    const registeredAt = new Date();

    const visitor = await Visitor.create({
      visitorId,
      fullName,
      phoneNumber,
      email,
      purposeOfVisit,
      personToMeet,
      status: status || 'pending',
      registeredBy,
      registeredAt,
    });

    if (visitor.status === 'approved') {
      visitor.approvedBy = registeredBy;
      visitor.approvedAt = registeredAt;
      visitor.checkedInBy = registeredBy;
      visitor.checkedInAt = registeredAt;
      await visitor.save();
    }

    // Sync phone duplicate alerts
    await syncSuspiciousAlertsForPhone(phoneNumber);

    const thresholdHours = await getSettingsThreshold();
    const allVisitors = await Visitor.find();
    // Reload visitor from DB to fetch new alert field value
    const updatedVisitor = await Visitor.findById(visitor._id);
    const enriched = await enrichVisitor(updatedVisitor, thresholdHours, allVisitors);

    res.status(201).json({
      success: true,
      message: 'Visitor registered successfully',
      visitor: enriched,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Get All Visitors
const getAllVisitors = async (req, res) => {
  try {
    const thresholdHours = await getSettingsThreshold();
    const visitors = await Visitor.find().sort({ createdAt: -1 });
    const enrichedVisitors = await Promise.all(
      visitors.map(v => enrichVisitor(v, thresholdHours, visitors))
    );
    res.json({
      success: true,
      count: enrichedVisitors.length,
      visitors: enrichedVisitors,
      visitorTimeLimit: thresholdHours,
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

    const thresholdHours = await getSettingsThreshold();
    const allVisitors = await Visitor.find();
    const enriched = await enrichVisitor(visitor, thresholdHours, allVisitors);

    res.json({
      success: true,
      visitor: enriched,
      visitorTimeLimit: thresholdHours,
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

    const activeUser = {
      id: req.admin._id,
      name: req.admin.fullName || req.admin.email,
      role: req.admin.role || 'admin',
    };
    const now = new Date();

    // Check status changes
    if (updateData.status && updateData.status !== visitor.status) {
      const oldStatus = visitor.status;
      const newStatus = updateData.status;

      if (newStatus === 'approved') {
        visitor.approvedBy = activeUser;
        visitor.approvedAt = now;
        visitor.checkedInBy = activeUser;
        visitor.checkedInAt = now;
        visitor.checkInTime = now;
        visitor.status = 'approved';
      } else if (newStatus === 'rejected') {
        visitor.rejectedBy = activeUser;
        visitor.rejectedAt = now;
        visitor.status = 'rejected';
      } else if (newStatus === 'checked-out') {
        visitor.checkedOutBy = activeUser;
        visitor.checkedOutAt = now;
        visitor.checkOutTime = now;
        visitor.status = 'checked-out';
      } else {
        visitor.status = newStatus;
      }
    }

    const oldPhoneNumber = visitor.phoneNumber;

    // Apply any other update fields
    const allowedUpdates = ['fullName', 'phoneNumber', 'email', 'purposeOfVisit', 'personToMeet'];
    allowedUpdates.forEach(field => {
      if (updateData[field] !== undefined) {
        visitor[field] = updateData[field];
      }
    });

    await visitor.save();

    // Re-evaluate suspicious alerts for the old and new numbers
    if (oldPhoneNumber !== visitor.phoneNumber) {
      await syncSuspiciousAlertsForPhone(oldPhoneNumber);
    }
    await syncSuspiciousAlertsForPhone(visitor.phoneNumber);

    const thresholdHours = await getSettingsThreshold();
    const allVisitors = await Visitor.find();
    // Reload updated visitor document
    const updatedVisitor = await Visitor.findById(visitor._id);
    const enriched = await enrichVisitor(updatedVisitor, thresholdHours, allVisitors);

    res.json({
      success: true,
      message: 'Visitor updated successfully',
      visitor: enriched,
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

    // Sync phone duplicates after deletion
    await syncSuspiciousAlertsForPhone(visitor.phoneNumber);

    res.json({
      success: true,
      message: 'Visitor deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 6. Dismiss Visitor Alert
const dismissVisitorAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const { alertText } = req.body;

    if (!alertText) {
      return res.status(400).json({ success: false, message: 'alertText is required' });
    }

    if (req.admin.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only Admin users can dismiss alerts.' });
    }

    let visitor;
    if (mongoose.Types.ObjectId.isValid(id)) {
      visitor = await Visitor.findById(id);
    }
    if (!visitor) {
      visitor = await Visitor.findOne({ visitorId: id });
    }

    if (!visitor) {
      return res.status(404).json({ success: false, message: 'Visitor not found' });
    }

    let alertFound = false;
    if (visitor.suspiciousAlertsDetail) {
      const alert = visitor.suspiciousAlertsDetail.find(a => {
        const dbNorm = a.text.replace(/\r\n/g, '\n').trim();
        const reqNorm = alertText.replace(/\r\n/g, '\n').trim();
        return dbNorm === reqNorm && a.status === 'active';
      });
      
      if (alert) {
        alert.status = 'dismissed';
        alert.dismissedBy = {
          id: req.admin._id.toString(),
          name: req.admin.fullName || req.admin.email
        };
        alert.dismissedAt = new Date();
        await visitor.save();
        alertFound = true;
      }
    }

    if (!alertFound) {
      return res.status(400).json({
        success: false,
        message: 'No matching active suspicious alert found to dismiss.'
      });
    }

    const thresholdHours = await getSettingsThreshold();
    const allVisitors = await Visitor.find();
    const enriched = await enrichVisitor(visitor, thresholdHours, allVisitors);

    res.json({
      success: true,
      message: 'Alert dismissed successfully',
      visitor: enriched,
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
  dismissVisitorAlert,
};
