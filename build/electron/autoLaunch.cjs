"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupAutoLaunch = setupAutoLaunch;
const electron_auto_launch_1 = __importDefault(require("electron-auto-launch"));
const electron_1 = require("electron");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
async function setupAutoLaunch() {
    try {
        if (process.platform === 'win32') {
            await setupWindows();
            return;
        }
        if (process.platform === 'linux') {
            setupLinux();
            return;
        }
        const launcher = new electron_auto_launch_1.default({ name: electron_1.app.getName() });
        const enabled = await launcher.isEnabled();
        if (!enabled) {
            await launcher.enable();
        }
    }
    catch (err) {
        console.error('electron-auto-launch failed:', err);
        if (process.platform === 'darwin') {
            try {
                const plist = `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0">\n<dict>\n  <key>Label</key>\n  <string>com.${electron_1.app.getName()}</string>\n  <key>ProgramArguments</key>\n  <array>\n    <string>${process.execPath}</string>\n  </array>\n  <key>RunAtLoad</key>\n  <true/>\n</dict>\n</plist>`;
                const launchAgents = path_1.default.join(electron_1.app.getPath('home'), 'Library/LaunchAgents');
                const plistPath = path_1.default.join(launchAgents, `com.${electron_1.app.getName()}.plist`);
                fs_1.default.mkdirSync(launchAgents, { recursive: true });
                fs_1.default.writeFileSync(plistPath, plist);
            }
            catch (e) {
                console.error('Failed to setup LaunchAgent:', e);
                electron_1.dialog.showErrorBox('Auto Launch', 'Failed to configure auto-launch.');
            }
        }
        else {
            electron_1.dialog.showErrorBox('Auto Launch', 'Failed to configure auto-launch.');
        }
    }
}
async function setupWindows() {
    const key = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run';
    try {
        await execAsync(`reg query "${key}" /v "${electron_1.app.getName()}"`);
    }
    catch {
        await execAsync(`reg add "${key}" /v "${electron_1.app.getName()}" /t REG_SZ /d "${process.execPath}" /f`);
    }
}
function setupLinux() {
    const autostart = path_1.default.join(electron_1.app.getPath('home'), '.config', 'autostart');
    const desktopFile = path_1.default.join(autostart, `${electron_1.app.getName()}.desktop`);
    const contents = `[Desktop Entry]\nType=Application\nName=${electron_1.app.getName()}\nExec=${process.execPath}\nX-GNOME-Autostart-enabled=true\n`;
    fs_1.default.mkdirSync(autostart, { recursive: true });
    fs_1.default.writeFileSync(desktopFile, contents);
    fs_1.default.chmodSync(desktopFile, 0o755);
}
