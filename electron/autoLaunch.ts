import AutoLaunch from 'electron-auto-launch';
import { app, dialog } from 'electron';
import fs from 'fs';
import path from 'path';

export async function setupAutoLaunch() {
  try {
    const launcher = new AutoLaunch({ name: app.getName() });
    const enabled = await launcher.isEnabled();
    if (!enabled) {
      await launcher.enable();
    }
  } catch (err) {
    console.error('electron-auto-launch failed:', err);
    // Fallback for macOS using LaunchAgent
    try {
      const plist = `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0">\n<dict>\n  <key>Label</key>\n  <string>com.${app.getName()}</string>\n  <key>ProgramArguments</key>\n  <array>\n    <string>${process.execPath}</string>\n  </array>\n  <key>RunAtLoad</key>\n  <true/>\n</dict>\n</plist>`;
      const launchAgents = path.join(app.getPath('home'), 'Library/LaunchAgents');
      const plistPath = path.join(launchAgents, `com.${app.getName()}.plist`);
      fs.mkdirSync(launchAgents, { recursive: true });
      fs.writeFileSync(plistPath, plist);
    } catch (e) {
      console.error('Failed to setup LaunchAgent:', e);
      dialog.showErrorBox('Auto Launch', 'Failed to configure auto-launch.');
    }
  }
}
