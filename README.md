# NIT Calicut - Hostel Room Allocation & Management System

A full-stack web application built for Hostel Room Allocation and Management at NIT Calicut. The system provides role-based access for students, hostel managers, and administrators with real-time room application tracking, allocation workflows, and messaging.

---

## 📁 Project Architecture & Clean Folder Structure

```
Hostel-Management-System/
├── src/                          # Backend Services (Node.js & Express)
│   ├── server.js                 # API endpoints, auth middleware & static router
│   └── db.js                     # SQLite database schema, connections & seeds
├── public/                       # Frontend SPA (Hostel Management Portal)
│   ├── index.html                # Main application interface with cache-buster
│   ├── style.css                 # Modern CSS design system (Glassmorphism & Responsive)
│   └── app.js                    # Client logic, state management & REST API client
├── data/                         # Persistent Database Storage
│   └── hms.db                    # SQLite database file
├── legacy_php/                   # Archived Legacy PHP & MySQL Code (NIT Calicut Coursework)
│   ├── admin/
│   ├── database/
│   ├── dumping/
│   ├── includes/
│   ├── templates/
│   ├── web/
│   └── *.php (about.php, home.php, allocate_room.php, etc.)
├── Documentation/                # System Design & Requirements Documents
│   ├── SDD.docx
│   ├── SRS.docx
│   └── UserManual.docx
├── package.json                  # Dependencies & scripts
└── README.md                     # Documentation & usage guide
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v18.x or newer (Tested on Node.js v22+)
- **NPM**: v9.x or newer

### 2. Start the Server
```bash
npm start
```

The application will start on:
👉 **`http://localhost:5000`**

*(Default port is set to 5000 to prevent port collisions with other local development projects).*

---

## 🔑 Pre-Configured Test Credentials

| Role | Username / Roll No | Password | Description |
| :--- | :--- | :--- | :--- |
| **Student (Allocated)** | `B160497CS` | `student123` | Student Prajwal Ghoradkar (GIRLS HOSTEL, Room 101) |
| **Student (Unallocated)** | `B160000CS` | `student123` | Can apply for hostel rooms |
| **Student (Harika)** | `23SO1A0519` | `23SO1A0519` | Student Harika (GIRLS HOSTEL) |
| **Hostel Manager** | `managerA` | `manager123` | Manager for Hostel Block 1 |
| **Administrator** | `admin` | `admin123` | System Administrator |

---

## 🌟 Core Features

- **Student Portal**:
  - Live profile and current room allocation status.
  - Multi-hostel room application submission with special requirements notes.
  - Direct messaging with the hostel warden / manager.
  - Profile details editor and password management.

- **Hostel Manager & Admin Portal**:
  - Real-time room occupancy analytics (Total Rooms, Allocated Rooms, Vacant Rooms).
  - One-click room allocation and rejection for incoming student applications.
  - Comprehensive room directory with resident details.
  - Residing student roster with room vacating capabilities.
  - Broadcast notifications and direct student communications.
