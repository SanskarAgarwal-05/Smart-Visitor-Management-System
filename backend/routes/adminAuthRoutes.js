const express = require('express');
const {
  registerAdmin,
  loginAdmin,
  getAdminProfile,
  changeOwnPassword,
  updateOwnProfile,
} = require('../controllers/adminAuthController');
const {
  getAllUsers,
  createUser,
  updateUser,
  updateUserPassword,
  deleteUser,
} = require('../controllers/adminUserController');
const protect = require('../middleware/authMiddleware');

const router = express.Router();

// Role restriction check helper
const isAdmin = (req, res, next) => {
  if (req.admin && req.admin.role === 'admin') {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Access denied: Admin role required' });
  }
};

// Auth routes
router.post('/register', registerAdmin);
router.post('/login', loginAdmin);
router.get('/me', protect, getAdminProfile);
router.put('/profile', protect, updateOwnProfile);
router.put('/profile/password', protect, changeOwnPassword);

// User Management routes (Admin access only)
router.get('/users', protect, isAdmin, getAllUsers);
router.post('/users', protect, isAdmin, createUser);
router.put('/users/:id', protect, isAdmin, updateUser);
router.put('/users/:id/password', protect, isAdmin, updateUserPassword);
router.delete('/users/:id', protect, isAdmin, deleteUser);

module.exports = router;
