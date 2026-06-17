const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('./models/Admin');
const path = require('path');
require('dotenv').config({
  path: path.join(__dirname, '.env'),
});

const createAdmin = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('Error: MONGODB_URI is not defined in .env file.');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB.');

    const email = 'admin@example.com';
    const password = 'admin123';

    const existingAdmin = await Admin.findOne({ email: email.toLowerCase() });
    if (existingAdmin) {
      console.log(`Admin account already exists for: ${email}`);
      console.log('You can log in using these credentials.');
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await Admin.create({
      email: email.toLowerCase(),
      password: hashedPassword,
    });

    console.log('\n======================================');
    console.log('Admin account created successfully!');
    console.log(`Email:    ${email}`);
    console.log(`Password: ${password}`);
    console.log('======================================\n');
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
};

createAdmin();
