const express = require('express');
const router = express.Router();
const Student = require('../../models/Student');
const { User, ROLES } = require('../../models/User');
const StudentParent = require('../../models/StudentParent');
const { isAuthenticated, isAdmin } = require('../../middleware/auth');

router.get('/', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const students = await Student.findAll();
    const parents = await User.findByRole(ROLES.PARENT);
    
    students.forEach(student => {
      if (student.dateOfBirth) {
        const dob = new Date(student.dateOfBirth);
        student.formattedDob = dob.toLocaleDateString();
      }
    });
    
    const success = req.session.success;
    const error = req.session.error;
    req.session.success = null;
    req.session.error = null;

    res.render('admin/students/index', {
      user: req.session.user, 
      students,
      parents,
      success,
      error,
      values: {}
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.render('admin/students/index', {
      user: req.session.user, 
      students: [],
      parents: [],
      error: 'Failed to load students',
      values: {}
    });
  }
});

router.get('/add', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const parents = await User.findByRole(ROLES.PARENT);

    const error = req.session.error;
    const values = req.session.values || {};
    req.session.error = null;
    req.session.values = null;

    res.render('admin/students/add', {
      user: req.session.user,
      parents,
      error,
      values
    });
  } catch (error) {
    console.error('Error fetching data for add student page:', error);
    req.session.error = 'Failed to load the add student form.';
    res.redirect('/admin/students');
  }
});

router.post('/create', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { name, dateOfBirth, parentIds } = req.body;

    if (!name || !dateOfBirth) {
      req.session.error = 'Student name and date of birth are required.';
      req.session.values = req.body;
      return res.redirect('/admin/students/add');
    }

    const newStudent = await Student.create({ name, dateOfBirth });

    if (parentIds) {
      const ids = Array.isArray(parentIds) ? parentIds : [parentIds];
      for (const parentId of ids) {
        await Student.addParent(newStudent._id, parentId);
      }
    }

    req.session.success = 'Student created successfully';
    res.redirect('/admin/students');
  } catch (error) {
    console.error('Error creating student:', error);
    req.session.error = error.message || 'Failed to create student';
    req.session.values = req.body;
    res.redirect('/admin/students/add');
  }
});

router.get('/edit/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const studentId = req.params.id;
    const student = await Student.findById(studentId);
    const parents = await User.findByRole(ROLES.PARENT);
    const assignedParentIds = await StudentParent.findParentsByStudent(studentId);

    if (!student) {
      req.session.error = 'Student not found.';
      return res.redirect('/admin/students');
    }

    const success = req.session.success;
    const error = req.session.error;
    const values = req.session.values || {};
    req.session.success = null;
    req.session.error = null;
    req.session.values = null;

    res.render('admin/students/edit', {
      user: req.session.user,
      student,
      parents,
      assignedParentIds: assignedParentIds.map(id => id.toString()),
      success,
      error,
      values
    });
  } catch (error) {
    console.error('Error fetching student for edit:', error);
    req.session.error = 'Failed to load student data for editing.';
    res.redirect('/admin/students');
  }
});

router.post('/edit/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const studentId = req.params.id;
    const { name, dateOfBirth, parentIds: parentIdsString = '' } = req.body;

    if (!name || !dateOfBirth) {
      req.session.error = 'Student name and date of birth are required.';
      req.session.values = req.body;
      return res.redirect(`/admin/students/edit/${studentId}`);
    }

    await Student.update(studentId, { name, dateOfBirth });

    const currentParentIds = await StudentParent.findParentsByStudent(studentId);
    const newParentIds = parentIdsString ? parentIdsString.split(',').filter(id => id) : [];

    const currentParentIdsStr = currentParentIds.map(id => id.toString());

    for (const currentId of currentParentIdsStr) {
      if (!newParentIds.includes(currentId)) {
        await Student.removeParent(studentId, currentId);
      }
    }

    for (const newId of newParentIds) {
      if (!currentParentIdsStr.includes(newId)) {
        await Student.addParent(studentId, newId);
      }
    }

    req.session.success = 'Student updated successfully';
    res.redirect('/admin/students');
  } catch (error) {
    console.error('Error updating student:', error);
    req.session.error = error.message || 'Failed to update student';
    req.session.values = req.body;
    res.redirect(`/admin/students/edit/${req.params.id}`);
  }
});

router.post('/delete/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const studentId = req.params.id;
    await Student.delete(studentId);

    req.session.success = 'Student deleted successfully';
    res.redirect('/admin/students');
  } catch (error) {
    console.error('Error deleting student:', error);
    req.session.error = error.message || 'Failed to delete student';
    res.redirect('/admin/students');
  }
});

router.get('/api/details/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const studentId = req.params.id;
    const studentProfile = await Student.getCompleteProfile(studentId);

    if (!studentProfile) {
      return res.status(404).json({ error: 'Student not found' });
    }

    let formattedDob = 'N/A';
    if (studentProfile.dateOfBirth) {
        try {
            const dob = new Date(studentProfile.dateOfBirth);
            if (!isNaN(dob.getTime())) {
                formattedDob = dob.toLocaleDateString();
            } else {
                console.warn(`Invalid dateOfBirth found for student ${studentId}: ${studentProfile.dateOfBirth}`);
            }
        } catch (dateError) {
            console.error(`Error formatting dateOfBirth for student ${studentId}:`, dateError);
        }
    }

    const responseData = {
      student: {
        _id: studentProfile._id,
        name: studentProfile.name,
        formattedDob: formattedDob
      },
      parent: studentProfile.parents && studentProfile.parents.length > 0 ? studentProfile.parents[0] : null,
      classes: studentProfile.classes || []
    };

    res.json(responseData);

  } catch (error) {
    console.error('Error fetching student details for API:', error);
    res.status(500).json({ error: error.message || 'Failed to load student details' });
  }
});

module.exports = router;