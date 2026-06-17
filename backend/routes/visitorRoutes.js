const express = require('express');
const {
  createVisitor,
  getAllVisitors,
  getVisitorById,
  updateVisitor,
  deleteVisitor,
} = require('../controllers/visitorController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Protect all visitor routes using authMiddleware
router.use(authMiddleware);

router.post('/', createVisitor);
router.get('/', getAllVisitors);
router.get('/:id', getVisitorById);
router.put('/:id', updateVisitor);
router.delete('/:id', deleteVisitor);

module.exports = router;
