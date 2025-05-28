import AutoLaunch from 'electron-auto-launch';
import { app, dialog } from 'electron';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);
export async function setupAutoLaunch() {
    try {
        if (process.platform === 'win32') {
            await setupWindows();
            return;
        }
        if (process.platform === 'linux') {
            setupLinux();
            return;
        }
        const launcher = new AutoLaunch({ name: app.getName() });
        const enabled = await launcher.isEnabled();
        if (!enabled) {
            await launcher.enable();
        }
    }
    catch (err) {
        console.error('electron-auto-launch failed:', err);
        if (process.platform === 'darwin') {
            try {
                const plist = `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0">\n<dict>\n  <key>Label</key>\n  <string>com.${app.getName()}</string>\n  <key>ProgramArguments</key>\n  <array>\n    <string>${process.execPath}</string>\n  </array>\n  <key>RunAtLoad</key>\n  <true/>\n</dict>\n</plist>`;
                const launchAgents = path.join(app.getPath('home'), 'Library/LaunchAgents');
                const plistPath = path.join(launchAgents, `com.${app.getName()}.plist`);
                fs.mkdirSync(launchAgents, { recursive: true });
                fs.writeFileSync(plistPath, plist);
            }
            catch (e) {
                console.error('Failed to setup LaunchAgent:', e);
                dialog.showErrorBox('Auto Launch', 'Failed to configure auto-launch.');
            }
        }
        else {
            dialog.showErrorBox('Auto Launch', 'Failed to configure auto-launch.');
        }
    }
}
async function setupWindows() {
    const key = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run';
    try {
        await execAsync(`reg query "${key}" /v "${app.getName()}"`);
    }
    catch {
        await execAsync(`reg add "${key}" /v "${app.getName()}" /t REG_SZ /d "${process.execPath}" /f`);
    }
}
function setupLinux() {
    const autostart = path.join(app.getPath('home'), '.config', 'autostart');
    const desktopFile = path.join(autostart, `${app.getName()}.desktop`);
    const contents = `[Desktop Entry]\nType=Application\nName=${app.getName()}\nExec=${process.execPath}\nX-GNOME-Autostart-enabled=true\n`;
    fs.mkdirSync(autostart, { recursive: true });
    fs.writeFileSync(desktopFile, contents);
    fs.chmodSync(desktopFile, 0o755);
}
