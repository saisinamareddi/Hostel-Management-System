const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, 'hms.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to SQLite database:', err.message);
  } else {
    console.log('Connected to the SQLite database (hms.db).');
    initDatabase();
  }
});

// Promisified database helpers
const query = {
  run: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  },
  get: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },
  all: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
};

async function initDatabase() {
  try {
    // Enable Foreign Keys and optimize database settings for durability & performance
    await query.run('PRAGMA foreign_keys = ON');
    await query.run('PRAGMA journal_mode = WAL');
    await query.run('PRAGMA synchronous = NORMAL');
    await query.run('PRAGMA busy_timeout = 5000');

    // Create Hostel Table
    await query.run(`
      CREATE TABLE IF NOT EXISTS Hostel (
        Hostel_id INTEGER PRIMARY KEY AUTOINCREMENT,
        Hostel_name TEXT NOT NULL,
        current_no_of_rooms TEXT,
        No_of_rooms TEXT,
        No_of_students TEXT
      )
    `);

    // Create Room Table
    await query.run(`
      CREATE TABLE IF NOT EXISTS Room (
        Room_id INTEGER PRIMARY KEY AUTOINCREMENT,
        Hostel_id INTEGER NOT NULL,
        Room_No INTEGER NOT NULL,
        Allocated INTEGER DEFAULT 0,
        FOREIGN KEY(Hostel_id) REFERENCES Hostel(Hostel_id) ON DELETE CASCADE
      )
    `);

    // Create Student Table
    await query.run(`
      CREATE TABLE IF NOT EXISTS Student (
        Student_id TEXT PRIMARY KEY,
        Fname TEXT NOT NULL,
        Lname TEXT NOT NULL,
        Mob_no TEXT NOT NULL,
        Dept TEXT NOT NULL,
        Year_of_study TEXT NOT NULL,
        Pwd TEXT NOT NULL,
        Hostel_id INTEGER,
        Room_id INTEGER,
        FOREIGN KEY(Hostel_id) REFERENCES Hostel(Hostel_id) ON DELETE SET NULL,
        FOREIGN KEY(Room_id) REFERENCES Room(Room_id) ON DELETE SET NULL
      )
    `);

    // Create Hostel_Manager Table
    await query.run(`
      CREATE TABLE IF NOT EXISTS Hostel_Manager (
        Hostel_man_id INTEGER PRIMARY KEY AUTOINCREMENT,
        Username TEXT NOT NULL UNIQUE,
        Fname TEXT NOT NULL,
        Lname TEXT NOT NULL,
        Mob_no TEXT NOT NULL,
        Hostel_id INTEGER NOT NULL,
        Pwd TEXT NOT NULL,
        Isadmin INTEGER DEFAULT 0,
        FOREIGN KEY(Hostel_id) REFERENCES Hostel(Hostel_id) ON DELETE CASCADE
      )
    `);

    // Create Application Table
    await query.run(`
      CREATE TABLE IF NOT EXISTS Application (
        Application_id INTEGER PRIMARY KEY AUTOINCREMENT,
        Student_id TEXT NOT NULL,
        Hostel_id INTEGER NOT NULL,
        Application_status INTEGER DEFAULT 0, -- 0 = Pending, 1 = Approved, 2 = Rejected
        Room_No INTEGER,
        Message TEXT,
        FOREIGN KEY(Student_id) REFERENCES Student(Student_id) ON DELETE CASCADE,
        FOREIGN KEY(Hostel_id) REFERENCES Hostel(Hostel_id) ON DELETE CASCADE
      )
    `);

    // Create Message Table
    await query.run(`
      CREATE TABLE IF NOT EXISTS Message (
        msg_id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id TEXT NOT NULL,
        receiver_id TEXT NOT NULL,
        hostel_id INTEGER,
        subject_h TEXT,
        message TEXT,
        msg_date TEXT,
        msg_time TEXT,
        FOREIGN KEY(hostel_id) REFERENCES Hostel(Hostel_id) ON DELETE SET NULL
      )
    `);

    console.log('Tables initialized successfully.');
    await seedData();
  } catch (error) {
    console.error('Error during database initialization:', error);
  }
}

async function seedData() {
  try {
    // 1. Seed Hostels
    const hostelCount = await query.get('SELECT COUNT(*) as count FROM Hostel');
    if (hostelCount.count === 0) {
      console.log('Seeding Hostels...');
      const hostels = [
        { id: 1, name: 'A', limit: '400' },
        { id: 2, name: 'B', limit: '400' },
        { id: 3, name: 'C', limit: '400' },
        { id: 4, name: 'D', limit: '400' },
        { id: 5, name: 'E', limit: '400' },
        { id: 6, name: 'F', limit: '400' }
      ];
      for (const h of hostels) {
        await query.run(
          'INSERT INTO Hostel (Hostel_id, Hostel_name, No_of_rooms) VALUES (?, ?, ?)',
          [h.id, h.name, h.limit]
        );
      }
    }

    // 2. Seed Rooms (Let's add 5 rooms for each hostel if empty)
    const roomCount = await query.get('SELECT COUNT(*) as count FROM Room');
    if (roomCount.count === 0) {
      console.log('Seeding Rooms...');
      // 6 hostels, 5 rooms each
      for (let hostelId = 1; hostelId <= 6; hostelId++) {
        for (let rNum = 1; rNum <= 5; rNum++) {
          const roomNo = hostelId * 100 + rNum;
          await query.run(
            'INSERT INTO Room (Hostel_id, Room_No, Allocated) VALUES (?, ?, 0)',
            [hostelId, roomNo]
          );
        }
      }
    }

    // Update Hostel room count
    for (let hostelId = 1; hostelId <= 6; hostelId++) {
      const roomStats = await query.get(
        'SELECT COUNT(*) as total FROM Room WHERE Hostel_id = ?',
        [hostelId]
      );
      await query.run(
        'UPDATE Hostel SET current_no_of_rooms = ? WHERE Hostel_id = ?',
        [roomStats.total.toString(), hostelId]
      );
    }

    // 3. Seed Students
    const studentCount = await query.get('SELECT COUNT(*) as count FROM Student');
    if (studentCount.count === 0) {
      console.log('Seeding Students...');
      const studentPwdHash = await bcrypt.hash('student123', 10);
      
      // Default student from original SQL script
      await query.run(`
        INSERT INTO Student (Student_id, Fname, Lname, Mob_no, Dept, Year_of_study, Pwd, Hostel_id, Room_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL)
      `, ['B160497CS', 'Prajwal', 'Ghoradkar', '09757318791', 'CSE', '3', studentPwdHash]);

      // Additional student for testing
      await query.run(`
        INSERT INTO Student (Student_id, Fname, Lname, Mob_no, Dept, Year_of_study, Pwd, Hostel_id, Room_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL)
      `, ['B160000CS', 'Test', 'Student', '09876543210', 'ECE', '2', studentPwdHash]);
    }

    // Seed Harika student if not exists
    const harikaStudent = await query.get("SELECT * FROM Student WHERE Student_id = 'Harika'");
    if (!harikaStudent) {
      console.log('Seeding student Harika...');
      const harikaPwdHash = await bcrypt.hash('Harika2006', 10);
      await query.run(`
        INSERT INTO Student (Student_id, Fname, Lname, Mob_no, Dept, Year_of_study, Pwd, Hostel_id, Room_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL)
      `, ['Harika', 'Harika', 'Student', '09998887776', 'CSE', '2', harikaPwdHash]);
    }

    // 4. Seed Hostel Managers & Admins
    const managerCount = await query.get('SELECT COUNT(*) as count FROM Hostel_Manager');
    if (managerCount.count === 0) {
      console.log('Seeding Managers...');
      const managerPwdHash = await bcrypt.hash('manager123', 10);
      const adminPwdHash = await bcrypt.hash('admin123', 10);

      // Manager for Hostel A (id = 1)
      await query.run(`
        INSERT INTO Hostel_Manager (Username, Fname, Lname, Mob_no, Hostel_id, Pwd, Isadmin)
        VALUES (?, ?, ?, ?, ?, ?, 0)
      `, ['managerA', 'John', 'Doe', '9876543210', 1, managerPwdHash]);

      // Admin (Isadmin = 1, linked to Hostel B / id = 2)
      await query.run(`
        INSERT INTO Hostel_Manager (Username, Fname, Lname, Mob_no, Hostel_id, Pwd, Isadmin)
        VALUES (?, ?, ?, ?, ?, ?, 1)
      `, ['admin', 'Admin', 'User', '9999999999', 2, adminPwdHash]);
    }

    // 5. Seed Applications
    const appCount = await query.get('SELECT COUNT(*) as count FROM Application');
    if (appCount.count === 0) {
      console.log('Seeding Applications...');
      await query.run(`
        INSERT INTO Application (Student_id, Hostel_id, Application_status, Room_No, Message)
        VALUES (?, ?, 0, NULL, ?)
      `, ['B160497CS', 1, 'I am handicapped, so I would like to have a room at the ground floor.']);
    }

    // 6. Seed Messages
    const msgCount = await query.get('SELECT COUNT(*) as count FROM Message');
    if (msgCount.count === 0) {
      console.log('Seeding Messages...');
      const messages = [
        {
          sender: 'B160497CS',
          receiver: 'managerA',
          hostel_id: 1,
          subject: 'Ground Floor Request',
          message: 'Hello Manager, I submitted my application for Hostel A, ground floor room. Thank you!',
          date: '2026-08-13',
          time: '09:14 PM'
        },
        {
          sender: 'managerA',
          receiver: 'B160497CS',
          hostel_id: 1,
          subject: 'RE: Ground Floor Request',
          message: 'Received. I will check and allocate as soon as possible.',
          date: '2026-08-13',
          time: '09:15 PM'
        }
      ];
      for (const m of messages) {
        await query.run(`
          INSERT INTO Message (sender_id, receiver_id, hostel_id, subject_h, message, msg_date, msg_time)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [m.sender, m.receiver, m.hostel_id, m.subject, m.message, m.date, m.time]);
      }
    }

    console.log('Seeding finished successfully.');
  } catch (error) {
    console.error('Error during data seeding:', error);
  }
}

module.exports = {
  db,
  query
};
