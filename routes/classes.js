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
    
    res.render('classes/index', { 
      user: req.session.user, 
      classes,
      success: req.query.success,
      error: req.query.error
    });
  } catch (error) {
    console.error('Error fetching classes:', error);
    res.render('classes/index', { 
      user: req.session.user, 
      classes: [],
      error: 'Failed to load classes'
    });
  }
});

/**
 * Show class create form - Admin only
 * GET /classes/create
 */
router.get('/create', isAuthenticated, isAdmin, async (req, res) => {
  try {
    // Get all teachers
    const teachers = await User.findByRole(ROLES.TEACHER);
    
    res.render('classes/create', { 
      user: req.session.user, 
      teachers,
      values: {},
      error: null
    });
  } catch (error) {
    console.error('Error loading create class form:', error);
    res.redirect('/classes?error=Failed to load create form');
  }
});

/**
 * Create new class - Admin only
 * POST /classes/create
 */
router.post('/create', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { name, description, teacherId } = req.body;
    
    // Validate inputs
    if (!name) {
      // Get all teachers again for form re-render
      const teachers = await User.findByRole(ROLES.TEACHER);
      
      return res.render('classes/create', {
        user: req.session.user,
        teachers,
        values: req.body,
        error: 'Class name is required'
      });
    }
    
    // Create class
    await Class.create({
      name,
      description,
      teacherId: teacherId || null
    });
    
    req.session.success = 'Class created successfully';
    res.redirect('/classes');
  } catch (error) {
    console.error('Error creating class:', error);
    res.redirect('/classes/create?error=' + encodeURIComponent(error.message));
  }
});

/**
 * Show class edit form - Admin only
 * GET /classes/edit/:id
 */
router.get('/edit/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const classId = req.params.id;
    const classObj = await Class.findById(classId);
    
    if (!classObj) {
      return res.redirect('/classes?error=Class not found');
    }
    
    // Get all teachers
    const teachers = await User.findByRole(ROLES.TEACHER);
    
    res.render('classes/edit', {
      user: req.session.user,
      classObj,
      teachers,
      error: req.query.error
    });
  } catch (error) {
    console.error('Error loading edit class form:', error);
    res.redirect('/classes?error=' + encodeURIComponent(error.message));
  }
});

/**
 * Update class - Admin only
 * POST /classes/edit/:id
 */
router.post('/edit/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const classId = req.params.id;
    const { name, description, teacherId } = req.body;
    
    // Validate inputs
    if (!name) {
      return res.redirect(`/classes/edit/${classId}?error=Class name is required`);
    }
    
    // Update class
    await Class.update(classId, { 
      name, 
      description, 
      teacherId: teacherId || null 
    });
    
    req.session.success = 'Class updated successfully';
    res.redirect('/classes');
  } catch (error) {
    console.error('Error updating class:', error);
    res.redirect(`/classes/edit/${req.params.id}?error=${encodeURIComponent(error.message)}`);
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
    res.redirect('/classes');
  } catch (error) {
    console.error('Error deleting class:', error);
    req.session.error = error.message || 'Failed to delete class';
    res.redirect('/classes');
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
      return res.redirect('/classes?error=Class not found');
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
    
    res.render('classes/view', {
      user: req.session.user,
      classObj,
      students,
      success: req.query.success,
      error: req.query.error
    });
  } catch (error) {
    console.error('Error viewing class:', error);
    res.redirect('/classes?error=' + encodeURIComponent(error.message));
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
      return res.redirect('/classes?error=Class not found');
    }
    
    // Get all students
    const allStudents = await Student.findAll();
    
    // Get students in this class
    const enrolledStudentIds = await StudentClass.findStudentsByClass(classId);
    
    res.render('classes/manage-students', {
      user: req.session.user,
      classObj,
      allStudents,
      enrolledStudentIds,
      success: req.query.success,
      error: req.query.error
    });
  } catch (error) {
    console.error('Error loading manage students form:', error);
    res.redirect('/classes?error=' + encodeURIComponent(error.message));
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
    res.redirect(`/classes/view/${classId}`);
  } catch (error) {
    console.error('Error updating students in class:', error);
    res.redirect(`/classes/${req.params.id}/students?error=${encodeURIComponent(error.message)}`);
  }
});

module.exports = router;