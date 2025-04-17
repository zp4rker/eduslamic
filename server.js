const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const PouchDB = require('pouchdb');
PouchDB.plugin(require('pouchdb-find'));
const expressLayouts = require('express-ejs-layouts');

// Insert sample data for development/testing
const setupDefaultUser = require('./initSampleData');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3000;

// Set up view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', path.join(__dirname, 'views/layouts/base'));

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'eduslamic-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 3600000 } // 1 hour
}));
app.use(expressLayouts);

// Middleware to make user available in all views
app.use((req, res, next) => {
  res.locals.user = req.session.user || undefined;
  next();
});

// Initialize database
const db = new PouchDB('users');

// Create indexes for queries
db.createIndex({
  index: { fields: ['email'] }
}).then(() => {
  console.log('Email index created successfully');
  
  // Create default admin user after index is created
  setupDefaultUser().then(() => {
    console.log('Default users setup complete');
  });
}).catch(err => {
  console.error('Error creating index:', err);
});

// Routes
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const studentRoutes = require('./routes/students');
const classRoutes = require('./routes/classes');

app.use('/auth', authRoutes);
app.use('/profile', profileRoutes);
app.use('/students', studentRoutes);
app.use('/classes', classRoutes);

// Home route
app.get('/', (req, res) => {
  if (req.session.user) {
    res.render('dashboard', { 
      user: req.session.user,
      success: req.query.success,
      error: req.query.error,
      layout: 'layouts/base'
    });
  } else {
    res.render('login', { layout: 'layouts/minimal' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});