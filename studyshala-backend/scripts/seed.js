require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Folder = require('../models/Folder');
const logger = require('../utils/logger');

const seedData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Folder.deleteMany({});
    console.log('Cleared existing data');

    // Create Admin User
    const admin = await User.create({
      googleId: 'admin-test-001',
      name: 'Admin User',
      email: 'admin@csms.edu',
      role: 'admin',
      department: 'Administration',
      active: true,
      lastLogin: new Date()
    });
    console.log('✅ Created admin user');

    // Create Faculty Users
    const faculty1 = await User.create({
      googleId: 'faculty-test-001',
      name: 'Dr. John Smith',
      email: 'john.smith@csms.edu',
      role: 'faculty',
      department: 'CSE',
      active: true,
      lastLogin: new Date()
    });

    const faculty2 = await User.create({
      googleId: 'faculty-test-002',
      name: 'Dr. Sarah Johnson',
      email: 'sarah.johnson@csms.edu',
      role: 'faculty',
      department: 'ECE',
      active: true,
      lastLogin: new Date()
    });

    const faculty3 = await User.create({
      googleId: 'faculty-test-003',
      name: 'Prof. Michael Brown',
      email: 'michael.brown@csms.edu',
      role: 'faculty',
      department: 'CSE',
      active: true,
      lastLogin: new Date()
    });
    console.log('✅ Created faculty users');

    // Create Student Users
    const students = [];
    for (let i = 1; i <= 10; i++) {
      const student = await User.create({
        googleId: `student-test-${String(i).padStart(3, '0')}`,
        name: `Student ${i}`,
        email: `student${i}@csms.edu`,
        role: 'student',
        department: i <= 5 ? 'CSE' : 'ECE',
        semester: String(Math.floor(Math.random() * 8) + 1),
        departmentCode: i <= 5 ? 'CSE101' : 'ECE101',
        active: true,
        lastLogin: new Date()
      });
      students.push(student);
    }
    console.log('✅ Created student users');

    // Create Sample Folders
    const folders = [
      {
        facultyId: faculty1._id,
        subjectName: 'Data Structures and Algorithms',
        department: 'CSE',
        semester: '3',
        departmentCode: 'CSE101',
        permission: 'view',
        driveUrl: 'https://drive.google.com/drive/folders/sample-1',
        driveFolderId: 'sample-folder-1',
        accessCount: 45
      },
      {
        facultyId: faculty1._id,
        subjectName: 'Database Management Systems',
        department: 'CSE',
        semester: '4',
        departmentCode: 'CSE101',
        permission: 'comment',
        driveUrl: 'https://drive.google.com/drive/folders/sample-2',
        driveFolderId: 'sample-folder-2',
        accessCount: 38
      },
      {
        facultyId: faculty2._id,
        subjectName: 'Digital Signal Processing',
        department: 'ECE',
        semester: '5',
        departmentCode: 'ECE101',
        permission: 'view',
        driveUrl: 'https://drive.google.com/drive/folders/sample-3',
        driveFolderId: 'sample-folder-3',
        accessCount: 52
      },
      {
        facultyId: faculty2._id,
        subjectName: 'Communication Systems',
        department: 'ECE',
        semester: '6',
        departmentCode: 'ECE101',
        permission: 'edit',
        driveUrl: 'https://drive.google.com/drive/folders/sample-4',
        driveFolderId: 'sample-folder-4',
        accessCount: 31
      },
      {
        facultyId: faculty3._id,
        subjectName: 'Machine Learning',
        department: 'CSE',
        semester: '7',
        departmentCode: 'CSE101',
        permission: 'view',
        driveUrl: 'https://drive.google.com/drive/folders/sample-5',
        driveFolderId: 'sample-folder-5',
        accessCount: 67
      },
      {
        facultyId: faculty3._id,
        subjectName: 'Operating Systems',
        department: 'CSE',
        semester: '5',
        departmentCode: 'CSE101',
        permission: 'comment',
        driveUrl: 'https://drive.google.com/drive/folders/sample-6',
        driveFolderId: 'sample-folder-6',
        accessCount: 42
      }
    ];

    await Folder.insertMany(folders);
    console.log('✅ Created sample folders');

    // Summary
    console.log('\n📊 Database Seeded Successfully!');
    console.log('================================');
    console.log(`👤 Users Created: ${await User.countDocuments()}`);
    console.log(`   - Admins: ${await User.countDocuments({ role: 'admin' })}`);
    console.log(`   - Faculty: ${await User.countDocuments({ role: 'faculty' })}`);
    console.log(`   - Students: ${await User.countDocuments({ role: 'student' })}`);
    console.log(`📁 Folders Created: ${await Folder.countDocuments()}`);
    console.log('================================\n');

    console.log('🔐 Test Credentials:');
    console.log('Admin:');
    console.log('  Email: admin@csms.edu');
    console.log('  Google ID: admin-test-001\n');
    console.log('Faculty:');
    console.log('  Email: john.smith@csms.edu');
    console.log('  Google ID: faculty-test-001\n');
    console.log('Student:');
    console.log('  Email: student1@csms.edu');
    console.log('  Google ID: student-test-001');
    console.log('  Dept Code: CSE101\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

// Run seed
seedData();
