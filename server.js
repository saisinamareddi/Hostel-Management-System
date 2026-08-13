const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const { query } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Middleware to mock session auth using custom headers
// On client side, we'll store user credentials in localStorage and send headers
const getAuthUser = async (req) => {
  const userId = req.headers['x-user-id'];
  const userType = req.headers['x-user-type']; // 'student' or 'manager'
  
  if (!userId) return null;

  if (userType === 'student') {
    return await query.get('SELECT * FROM Student WHERE Student_id = ?', [userId]);
  } else if (userType === 'manager') {
    return await query.get('SELECT * FROM Hostel_Manager WHERE Username = ?', [userId]);
  }
  return null;
};

// --- AUTHENTICATION ---

// Student Signup
app.post('/api/student/signup', async (req, res) => {
  const { student_id, fname, lname, mob_no, dept, year_of_study, password } = req.body;

  if (!student_id || !fname || !lname || !mob_no || !dept || !year_of_study || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    const existing = await query.get('SELECT * FROM Student WHERE Student_id = ?', [student_id]);
    if (existing) {
      return res.status(400).json({ error: 'Student with this Roll No already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await query.run(
      `INSERT INTO Student (Student_id, Fname, Lname, Mob_no, Dept, Year_of_study, Pwd) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [student_id, fname, lname, mob_no, dept, year_of_study, hashedPassword]
    );

    res.status(201).json({ message: 'Registration successful. You can now login.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

// Student Login
app.post('/api/student/login', async (req, res) => {
  const { student_id, password } = req.body;

  if (!student_id || !password) {
    return res.status(400).json({ error: 'Roll No and Password are required.' });
  }

  try {
    const student = await query.get('SELECT * FROM Student WHERE Student_id = ?', [student_id]);
    if (!student) {
      return res.status(400).json({ error: 'Invalid Roll No or password.' });
    }

    const isValid = await bcrypt.compare(password, student.Pwd);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid Roll No or password.' });
    }

    res.json({
      message: 'Login successful',
      user: {
        id: student.Student_id,
        fname: student.Fname,
        lname: student.Lname,
        type: 'student'
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

// Manager/Admin Login
app.post('/api/manager/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and Password are required.' });
  }

  try {
    const manager = await query.get('SELECT * FROM Hostel_Manager WHERE Username = ?', [username]);
    if (!manager) {
      return res.status(400).json({ error: 'Invalid Username or password.' });
    }

    const isValid = await bcrypt.compare(password, manager.Pwd);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid Username or password.' });
    }

    res.json({
      message: 'Login successful',
      user: {
        id: manager.Username,
        fname: manager.Fname,
        lname: manager.Lname,
        type: 'manager',
        isAdmin: manager.Isadmin === 1,
        hostelId: manager.Hostel_id
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

// --- COMMON APIs ---

// Get all Hostels
app.get('/api/hostels', async (req, res) => {
  try {
    const hostels = await query.all('SELECT * FROM Hostel');
    res.json(hostels);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch hostels.' });
  }
});

// --- STUDENT PANEL APIs ---

// Student Profile
app.get('/api/student/profile', async (req, res) => {
  const user = await getAuthUser(req);
  if (!user || req.headers['x-user-type'] !== 'student') {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  try {
    const profile = await query.get(`
      SELECT s.*, h.Hostel_name, r.Room_No
      FROM Student s
      LEFT JOIN Hostel h ON s.Hostel_id = h.Hostel_id
      LEFT JOIN Room r ON s.Room_id = r.Room_id
      WHERE s.Student_id = ?
    `, [user.Student_id]);

    const activeApp = await query.get(`
      SELECT a.*, h.Hostel_name
      FROM Application a
      JOIN Hostel h ON a.Hostel_id = h.Hostel_id
      WHERE a.Student_id = ? AND a.Application_status = 0
    `, [user.Student_id]);

    res.json({ profile, activeApplication: activeApp || null });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to load profile.' });
  }
});

// Submit hostel room application
app.post('/api/student/apply', async (req, res) => {
  const user = await getAuthUser(req);
  if (!user || req.headers['x-user-type'] !== 'student') {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  const { hostel_id, message } = req.body;
  if (!hostel_id) {
    return res.status(400).json({ error: 'Hostel selection is required.' });
  }

  try {
    // Check if already has a room
    if (user.Room_id) {
      return res.status(400).json({ error: 'You are already allocated to Room ' + user.Room_id });
    }

    // Check if already has a pending application
    const pending = await query.get(
      'SELECT * FROM Application WHERE Student_id = ? AND Application_status = 0',
      [user.Student_id]
    );
    if (pending) {
      return res.status(400).json({ error: 'You already have a pending room application.' });
    }

    await query.run(
      'INSERT INTO Application (Student_id, Hostel_id, Application_status, Message) VALUES (?, ?, 0, ?)',
      [user.Student_id, hostel_id, message || '']
    );

    res.status(201).json({ message: 'Application submitted successfully!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to submit application.' });
  }
});

// Vacate current room
app.post('/api/student/vacate', async (req, res) => {
  const user = await getAuthUser(req);
  if (!user || req.headers['x-user-type'] !== 'student') {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  try {
    if (!user.Room_id) {
      return res.status(400).json({ error: 'You do not currently have an allocated room.' });
    }

    // Mark room as unallocated
    await query.run('UPDATE Room SET Allocated = 0 WHERE Room_id = ?', [user.Room_id]);

    // Update student
    await query.run(
      'UPDATE Student SET Hostel_id = NULL, Room_id = NULL WHERE Student_id = ?',
      [user.Student_id]
    );

    // Delete any pending/existing applications so they can re-apply cleanly
    await query.run('DELETE FROM Application WHERE Student_id = ?', [user.Student_id]);

    res.json({ message: 'Room vacated successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to vacate room.' });
  }
});

// Get Messages
app.get('/api/messages', async (req, res) => {
  const user = await getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  const userId = req.headers['x-user-type'] === 'student' ? user.Student_id : user.Username;

  try {
    const messages = await query.all(
      `SELECT m.*, h.Hostel_name
       FROM Message m
       LEFT JOIN Hostel h ON m.hostel_id = h.Hostel_id
       WHERE m.sender_id = ? OR m.receiver_id = ?
       ORDER BY m.msg_id DESC`,
      [userId, userId]
    );
    res.json(messages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch messages.' });
  }
});

// Send Message
app.post('/api/messages/send', async (req, res) => {
  const user = await getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  const { receiver_id, subject, message, hostel_id } = req.body;
  if (!receiver_id || !subject || !message) {
    return res.status(400).json({ error: 'Receiver, subject, and message content are required.' });
  }

  const senderId = req.headers['x-user-type'] === 'student' ? user.Student_id : user.Username;
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  try {
    await query.run(
      `INSERT INTO Message (sender_id, receiver_id, hostel_id, subject_h, message, msg_date, msg_time)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [senderId, receiver_id, hostel_id || null, subject, message, dateStr, timeStr]
    );
    res.status(201).json({ message: 'Message sent successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to send message.' });
  }
});

// --- MANAGER/ADMIN PANEL APIs ---

// Manager Dashboard Info
app.get('/api/manager/dashboard', async (req, res) => {
  const user = await getAuthUser(req);
  if (!user || req.headers['x-user-type'] !== 'manager') {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  const hostelId = user.Hostel_id;

  try {
    const stats = {};
    
    // Total rooms in hostel
    const totalRooms = await query.get(
      'SELECT COUNT(*) as count FROM Room WHERE Hostel_id = ?', [hostelId]
    );
    stats.totalRooms = totalRooms.count;

    // Allocated rooms
    const allocatedRooms = await query.get(
      'SELECT COUNT(*) as count FROM Room WHERE Hostel_id = ? AND Allocated = 1', [hostelId]
    );
    stats.allocatedRooms = allocatedRooms.count;
    stats.emptyRooms = stats.totalRooms - stats.allocatedRooms;

    // Pending applications
    const pendingApps = await query.get(
      'SELECT COUNT(*) as count FROM Application WHERE Hostel_id = ? AND Application_status = 0', [hostelId]
    );
    stats.pendingApplications = pendingApps.count;

    // Students count
    const studentCount = await query.get(
      'SELECT COUNT(*) as count FROM Student WHERE Hostel_id = ?', [hostelId]
    );
    stats.totalStudents = studentCount.count;

    // Hostel Info
    const hostelInfo = await query.get(
      'SELECT Hostel_name FROM Hostel WHERE Hostel_id = ?', [hostelId]
    );
    stats.hostelName = hostelInfo ? hostelInfo.Hostel_name : 'N/A';

    res.json(stats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to load dashboard statistics.' });
  }
});

// Get Applications for manager's hostel
app.get('/api/manager/applications', async (req, res) => {
  const user = await getAuthUser(req);
  if (!user || req.headers['x-user-type'] !== 'manager') {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  const hostelId = user.Hostel_id;

  try {
    const applications = await query.all(
      `SELECT a.*, s.Fname, s.Lname, s.Dept, s.Year_of_study, s.Mob_no
       FROM Application a
       JOIN Student s ON a.Student_id = s.Student_id
       WHERE a.Hostel_id = ? AND a.Application_status = 0`,
      [hostelId]
    );
    res.json(applications);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch applications.' });
  }
});

// Allocate room (Approve/Reject Application)
app.post('/api/manager/allocate', async (req, res) => {
  const user = await getAuthUser(req);
  if (!user || req.headers['x-user-type'] !== 'manager') {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  const { application_id, action, room_id } = req.body; // action: 'approve' or 'reject'

  if (!application_id || !action) {
    return res.status(400).json({ error: 'Application ID and Action are required.' });
  }

  try {
    const appRecord = await query.get(
      'SELECT * FROM Application WHERE Application_id = ?', [application_id]
    );
    if (!appRecord) {
      return res.status(404).json({ error: 'Application not found.' });
    }

    if (action === 'approve') {
      if (!room_id) {
        return res.status(400).json({ error: 'Room selection is required for approval.' });
      }

      // Check if room is already allocated
      const room = await query.get('SELECT * FROM Room WHERE Room_id = ?', [room_id]);
      if (!room || room.Allocated === 1) {
        return res.status(400).json({ error: 'Selected room is already allocated or does not exist.' });
      }

      // Update room to allocated
      await query.run('UPDATE Room SET Allocated = 1 WHERE Room_id = ?', [room_id]);

      // Update student record
      await query.run(
        'UPDATE Student SET Hostel_id = ?, Room_id = ? WHERE Student_id = ?',
        [appRecord.Hostel_id, room_id, appRecord.Student_id]
      );

      // Update application
      await query.run(
        'UPDATE Application SET Application_status = 1, Room_No = ? WHERE Application_id = ?',
        [room.Room_No, application_id]
      );

      // Send automated message to student
      const now = new Date();
      await query.run(`
        INSERT INTO Message (sender_id, receiver_id, hostel_id, subject_h, message, msg_date, msg_time)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        user.Username,
        appRecord.Student_id,
        appRecord.Hostel_id,
        'Room Allocation Approved',
        `Congratulations! Your application has been approved. You have been allocated Room No ${room.Room_No}.`,
        now.toISOString().split('T')[0],
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      ]);

      res.json({ message: 'Room allocated successfully.' });
    } else {
      // Reject application
      await query.run(
        'UPDATE Application SET Application_status = 2 WHERE Application_id = ?',
        [application_id]
      );

      // Send automated message to student
      const now = new Date();
      await query.run(`
        INSERT INTO Message (sender_id, receiver_id, hostel_id, subject_h, message, msg_date, msg_time)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        user.Username,
        appRecord.Student_id,
        appRecord.Hostel_id,
        'Room Application Rejected',
        'We regret to inform you that your room application has been rejected.',
        now.toISOString().split('T')[0],
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      ]);

      res.json({ message: 'Application rejected.' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to process room allocation.' });
  }
});

// Get empty rooms for a hostel
app.get('/api/rooms/empty/:hostelId', async (req, res) => {
  const { hostelId } = req.params;
  try {
    const rooms = await query.all(
      'SELECT * FROM Room WHERE Hostel_id = ? AND Allocated = 0',
      [hostelId]
    );
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch empty rooms.' });
  }
});

// Get all rooms in manager's hostel
app.get('/api/manager/rooms', async (req, res) => {
  const user = await getAuthUser(req);
  if (!user || req.headers['x-user-type'] !== 'manager') {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  try {
    const rooms = await query.all(
      `SELECT r.*, s.Student_id, s.Fname, s.Lname
       FROM Room r
       LEFT JOIN Student s ON r.Room_id = s.Room_id
       WHERE r.Hostel_id = ?
       ORDER BY r.Room_No`,
      [user.Hostel_id]
    );
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch rooms.' });
  }
});

// Get all students allocated to manager's hostel
app.get('/api/manager/students', async (req, res) => {
  const user = await getAuthUser(req);
  if (!user || req.headers['x-user-type'] !== 'manager') {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  try {
    const students = await query.all(
      `SELECT s.*, r.Room_No
       FROM Student s
       LEFT JOIN Room r ON s.Room_id = r.Room_id
       WHERE s.Hostel_id = ?`,
      [user.Hostel_id]
    );
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch students.' });
  }
});

// Vacate a student room by Manager
app.post('/api/manager/vacate-student', async (req, res) => {
  const user = await getAuthUser(req);
  if (!user || req.headers['x-user-type'] !== 'manager') {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  const { student_id } = req.body;
  if (!student_id) {
    return res.status(400).json({ error: 'Student ID is required.' });
  }

  try {
    const student = await query.get(
      'SELECT * FROM Student WHERE Student_id = ? AND Hostel_id = ?',
      [student_id, user.Hostel_id]
    );
    if (!student || !student.Room_id) {
      return res.status(400).json({ error: 'Student does not have an allocated room in your hostel.' });
    }

    // Set room to unallocated
    await query.run('UPDATE Room SET Allocated = 0 WHERE Room_id = ?', [student.Room_id]);

    // Clear student's room details
    await query.run(
      'UPDATE Student SET Hostel_id = NULL, Room_id = NULL WHERE Student_id = ?',
      [student_id]
    );

    // Remove application
    await query.run('DELETE FROM Application WHERE Student_id = ?', [student_id]);

    // Send warning notification message
    const now = new Date();
    await query.run(`
      INSERT INTO Message (sender_id, receiver_id, hostel_id, subject_h, message, msg_date, msg_time)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      user.Username,
      student_id,
      user.Hostel_id,
      'Room Vacated by Manager',
      'Your room allocation has been vacated by the hostel manager.',
      now.toISOString().split('T')[0],
      now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    ]);

    res.json({ message: 'Student room vacated successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to vacate student room.' });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Hostel Management System server running at http://localhost:${PORT}`);
});
