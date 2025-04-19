const express = require('express');
const router = express.Router();
const Class = require('../models/Class');
const Student = require('../models/Student');
const { User, ROLES } = require('../models/User');
const StudentClass = require('../models/StudentClass');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

/**
 * Get all classes - Admin only
 * GET /classes
 */
router.get('/', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const classes = await Class.findAll();
    
    // Get teacher info for each class
    for (const classObj of classes) {
      if (classObj.teacherId) {
        const teacher = await User.findById(classObj.teacherId);
        classObj.teacherName = teacher ? teacher.name : 'Unknown';
      } else {
        classObj.teacherName = 'Not Assigned';
      }
    }
    
    // Get all teachers for the class creation modal
    const teachers = await User.findByRole(ROLES.TEACHER);
    
    // Get success/error messages from session
    const success = req.session.success || req.query.success;
    const error = req.session.error || req.query.error;
    
    // Clear session messages after retrieving them
    req.session.success = null;
    req.session.error = null;
    
    res.render('admin/classes/index', { 
      user: req.session.user, 
      classes,
      teachers,
      values: {},
      success,
      error
    });
  } catch (error) {
    console.error('Error fetching classes:', error);
    res.render('admin/classes/index', { 
      user: req.session.user, 
      classes: [],
      teachers: [],
      values: {},
      error: 'Failed to load classes'
    });
  }
});

/**
 * Create new class - Admin only
 * POST /classes/create
 */
router.post('/create', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { name, description, teacherId } = req.body;

    // Basic validation
    if (!name) {
      req.session.error = 'Class name is required.';
      req.session.values = req.body; // Pass back submitted values
      return res.redirect('/admin/classes');
    }

    // Create the class
    await Class.create({ 
      name,
      description: description || '', // Handle optional description
      teacherId: teacherId || null // Handle optional teacher
    });

    req.session.success = 'Class created successfully';
    res.redirect('/admin/classes');
  } catch (error) {
    console.error('Error creating class:', error);
    req.session.error = error.message || 'Failed to create class';
    req.session.values = req.body; // Pass back submitted values on error
    res.redirect('/admin/classes');
  }
});

/**
 * Delete class - Admin only
 * POST /classes/delete/:id
 */
router.post('/delete/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const classId = req.params.id;
    await Class.delete(classId);

    req.session.success = 'Class deleted successfully';
    res.redirect('/admin/classes');
  } catch (error) {
    console.error('Error deleting class:', error);
    req.session.error = error.message || 'Failed to delete class';
    res.redirect('/admin/classes');
  }
});

/**
 * View class details with students - Admin only
 * GET /classes/view/:id
 */
router.get('/view/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const classId = req.params.id;
    const classObj = await Class.findById(classId);
    
    if (!classObj) {
      return res.redirect('/admin/classes?error=Class not found');
    }
    
    // Get teacher info if assigned
    if (classObj.teacherId) {
      const teacher = await User.findById(classObj.teacherId);
      classObj.teacherName = teacher ? teacher.name : 'Unknown';
    } else {
      classObj.teacherName = 'Not Assigned';
    }
    
    // Get students in this class
    const students = await Student.findByClassId(classId);
    
    res.render('admin/classes/view', {
      user: req.session.user,
      classObj,
      students,
      success: req.query.success,
      error: req.query.error
    });
  } catch (error) {
    console.error('Error viewing class:', error);
    res.redirect('/admin/classes?error=' + encodeURIComponent(error.message));
  }
});

/**
 * Manage students in class form - Admin only
 * GET /classes/:id/students
 */
router.get('/:id/students', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const classId = req.params.id;
    const classObj = await Class.findById(classId);
    
    if (!classObj) {
      return res.redirect('/admin/classes?error=Class not found');
    }
    
    // Get all students
    const allStudents = await Student.findAll();
    
    // Get students in this class
    const enrolledStudentIds = await StudentClass.findStudentsByClass(classId);
    
    res.render('admin/classes/manage-students', {
      user: req.session.user,
      classObj,
      allStudents,
      enrolledStudentIds,
      success: req.query.success,
      error: req.query.error
    });
  } catch (error) {
    console.error('Error loading manage students form:', error);
    res.redirect('/admin/classes?error=' + encodeURIComponent(error.message));
  }
});

/**
 * Update students in class - Admin only
 * POST /classes/:id/students
 */
router.post('/:id/students', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const classId = req.params.id;
    const { studentIds } = req.body;
    
    // Get current students in class
    const currentStudentIds = await StudentClass.findStudentsByClass(classId);
    
    // Convert to array, handling case of no students selected
    const newStudentIds = studentIds ? (Array.isArray(studentIds) ? studentIds : [studentIds]) : [];
    
    // Remove students that were unselected
    for (const currentId of currentStudentIds) {
      if (!newStudentIds.includes(currentId)) {
        await Student.removeFromClass(currentId, classId);
      }
    }
    
    // Add newly selected students
    for (const newId of newStudentIds) {
      if (!currentStudentIds.includes(newId)) {
        await Student.enrollInClass(newId, classId);
      }
    }
    
    req.session.success = 'Students updated successfully';
    res.redirect(`/admin/classes/view/${classId}`);
  } catch (error) {
    console.error('Error updating students in class:', error);
    res.redirect(`/admin/classes/${req.params.id}/students?error=${encodeURIComponent(error.message)}`);
  }
});

module.exports = router;