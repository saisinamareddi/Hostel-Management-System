// Global State
let currentUser = null; // { id, fname, lname, type, isAdmin, hostelId }
let activeSection = '';

// API URL Prefix
const API_PREFIX = '/api';

// On Document Load
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  const session = localStorage.getItem('hms_session');
  if (session) {
    currentUser = JSON.parse(session);
    showDashboard();
  } else {
    showAuth();
  }
}

// --- UTILITIES ---

function showLoader() {
  document.getElementById('loader').classList.remove('hidden');
}

function hideLoader() {
  document.getElementById('loader').classList.add('hidden');
}

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');
  
  toastMessage.textContent = message;
  toast.className = 'toast'; // Reset
  
  if (type === 'success') {
    toast.style.borderLeftColor = 'var(--color-success)';
  } else if (type === 'error') {
    toast.style.borderLeftColor = 'var(--color-danger)';
  } else if (type === 'warning') {
    toast.style.borderLeftColor = 'var(--color-warning)';
  } else {
    toast.style.borderLeftColor = 'var(--color-primary)';
  }
  
  toast.classList.remove('hidden');
  
  setTimeout(() => {
    toast.classList.add('hidden');
  }, 4000);
}

// Get Auth headers based on local storage state
function getAuthHeaders() {
  if (!currentUser) return {};
  return {
    'Content-Type': 'application/json',
    'x-user-id': currentUser.id,
    'x-user-type': currentUser.type
  };
}

// --- VIEW SWITCHING ---

function showAuth() {
  document.getElementById('auth-view').classList.remove('hidden');
  document.getElementById('dashboard-view').classList.add('hidden');
  switchAuthTab('student-login');
}

function showDashboard() {
  document.getElementById('auth-view').classList.add('hidden');
  document.getElementById('dashboard-view').classList.remove('hidden');
  
  // Set User Badge in Sidebar
  document.getElementById('sidebar-user-name').textContent = `${currentUser.fname} ${currentUser.lname}`;
  document.getElementById('sidebar-user-role').textContent = currentUser.type === 'student' ? `Student (Roll: ${currentUser.id})` : (currentUser.isAdmin ? 'Global Administrator' : 'Hostel Manager');

  // Toggle navigation categories
  if (currentUser.type === 'student') {
    document.getElementById('nav-student-group').classList.remove('hidden');
    document.getElementById('nav-manager-group').classList.add('hidden');
    switchSubSection('student-profile');
  } else {
    document.getElementById('nav-student-group').classList.add('hidden');
    document.getElementById('nav-manager-group').classList.remove('hidden');
    switchSubSection('manager-stats');
  }
}

// Switch between Login / Signup Tabs in Auth Page
function switchAuthTab(tabName) {
  // Update Tabs UI
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.auth-form').forEach(form => form.classList.add('hidden'));

  if (tabName === 'student-login') {
    document.getElementById('tab-btn-student-login').classList.add('active');
    document.getElementById('form-student-login').classList.remove('hidden');
  } else if (tabName === 'manager-login') {
    document.getElementById('tab-btn-manager-login').classList.add('active');
    document.getElementById('form-manager-login').classList.remove('hidden');
  } else if (tabName === 'signup') {
    document.getElementById('tab-btn-signup').classList.add('active');
    document.getElementById('form-signup').classList.remove('hidden');
  }
}

// Switch Sidebar sections
function switchSubSection(sectionId, event = null) {
  if (event) event.preventDefault();
  activeSection = sectionId;

  // Update navigation visual state
  document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
  
  // Hide all sections
  document.querySelectorAll('.sub-section').forEach(sec => sec.classList.add('hidden'));

  // Activating Nav item & Showing section
  if (sectionId === 'student-profile') {
    document.getElementById('nav-student-profile').classList.add('active');
    document.getElementById('section-student-profile').classList.remove('hidden');
    document.getElementById('section-title').textContent = 'My Profile';
    loadStudentProfile();
  } else if (sectionId === 'student-apply') {
    document.getElementById('nav-student-apply').classList.add('active');
    document.getElementById('section-student-apply').classList.remove('hidden');
    document.getElementById('section-title').textContent = 'Hostel Room Application';
    loadStudentApplySection();
  } else if (sectionId === 'student-messages') {
    document.getElementById('nav-student-messages').classList.add('active');
    document.getElementById('section-student-messages').classList.remove('hidden');
    document.getElementById('section-title').textContent = 'Messages';
    loadStudentMessages();
  } else if (sectionId === 'manager-stats') {
    document.getElementById('nav-manager-stats').classList.add('active');
    document.getElementById('section-manager-stats').classList.remove('hidden');
    document.getElementById('section-title').textContent = 'Dashboard';
    loadManagerDashboard();
  } else if (sectionId === 'manager-apps') {
    document.getElementById('nav-manager-apps').classList.add('active');
    document.getElementById('section-manager-apps').classList.remove('hidden');
    document.getElementById('section-title').textContent = 'Incoming Applications';
    loadManagerApplications();
  } else if (sectionId === 'manager-rooms') {
    document.getElementById('nav-manager-rooms').classList.add('active');
    document.getElementById('section-manager-rooms').classList.remove('hidden');
    document.getElementById('section-title').textContent = 'Room Allocation Directory';
    loadManagerRooms();
  } else if (sectionId === 'manager-students') {
    document.getElementById('nav-manager-students').classList.add('active');
    document.getElementById('section-manager-students').classList.remove('hidden');
    document.getElementById('section-title').textContent = 'Residing Students';
    loadManagerStudents();
  } else if (sectionId === 'manager-messages') {
    document.getElementById('nav-manager-messages').classList.add('active');
    document.getElementById('section-manager-messages').classList.remove('hidden');
    document.getElementById('section-title').textContent = 'Chat Box & Announcements';
    loadManagerMessages();
  }
}

// --- AUTH SUBMISSIONS ---

async function handleStudentLogin(e) {
  e.preventDefault();
  const id = document.getElementById('student-login-id').value.trim();
  const pwd = document.getElementById('student-login-pwd').value;

  showLoader();
  try {
    const res = await fetch(`${API_PREFIX}/student/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id: id, password: pwd })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed.');

    currentUser = data.user;
    localStorage.setItem('hms_session', JSON.stringify(currentUser));
    showToast('Student login successful!', 'success');
    showDashboard();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    hideLoader();
  }
}

async function handleManagerLogin(e) {
  e.preventDefault();
  const username = document.getElementById('manager-login-id').value.trim();
  const pwd = document.getElementById('manager-login-pwd').value;

  showLoader();
  try {
    const res = await fetch(`${API_PREFIX}/manager/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: pwd })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed.');

    currentUser = data.user;
    localStorage.setItem('hms_session', JSON.stringify(currentUser));
    showToast('Manager login successful!', 'success');
    showDashboard();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    hideLoader();
  }
}

async function handleStudentSignup(e) {
  e.preventDefault();
  const fname = document.getElementById('signup-fname').value.trim();
  const lname = document.getElementById('signup-lname').value.trim();
  const student_id = document.getElementById('signup-roll').value.trim();
  const mob_no = document.getElementById('signup-mob').value.trim();
  const dept = document.getElementById('signup-dept').value.trim();
  const year_of_study = document.getElementById('signup-year').value;
  const password = document.getElementById('signup-pwd').value;

  showLoader();
  try {
    const res = await fetch(`${API_PREFIX}/student/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id, fname, lname, mob_no, dept, year_of_study, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed.');

    showToast('Registration successful! You can now login.', 'success');
    document.getElementById('form-signup').reset();
    switchAuthTab('student-login');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    hideLoader();
  }
}

function handleLogout() {
  localStorage.removeItem('hms_session');
  currentUser = null;
  showToast('Logged out successfully.');
  showAuth();
}

// --- STUDENT SECTION LOGIC ---

async function loadStudentProfile() {
  showLoader();
  try {
    const res = await fetch(`${API_PREFIX}/student/profile`, {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    const s = data.profile;
    document.getElementById('prof-fullname').textContent = `${s.Fname} ${s.Lname}`;
    document.getElementById('prof-roll').textContent = `Roll No: ${s.Student_id}`;
    document.getElementById('prof-mobile').textContent = s.Mob_no;
    document.getElementById('prof-dept').textContent = s.Dept;
    document.getElementById('prof-year').textContent = `Year ${s.Year_of_study}`;
    document.getElementById('prof-hostel').textContent = s.Hostel_name || 'Not Allocated';
    document.getElementById('prof-room').textContent = s.Room_No || 'Not Allocated';

    const badge = document.getElementById('prof-room-badge');
    const actions = document.getElementById('profile-action-container');
    if (s.Room_id) {
      badge.textContent = `Room ${s.Room_No} (${s.Hostel_name})`;
      badge.className = 'room-status-badge allocated';
      actions.classList.remove('hidden');
    } else {
      badge.textContent = 'Room Unallocated';
      badge.className = 'room-status-badge';
      actions.classList.add('hidden');
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    hideLoader();
  }
}

async function handleVacateRoom() {
  if (!confirm('Are you sure you want to vacate your hostel room? This action cannot be undone.')) return;
  
  showLoader();
  try {
    const res = await fetch(`${API_PREFIX}/student/vacate`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showToast('Room vacated successfully.', 'success');
    loadStudentProfile();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    hideLoader();
  }
}

async function loadStudentApplySection() {
  showLoader();
  try {
    const resProfile = await fetch(`${API_PREFIX}/student/profile`, {
      headers: getAuthHeaders()
    });
    const dataProfile = await resProfile.json();
    if (!resProfile.ok) throw new Error(dataProfile.error);

    const profile = dataProfile.profile;
    const activeApp = dataProfile.activeApplication;

    const alreadyAllocated = document.getElementById('apply-already-allocated');
    const pendingContainer = document.getElementById('apply-pending-container');
    const form = document.getElementById('form-room-application');

    alreadyAllocated.classList.add('hidden');
    pendingContainer.classList.add('hidden');
    form.classList.add('hidden');

    if (profile.Room_id) {
      alreadyAllocated.classList.remove('hidden');
    } else if (activeApp) {
      pendingContainer.classList.remove('hidden');
      document.getElementById('pending-app-hostel').textContent = activeApp.Hostel_name;
      document.getElementById('pending-app-msg').textContent = activeApp.Message || 'No notes provided.';
    } else {
      form.classList.remove('hidden');
      
      // Load hostels dropdown list
      const resHostels = await fetch(`${API_PREFIX}/hostels`);
      const hostels = await resHostels.json();
      
      const select = document.getElementById('apply-hostel-select');
      select.innerHTML = '<option value="" disabled selected>Choose a hostel...</option>';
      hostels.forEach(h => {
        const option = document.createElement('option');
        option.value = h.Hostel_id;
        option.textContent = `Hostel Block ${h.Hostel_name} (Capacity Limit: ${h.No_of_rooms})`;
        select.appendChild(option);
      });
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    hideLoader();
  }
}

async function handleRoomApplication(e) {
  e.preventDefault();
  const hostel_id = document.getElementById('apply-hostel-select').value;
  const message = document.getElementById('apply-message').value.trim();

  showLoader();
  try {
    const res = await fetch(`${API_PREFIX}/student/apply`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ hostel_id, message })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showToast('Application submitted successfully!', 'success');
    document.getElementById('form-room-application').reset();
    loadStudentApplySection();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    hideLoader();
  }
}

async function loadStudentMessages() {
  showLoader();
  try {
    const res = await fetch(`${API_PREFIX}/messages`, {
      headers: getAuthHeaders()
    });
    const messages = await res.json();
    if (!res.ok) throw new Error(messages.error);

    const tbody = document.getElementById('student-messages-list');
    tbody.innerHTML = '';

    if (messages.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center">No messages found.</td></tr>';
      return;
    }

    messages.forEach(m => {
      const isSender = m.sender_id === currentUser.id;
      const otherParty = isSender ? `To: ${m.receiver_id}` : `From: ${m.sender_id}`;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${m.msg_date} at ${m.msg_time}</td>
        <td><strong>${otherParty}</strong></td>
        <td>${escapeHTML(m.subject_h)}</td>
        <td class="text-muted">${escapeHTML(m.message)}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    hideLoader();
  }
}

// --- MANAGER SECTION LOGIC ---

async function loadManagerDashboard() {
  showLoader();
  try {
    const res = await fetch(`${API_PREFIX}/manager/dashboard`, {
      headers: getAuthHeaders()
    });
    const stats = await res.json();
    if (!res.ok) throw new Error(stats.error);

    document.getElementById('stat-total-rooms').textContent = stats.totalRooms;
    document.getElementById('stat-allocated-rooms').textContent = stats.allocatedRooms;
    document.getElementById('stat-empty-rooms').textContent = stats.emptyRooms;
    document.getElementById('stat-pending-apps').textContent = stats.pendingApplications;
    document.getElementById('stat-total-students').textContent = stats.totalStudents;
    document.getElementById('mgr-hostel-name').textContent = `Block ${stats.hostelName}`;
    
    // Set Pending Notification Badge
    const badge = document.getElementById('badge-pending-apps');
    if (stats.pendingApplications > 0) {
      badge.textContent = stats.pendingApplications;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }

    const rate = stats.totalRooms > 0 ? Math.round((stats.allocatedRooms / stats.totalRooms) * 100) : 0;
    document.getElementById('mgr-occupancy-rate').textContent = `${rate}%`;
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    hideLoader();
  }
}

async function loadManagerApplications() {
  showLoader();
  try {
    // 1. Load Applications
    const resApps = await fetch(`${API_PREFIX}/manager/applications`, {
      headers: getAuthHeaders()
    });
    const apps = await resApps.json();
    if (!resApps.ok) throw new Error(apps.error);

    // 2. Load Empty Rooms for selection dropdowns
    const resRooms = await fetch(`${API_PREFIX}/rooms/empty/${currentUser.hostelId}`);
    const emptyRooms = await resRooms.json();

    const tbody = document.getElementById('manager-apps-list');
    tbody.innerHTML = '';

    if (apps.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center">No pending applications.</td></tr>';
      return;
    }

    apps.forEach(app => {
      const tr = document.createElement('tr');
      
      // Build Room Options Select
      let selectHtml = `<select id="room-select-${app.Application_id}" class="form-select">`;
      selectHtml += `<option value="" disabled selected>Select Room</option>`;
      emptyRooms.forEach(room => {
        selectHtml += `<option value="${room.Room_id}">Room ${room.Room_No}</option>`;
      });
      selectHtml += `</select>`;

      tr.innerHTML = `
        <td>
          <strong>${app.Fname} ${app.Lname}</strong><br>
          <span class="text-muted" style="font-size: 0.8rem;">${app.Student_id}</span>
        </td>
        <td>${app.Dept} (Yr ${app.Year_of_study})<br><span class="text-muted" style="font-size: 0.8rem;">${app.Mob_no}</span></td>
        <td><em>"${escapeHTML(app.Message || 'No notes provided')}"</em></td>
        <td>${selectHtml}</td>
        <td>
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn-primary btn-sm" onclick="allocateRoom(${app.Application_id}, 'approve')">Approve</button>
            <button class="btn-danger btn-sm" onclick="allocateRoom(${app.Application_id}, 'reject')">Reject</button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    hideLoader();
  }
}

async function allocateRoom(appId, action) {
  const payload = {
    application_id: appId,
    action: action
  };

  if (action === 'approve') {
    const roomSelect = document.getElementById(`room-select-${appId}`);
    if (!roomSelect.value) {
      showToast('Please select a room to allocate.', 'warning');
      return;
    }
    payload.room_id = roomSelect.value;
  }

  showLoader();
  try {
    const res = await fetch(`${API_PREFIX}/manager/allocate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showToast(action === 'approve' ? 'Room allocated and application approved.' : 'Application rejected.', 'success');
    loadManagerApplications();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    hideLoader();
  }
}

async function loadManagerRooms() {
  showLoader();
  try {
    const res = await fetch(`${API_PREFIX}/manager/rooms`, {
      headers: getAuthHeaders()
    });
    const rooms = await res.json();
    if (!res.ok) throw new Error(rooms.error);

    const tbody = document.getElementById('manager-rooms-list');
    tbody.innerHTML = '';

    if (rooms.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center">No rooms registered.</td></tr>';
      return;
    }

    rooms.forEach(r => {
      const isAllocated = r.Allocated === 1;
      const statusText = isAllocated ? 'Allocated' : 'Empty';
      const statusClass = isAllocated ? 'text-success' : 'text-warning';
      const occupantName = isAllocated ? `${r.Fname} ${r.Lname}` : 'N/A';
      const occupantRoll = isAllocated ? r.Student_id : 'N/A';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>Room ${r.Room_No}</strong></td>
        <td class="${statusClass}"><strong>${statusText}</strong></td>
        <td>${occupantName}</td>
        <td><span class="text-muted">${occupantRoll}</span></td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    hideLoader();
  }
}

async function loadManagerStudents() {
  showLoader();
  try {
    const res = await fetch(`${API_PREFIX}/manager/students`, {
      headers: getAuthHeaders()
    });
    const students = await res.json();
    if (!res.ok) throw new Error(students.error);

    const tbody = document.getElementById('manager-students-list');
    tbody.innerHTML = '';

    if (students.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center">No students reside in this block.</td></tr>';
      return;
    }

    students.forEach(s => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${s.Fname} ${s.Lname}</strong></td>
        <td>${s.Student_id}</td>
        <td>${s.Mob_no}</td>
        <td>${s.Dept} (Year ${s.Year_of_study})</td>
        <td><span class="text-info">Room ${s.Room_No || 'N/A'}</span></td>
        <td>
          <button class="btn-danger btn-sm" onclick="vacateStudentByManager('${s.Student_id}')">Vacate Student</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    hideLoader();
  }
}

async function vacateStudentByManager(studentId) {
  if (!confirm(`Are you sure you want to vacate the student (Roll No: ${studentId}) from their room?`)) return;

  showLoader();
  try {
    const res = await fetch(`${API_PREFIX}/manager/vacate-student`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ student_id: studentId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showToast('Student room vacated successfully.', 'success');
    loadManagerStudents();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    hideLoader();
  }
}

async function loadManagerMessages() {
  showLoader();
  try {
    const res = await fetch(`${API_PREFIX}/messages`, {
      headers: getAuthHeaders()
    });
    const messages = await res.json();
    if (!res.ok) throw new Error(messages.error);

    const tbody = document.getElementById('manager-messages-list');
    tbody.innerHTML = '';

    if (messages.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center">No messages found.</td></tr>';
      return;
    }

    messages.forEach(m => {
      const isOutgoing = m.sender_id === currentUser.id;
      const typeLabel = isOutgoing ? '<span class="badge badge-accent">Sent</span>' : '<span class="badge" style="background-color:var(--color-success)">Inbox</span>';
      
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${m.msg_date} at ${m.msg_time}</td>
        <td><strong>${isOutgoing ? m.receiver_id : m.sender_id}</strong></td>
        <td>${escapeHTML(m.subject_h)}</td>
        <td class="text-muted">${escapeHTML(m.message)}</td>
        <td>${typeLabel}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    hideLoader();
  }
}

// --- MESSAGING SYSTEM ---

function openNewMessageModal() {
  document.getElementById('form-send-message').reset();
  
  const recipientInput = document.getElementById('msg-recipient');
  
  if (currentUser.type === 'student') {
    recipientInput.value = 'managerA'; // Quick auto-fill default manager ID
    recipientInput.placeholder = 'Manager ID (e.g. managerA)';
  } else {
    recipientInput.value = '';
    recipientInput.placeholder = 'Student Roll No (e.g. B160497CS)';
  }
  
  document.getElementById('message-modal').classList.remove('hidden');
}

function closeNewMessageModal() {
  document.getElementById('message-modal').classList.add('hidden');
}

async function handleSendMessage(e) {
  e.preventDefault();
  const recipient = document.getElementById('msg-recipient').value.trim();
  const subject = document.getElementById('msg-subject').value.trim();
  const message = document.getElementById('msg-body').value.trim();

  showLoader();
  try {
    const payload = {
      receiver_id: recipient,
      subject: subject,
      message: message,
      hostel_id: currentUser.hostelId || null
    };

    const res = await fetch(`${API_PREFIX}/messages/send`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showToast('Message sent successfully.', 'success');
    closeNewMessageModal();
    
    // Refresh messages section
    if (currentUser.type === 'student') {
      loadStudentMessages();
    } else {
      loadManagerMessages();
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    hideLoader();
  }
}

// --- STRING ESCAPING UTILITY ---
function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}
