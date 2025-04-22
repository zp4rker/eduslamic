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

    const allStudents = await Student.findAll();
    const enrolledStudentIds = await StudentClass.findStudentsByClass(classId);

    const error = req.session.error;
    req.session.error = null;

    res.render('admin/classes/manage-students', {
      user: req.session.user,
      classObj,
      allStudents,
      enrolledStudentIds,
      error,
      success: null
    });
  } catch (error) {
    console.error('Error fetching data for manage students page:', error);
    req.session.error = 'Failed to load page data.';
    res.redirect('/admin/classes');
  }
});

/**
 * Update students in class - Admin only
 * POST /classes/:id/students
 */
router.post('/:id/students', isAuthenticated, isAdmin, async (req, res) => {
  const classId = req.params.id;
  try {
    const currentStudentIds = await StudentClass.findStudentsByClass(classId);
    const { studentIds } = req.body;
    const newStudentIds = studentIds ? (Array.isArray(studentIds) ? studentIds : [studentIds]) : [];

    for (const currentId of currentStudentIds) {
      if (!newStudentIds.includes(currentId)) {
        await Student.removeFromClass(currentId, classId);
      }
    }

    for (const newId of newStudentIds) {
      if (!currentStudentIds.includes(newId)) {
        await Student.enrollInClass(newId, classId);
      }
    }

    req.session.success = 'Students updated successfully';
    res.redirect(`/admin/classes`);
  } catch (error) {
    console.error('Error updating students in class:', error);
    req.session.error = error.message || 'Failed to update students';
    res.redirect(`/admin/classes/manage/${classId}`);
  }
});

module.exports = router;