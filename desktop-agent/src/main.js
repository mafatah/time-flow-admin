const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const screenshot = require('screenshot-desktop');
const idle = require('node-desktop-idle');
const { createClient } = require('@supabase/supabase-js');

const configPath = path.join(__dirname, '..', 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const supabase = createClient(config.supabase_url, config.supabase_key);

let idleStart = null;

function createWindow() {
  const win = new BrowserWindow({
    width: 300,
    height: 200,
    webPreferences: {
      preload: path.join(__dirname, '../renderer/renderer.js'),
    },
  });

  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, '../renderer/index.html'));
}

async function uploadScreenshot() {
  try {
    const img = await screenshot({ format: 'png' });
    const fileName = `${Date.now()}.png`;
    const { error: uploadError } = await supabase.storage
      .from('screenshots')
      .upload(`${config.user_id}/${fileName}`, img, { contentType: 'image/png' });
    if (uploadError) throw uploadError;

    const { data: publicUrl } = supabase.storage
      .from('screenshots')
      .getPublicUrl(`${config.user_id}/${fileName}`);
    const imageUrl = publicUrl.publicUrl;

    await fetch(`${config.supabase_url}/functions/v1/screenshot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: config.supabase_key,
        Authorization: `Bearer ${config.supabase_key}`,
      },
      body: JSON.stringify({
        user_id: config.user_id,
        project_id: config.project_id,
        timestamp: new Date().toISOString(),
        image_url: imageUrl,
      }),
    });
  } catch (err) {
    console.error('Failed to capture screenshot', err);
  }
}

function startScreenshotLoop() {
  setInterval(() => {
    void uploadScreenshot();
  }, 300000); // 5 minutes
}

async function sendIdleLog(idleEnd) {
  const durationMinutes = Math.round((idleEnd - idleStart) / 60000);
  try {
    await fetch(`${config.supabase_url}/functions/v1/idle-log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: config.supabase_key,
        Authorization: `Bearer ${config.supabase_key}`,
      },
      body: JSON.stringify({
        user_id: config.user_id,
        project_id: config.project_id,
        idle_start: new Date(idleStart).toISOString(),
        idle_end: new Date(idleEnd).toISOString(),
        duration_minutes: durationMinutes,
      }),
    });
  } catch (err) {
    console.error('Failed to send idle log', err);
  }
}

function startIdleMonitor() {
  setInterval(() => {
    const idleMs = idle.getIdleTime();
    if (idleStart === null && idleMs >= 180000) {
      idleStart = Date.now() - idleMs;
    }
    if (idleStart !== null && idleMs < 1000) {
      const end = Date.now();
      void sendIdleLog(end);
      idleStart = null;
    }
  }, 10000);
}

app.whenReady().then(() => {
  createWindow();
  startScreenshotLoop();
  startIdleMonitor();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
