const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');

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

module.exports = {
  getAllUsers,
  createUser,
  updateUser,
  updateUserPassword,
  deleteUser,
};
