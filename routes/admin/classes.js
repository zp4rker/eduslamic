const express = require('express');
const router = express.Router();
const Class = require('../../models/Class');
const Student = require('../../models/Student');
const { User, ROLES } = require('../../models/User');
const StudentClass = require('../../models/StudentClass');
const { isAuthenticated, isAdmin } = require('../../middleware/auth');

/**
 * Get all classes - Admin only
 * GET /classes
 */
router.get('/', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const classes = await Class.findAll();
    
    for (const classObj of classes) {
      if (classObj.teacherId) {
        const teacher = await User.findById(classObj.teacherId);
        classObj.teacherName = teacher ? teacher.name : 'Unknown';
      } else {
        classObj.teacherName = 'Not Assigned';
      }
    }
    
    const teachers = await User.findByRole(ROLES.TEACHER);
    const success = req.session.success || req.query.success;
    const error = req.session.error || req.query.error;
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
 * GET route to display the add class page - Admin only
 * GET /classes/add
 */
router.get('/add', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const teachers = await User.findByRole(ROLES.TEACHER);
    const error = req.session.error;
    const values = req.session.values;
    req.session.error = null;
    req.session.values = null;

    res.render('admin/classes/add', {
      user: req.session.user,
      teachers,
      error,
      values: values || {}
    });
  } catch (error) {
    console.error('Error fetching data for add class page:', error);
    req.session.error = 'Failed to load page data.';
    res.redirect('/admin/classes');
  }
});

/**
 * Create new class - Admin only
 * POST /classes/create
 */
router.post('/create', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { name, description, teacherId } = req.body;

    if (!name) {
      req.session.error = 'Class name is required.';
      req.session.values = req.body;
      return res.redirect('/admin/classes/add');
    }

    await Class.create({ 
      name,
      description: description || '',
      teacherId: teacherId || null
    });

    req.session.success = 'Class created successfully';
    res.redirect('/admin/classes');
  } catch (error) {
    console.error('Error creating class:', error);
    req.session.error = error.message || 'Failed to create class';
    req.session.values = req.body;
    res.redirect('/admin/classes/add');
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
    const error = req.session.error;
    const values = req.session.values;
    req.session.error = null;
    req.session.values = null;

    res.render('admin/classes/edit', {
      user: req.session.user,
      classObj,
      teachers,
      error,
      values: values || {}
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
    if (!name) {
      req.session.error = 'Class name is required.';
      req.session.values = req.body;
      return res.redirect(`/admin/classes/edit/${classId}`);
    }

    const updateData = {
      name,
      description: description || '',
      teacherId: teacherId || null
    };

    const updated = await Class.update(classId, updateData);

    if (updated) {
      req.session.success = 'Class updated successfully';
      res.redirect('/admin/classes');
    } else {
      req.session.error = 'Failed to update class. Class not found or no changes made.';
      req.session.values = req.body;
      res.redirect(`/admin/classes/edit/${classId}`);
    }

  } catch (error) {
    console.error('Error updating class:', error);
    req.session.error = error.message || 'Failed to update class';
    req.session.values = req.body;
    res.redirect(`/admin/classes/edit/${classId}`);
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

    if (classObj.teacherId) {
      const teacher = await User.findById(classObj.teacherId);
      classObj.teacherName = teacher ? teacher.name : 'Unknown';
    } else {
      classObj.teacherName = 'Not Assigned';
    }

    const students = await Student.findByClassId(classId);

    res.json({ classObj, students });
  } catch (error) {
    console.error('Error fetching class details for modal:', error);
    res.status(500).json({ error: 'Failed to fetch class details' });
  }
});

/**
 * GET route to display the manage students page - Admin only
 * GET /classes/manage/:id
 */
router.get('/manage/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const classId = req.params.id;
    const classObj = await Class.findById(classId);

    if (!classObj) {
      req.session.error = 'Class not found.';
      return res.redirect('/admin/classes');
    }

    // Fetch IDs of enrolled students
    const enrolledStudentIds = await StudentClass.findStudentsByClass(classId);

    // Fetch full student objects for enrolled students
    const enrolledStudents = [];
    for (const studentId of enrolledStudentIds) {
      const student = await Student.findById(studentId);
      if (student) {
        enrolledStudents.push(student);
      }
    }

    const error = req.session.error;
    req.session.error = null;
    const success = req.session.success;
    req.session.success = null;

    res.render('admin/classes/manage-students', {
      user: req.session.user,
      classObj,
      enrolledStudents, // Pass the array of enrolled student objects
      error,
      success
    });
  } catch (error) {
    console.error('Error fetching data for manage students page:', error);
    req.session.error = 'Failed to load page data.';
    res.redirect('/admin/classes');
  }
});

/**
 * Enroll a student in a class - Admin only
 * POST /classes/:id/students
 */
router.post('/:id/students', isAuthenticated, isAdmin, async (req, res) => {
  const classId = req.params.id;
  const { studentId } = req.body; // Expecting a single studentId from the search form

  try {
    if (!studentId) {
      req.session.error = 'No student selected to enroll.';
      return res.redirect(`/admin/classes/manage/${classId}`);
    }

    // Check if already enrolled (optional but good practice)
    const isEnrolled = await StudentClass.isEnrolled(studentId, classId);
    if (isEnrolled) {
      req.session.error = 'Student is already enrolled in this class.';
      return res.redirect(`/admin/classes/manage/${classId}`);
    }

    // Enroll the student
    await Student.enrollInClass(studentId, classId);

    req.session.success = 'Student enrolled successfully';
    res.redirect(`/admin/classes/manage/${classId}`);
  } catch (error) {
    console.error('Error enrolling student in class:', error);
    req.session.error = error.message || 'Failed to enroll student';
    res.redirect(`/admin/classes/manage/${classId}`);
  }
});

/**
 * Unenroll a student from a class - Admin only
 * DELETE /classes/:id/students/:studentId
 */
router.delete('/:id/students/:studentId', isAuthenticated, isAdmin, async (req, res) => {
  const { id: classId, studentId } = req.params;
  try {
    // Attempt to remove the enrollment record directly
    const removed = await StudentClass.removeFromClass(studentId, classId);

    if (removed) {
      // Set session flash message for success
      req.session.success = 'Student unenrolled successfully';
      // Send JSON success response (frontend will handle reload)
      res.status(200).json({ success: true, message: req.session.success });
    } else {
      // Set session flash message for failure (e.g., not found)
      req.session.error = 'Failed to unenroll student. Enrollment not found.';
      // Send JSON error response
      res.status(404).json({ success: false, error: req.session.error });
    }
  } catch (error) {
    console.error('Error unenrolling student:', error);
    // Set session flash message for server error
    req.session.error = error.message || 'Failed to unenroll student due to a server error';
    // Send JSON error response
    res.status(500).json({ success: false, error: req.session.error });
  }
});

module.exports = router;