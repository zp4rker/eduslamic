const express = require('express');
const router = express.Router();
const Class = require('../../models/Class'); // Corrected path
const Student = require('../../models/Student'); // Corrected path
const { User, ROLES } = require('../../models/User'); // Corrected path
const StudentClass = require('../../models/StudentClass'); // Corrected path
const { isAuthenticated, isAdmin } = require('../../middleware/auth'); // Corrected path

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
 * GET route to display the edit class page - Admin only
 * GET /classes/edit/:id
 */
router.get('/edit/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const classId = req.params.id;
    const classObj = await Class.findById(classId);

    if (!classObj) {
      req.session.error = 'Class not found.';
      return res.redirect('/admin/classes');
    }

    const teachers = await User.findByRole(ROLES.TEACHER);
    const error = req.session.error; // Get potential error from previous attempt
    const values = req.session.values; // Get potential values from previous attempt
    req.session.error = null; // Clear session error
    req.session.values = null; // Clear session values

    res.render('admin/classes/edit', {
      user: req.session.user,
      classObj,
      teachers,
      error,
      values: values || {} // Pass values or empty object
    });
  } catch (error) {
    console.error('Error fetching class for edit:', error);
    req.session.error = 'Failed to load class for editing.';
    res.redirect('/admin/classes');
  }
});

/**
 * Update class details - Admin only
 * POST /classes/edit/:id
 */
router.post('/edit/:id', isAuthenticated, isAdmin, async (req, res) => {
  const classId = req.params.id;
  const { name, description, teacherId } = req.body;
  try {
    // Basic validation
    if (!name) {
      req.session.error = 'Class name is required.';
      req.session.values = req.body; // Store submitted values in session
      return res.redirect(`/admin/classes/edit/${classId}`); // Redirect back to edit page
    }

    // Prepare update data
    const updateData = {
      name,
      description: description || '',
      teacherId: teacherId || null
    };

    const updated = await Class.update(classId, updateData);

    if (updated) {
      req.session.success = 'Class updated successfully';
      res.redirect('/admin/classes'); // Redirect to index on success
    } else {
      req.session.error = 'Failed to update class. Class not found or no changes made.';
      req.session.values = req.body; // Store submitted values in session
      res.redirect(`/admin/classes/edit/${classId}`); // Redirect back to edit page
    }

  } catch (error) {
    console.error('Error updating class:', error);
    req.session.error = error.message || 'Failed to update class';
    req.session.values = req.body; // Store submitted values in session
    res.redirect(`/admin/classes/edit/${classId}`); // Redirect back to edit page on error
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

// --- NEW: API endpoint to get class details for view modal ---
/**
 * Get class details (for modal) - Admin only
 * GET /classes/api/details/:id
 */
router.get('/api/details/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const classId = req.params.id;
    const classObj = await Class.findById(classId);

    if (!classObj) {
      return res.status(404).json({ error: 'Class not found' });
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

    res.json({ classObj, students });
  } catch (error) {
    console.error('Error fetching class details for modal:', error);
    res.status(500).json({ error: 'Failed to fetch class details' });
  }
});

// --- NEW: API endpoint to get data for manage students modal ---
/**
 * Get data for managing students in class (for modal) - Admin only
 * GET /classes/api/manage/:id
 */
router.get('/api/manage/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const classId = req.params.id;
    const classObj = await Class.findById(classId);

    if (!classObj) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Get all students
    const allStudents = await Student.findAll();

    // Get students currently enrolled in this class
    const enrolledStudentIds = await StudentClass.findStudentsByClass(classId);

    res.json({ classObj, allStudents, enrolledStudentIds });
  } catch (error) {
    console.error('Error fetching data for manage students modal:', error);
    res.status(500).json({ error: 'Failed to fetch data for managing students' });
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
    // --- UPDATED: Redirect back to the main classes list ---
    res.redirect(`/admin/classes`);
  } catch (error) {
    console.error('Error updating students in class:', error);
    // --- UPDATED: Redirect back to the main classes list with error ---
    req.session.error = error.message || 'Failed to update students';
    res.redirect(`/admin/classes`);
  }
});

module.exports = router;