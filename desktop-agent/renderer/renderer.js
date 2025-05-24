console.log('Desktop agent renderer running');

let startTime = null;
let timerInterval = null;
let currentEmployee = null;

// Login functionality
function login() {
  const employeeId = document.getElementById('employeeId').value.trim();
  if (!employeeId) {
    alert('Please enter your Employee ID');
    return;
  }
  
  currentEmployee = {
    id: employeeId,
    projectId: document.getElementById('projectId').value.trim() || 'default'
  };
  
  // Update UI
  document.getElementById('employeeName').textContent = `Welcome, ${employeeId}!`;
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('trackingScreen').style.display = 'block';
  
  // Save employee info to config
  updateConfig();
}

// Logout functionality
function logout() {
  if (timerInterval) {
    stopWork();
  }
  currentEmployee = null;
  document.getElementById('loginScreen').style.display = 'block';
  document.getElementById('trackingScreen').style.display = 'none';
  document.getElementById('employeeId').value = '';
  document.getElementById('projectId').value = '';
}

// Start work timer
function startWork() {
  startTime = new Date();
  timerInterval = setInterval(updateTimer, 1000);
  
  // Update UI
  document.getElementById('startBtn').style.display = 'none';
  document.getElementById('stopBtn').style.display = 'inline-block';
  document.getElementById('status').className = 'status working';
  document.getElementById('status').textContent = '✅ Currently Working';
  
  console.log('Work started at:', startTime);
}

// Stop work timer
function stopWork() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  
  const endTime = new Date();
  const duration = endTime - startTime;
  
  // Update UI
  document.getElementById('startBtn').style.display = 'inline-block';
  document.getElementById('stopBtn').style.display = 'none';
  document.getElementById('status').className = 'status stopped';
  document.getElementById('status').textContent = '⏸️ Work Stopped';
  document.getElementById('timer').textContent = '00:00:00';
  
  console.log('Work stopped. Duration:', Math.round(duration / 1000), 'seconds');
  
  // Reset for next session
  startTime = null;
}

// Update timer display
function updateTimer() {
  if (!startTime) return;
  
  const now = new Date();
  const elapsed = now - startTime;
  
  const hours = Math.floor(elapsed / (1000 * 60 * 60));
  const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((elapsed % (1000 * 60)) / 1000);
  
  const timeString = 
    String(hours).padStart(2, '0') + ':' +
    String(minutes).padStart(2, '0') + ':' +
    String(seconds).padStart(2, '0');
  
  document.getElementById('timer').textContent = timeString;
}

// Update config file with current employee
function updateConfig() {
  if (currentEmployee) {
    // This would normally communicate with the main process
    console.log('Employee logged in:', currentEmployee);
  }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', function() {
  console.log('Time Flow Employee Tracker initialized');
});
