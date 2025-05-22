let lastActivity = Date.now()

function resetActivity() {
  lastActivity = Date.now()
}

window.addEventListener('mousemove', resetActivity)
window.addEventListener('keydown', resetActivity)

setInterval(() => {
  const now = Date.now()
  const idleTime = now - lastActivity
  if (idleTime > 5 * 60 * 1000) {
    console.log("User is idle")
    // send update to Supabase to mark time_log as idle
  } else {
    console.log("User is active")
  }
}, 5000)
