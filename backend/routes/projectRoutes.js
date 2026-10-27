const express = require('express');
const router = express.Router();
const {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject
} = require('../controllers/projectController');
const { protect, authorize } = require('../middleware/auth');

// Public/authenticated reading
router.get('/', getProjects);
router.get('/:id', getProject);

// Admin-only management
router.post('/', protect, authorize('admin', 'accounts'), createProject);
router.put('/:id', protect, authorize('admin', 'accounts'), updateProject);
router.delete('/:id', protect, authorize('admin'), deleteProject);

module.exports = router;
