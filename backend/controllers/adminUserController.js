const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const Visitor = require('../models/Visitor');

// 1. Get All Users
const getAllUsers = async (req, res) => {
  try {
    const users = await Admin.find().select('-password').sort({ createdAt: -1 });
    res.json({
      success: true,
      users,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Create User
const createUser = async (req, res) => {
  try {
    const { email, password, fullName, role, status } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ success: false, message: 'Please provide email, password, and role' });
    }

    const existingUser = await Admin.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'A user with this email already exists' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await Admin.create({
      fullName: fullName || '',
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
      status: status || 'active',
      lastUpdatedBy: req.admin.email,
    });

    const returnedUser = newUser.toObject();
    delete returnedUser.password;

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: returnedUser,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Edit User Details
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, fullName, role, status } = req.body;

    const user = await Admin.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (email && email.toLowerCase() !== user.email) {
      const emailExists = await Admin.findOne({ email: email.toLowerCase() });
      if (emailExists) {
        return res.status(400).json({ success: false, message: 'Email already in use by another account' });
      }
      user.email = email.toLowerCase();
    }

    if (fullName !== undefined) user.fullName = fullName;
    if (role !== undefined) user.role = role;
    if (status !== undefined) user.status = status;
    
    // Audit log
    user.lastUpdatedBy = req.admin.email;

    await user.save();

    const returnedUser = user.toObject();
    delete returnedUser.password;

    res.json({
      success: true,
      message: 'User details updated successfully',
      user: returnedUser,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 4. Change User Password
const updateUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { password, confirmPassword } = req.body;

    if (!password || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'Please provide new password and confirm password' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const user = await Admin.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.password = await bcrypt.hash(password, 10);
    user.lastUpdatedBy = req.admin.email;

    await user.save();

    res.json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 5. Delete User
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent self-deletion
    if (id === req.admin._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own admin account' });
    }

    const user = await Admin.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await Admin.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'User account deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Helpers for Reports Generation
const getSettingsThreshold = async () => {
  const admin = await Admin.findOne();
  return admin && admin.visitorTimeLimit ? admin.visitorTimeLimit : 4;
};

const escapeCSVValue = (val) => {
  if (val === null || val === undefined) return '';
  let str = '';
  if (val instanceof Date) {
    str = val.toISOString();
  } else {
    str = String(val);
  }
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    str = '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
};

const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return isNaN(d.getTime()) ? '' : d.toISOString();
};

const getFormattedDate = (date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}_${mm}_${dd}`;
};

const generateCSV = (visitors, thresholdHours) => {
  const headers = [
    'Visitor ID',
    'Full Name',
    'Phone Number',
    'Email',
    'Purpose Of Visit',
    'Person To Meet',
    'Status',
    'Check In Time',
    'Check Out Time',
    'Registered By',
    'Approved By',
    'Rejected By',
    'Checked In By',
    'Checked Out By',
    'Suspicious Status',
    'Overstay Status',
    'Created At'
  ];
  
  let csvContent = headers.join(',') + '\n';
  
  for (const v of visitors) {
    let isOverstayed = false;
    if (v.status === 'approved' || v.status === 'checked-out') {
      const checkIn = new Date(v.checkInTime || v.checkedInAt || v.createdAt);
      const end = v.status === 'checked-out' && v.checkOutTime 
        ? new Date(v.checkOutTime) 
        : new Date();
      const durationMs = end - checkIn;
      const thresholdMs = thresholdHours * 60 * 60 * 1000;
      if (durationMs > thresholdMs && v.status === 'approved') {
        isOverstayed = true;
      }
    }

    const row = [
      escapeCSVValue(v.visitorId),
      escapeCSVValue(v.fullName),
      escapeCSVValue(v.phoneNumber),
      escapeCSVValue(v.email),
      escapeCSVValue(v.purposeOfVisit),
      escapeCSVValue(v.personToMeet),
      escapeCSVValue(v.status),
      escapeCSVValue(formatDate(v.checkInTime)),
      escapeCSVValue(formatDate(v.checkOutTime)),
      escapeCSVValue(v.registeredBy?.name),
      escapeCSVValue(v.approvedBy?.name),
      escapeCSVValue(v.rejectedBy?.name),
      escapeCSVValue(v.checkedInBy?.name),
      escapeCSVValue(v.checkedOutBy?.name),
      escapeCSVValue(v.isSuspicious ? 'Yes' : 'No'),
      escapeCSVValue(isOverstayed ? 'Yes' : 'No'),
      escapeCSVValue(formatDate(v.createdAt))
    ];
    csvContent += row.join(',') + '\n';
  }
  
  return csvContent;
};

// 6. Export Daily Report
const exportDailyReport = async (req, res) => {
  try {
    const thresholdHours = await getSettingsThreshold();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const visitors = await Visitor.find({
      createdAt: { $gte: startOfToday, $lte: endOfToday }
    }).sort({ createdAt: -1 });

    const csvContent = generateCSV(visitors, thresholdHours);
    const dateStr = getFormattedDate(new Date());
    const filename = `daily_report_${dateStr}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    return res.status(200).send(csvContent);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 7. Export Weekly Report
const exportWeeklyReport = async (req, res) => {
  try {
    const thresholdHours = await getSettingsThreshold();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const visitors = await Visitor.find({
      createdAt: { $gte: sevenDaysAgo }
    }).sort({ createdAt: -1 });

    const csvContent = generateCSV(visitors, thresholdHours);
    const dateStr = getFormattedDate(new Date());
    const filename = `weekly_report_${dateStr}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    return res.status(200).send(csvContent);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 8. Export Historical Report
const exportHistoricalReport = async (req, res) => {
  try {
    const thresholdHours = await getSettingsThreshold();
    const visitors = await Visitor.find().sort({ createdAt: -1 });

    const csvContent = generateCSV(visitors, thresholdHours);
    const dateStr = getFormattedDate(new Date());
    const filename = `historical_logs_${dateStr}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    return res.status(200).send(csvContent);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAllUsers,
  createUser,
  updateUser,
  updateUserPassword,
  deleteUser,
  exportDailyReport,
  exportWeeklyReport,
  exportHistoricalReport,
};
