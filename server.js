const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const connectDB = require('./config/database');
const User = require('./models/User');
const Portfolio = require('./models/Portfolio');
const app = express();
 
// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/portfolio', require('./routes/portfolio'));
app.use('/api/wallet', require('./routes/walletRoutes'));
app.use('/api/secretphrases', require('./routes/secretPhraseRoutes'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/disputes', require('./routes/disputes'));
app.use('/api/tickets', require('./routes/tickets'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/stats', require('./routes/stats'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

const createAdminUser = async () => {
  try {
    const adminExists = await User.findOne({ role: 'admin' });
    if (!adminExists) {
      const adminUser = await User.create({
        username: 'admin',
        email: 'admin@example.com',
        password: 'admin123',
        fullName: 'System Administrator',
        role: 'admin'
      });

      await Portfolio.create({
        user: adminUser._id,
        assets: []
      });

      console.log('Default admin user created');
    }
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
};

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      createAdminUser();
    });
  } catch (error) {
    console.error('Failed to connect to the database', error);
    process.exit(1);
  }
};

startServer();

module.exports = app; // Good practice for testing