import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface DependencyCheck {
  name: string;
  command: string;
  required: boolean;
  description: string;
  installInstructions: {
    ubuntu: string;
    fedora: string;
    arch: string;
    generic: string;
  };
}

const LINUX_DEPENDENCIES: DependencyCheck[] = [
  {
    name: 'xdotool',
    command: 'xdotool --version',
    required: false,
    description: 'Enhanced window and app detection',
    installInstructions: {
      ubuntu: 'sudo apt install xdotool',
      fedora: 'sudo dnf install xdotool',
      arch: 'sudo pacman -S xdotool',
      generic: 'Install xdotool using your package manager'
    }
  },
  {
    name: 'wmctrl',
    command: 'wmctrl -h',
    required: false,
    description: 'Window manager control and app detection',
    installInstructions: {
      ubuntu: 'sudo apt install wmctrl',
      fedora: 'sudo dnf install wmctrl',
      arch: 'sudo pacman -S wmctrl',
      generic: 'Install wmctrl using your package manager'
    }
  },
  {
    name: 'xprop',
    command: 'xprop -version',
    required: false,
    description: 'X11 property inspection for app detection',
    installInstructions: {
      ubuntu: 'sudo apt install x11-utils',
      fedora: 'sudo dnf install xorg-x11-utils',
      arch: 'sudo pacman -S xorg-xprop',
      generic: 'Install xprop/x11-utils using your package manager'
    }
  }
];

// Auto-run dependency check on Linux startup
if (process.platform === 'linux') {
  // Delay the check to avoid blocking startup
  setTimeout(() => {
    console.log('🐧 Running Linux dependency check...');
    checkLinuxDependencies().then(dependencies => {
      const missing = dependencies.filter(dep => !dep.available);
      if (missing.length === 0) {
        console.log('✅ All Linux dependencies available for full functionality');
      } else {
        console.log(`⚠️ ${missing.length} optional Linux dependencies missing - functionality may be limited`);
      }
    }).catch(error => {
      console.log('⚠️ Failed to check Linux dependencies:', error.message);
    });
  }, 2000);
}

interface DependencyStatus {
  name: string;
  available: boolean;
  version?: string;
  required: boolean;
  description: string;
  installInstructions: {
    ubuntu: string;
    fedora: string;
    arch: string;
    generic: string;
  };
}

export async function checkLinuxDependencies(): Promise<DependencyStatus[]> {
  if (process.platform !== 'linux') {
    return [];
  }

  const results: DependencyStatus[] = [];
  
  for (const dep of LINUX_DEPENDENCIES) {
    try {
      const { stdout } = await execAsync(dep.command);
      const version = extractVersion(stdout);
      
      results.push({
        ...dep,
        available: true,
        version
      });
    } catch (error) {
      results.push({
        ...dep,
        available: false
      });
    }
  }
  
  return results;
}

function extractVersion(output: string): string | undefined {
  const versionPatterns = [
    /version\s+([0-9.]+)/i,
    /v([0-9.]+)/i,
    /([0-9]+\.[0-9]+\.[0-9]+)/,
    /([0-9]+\.[0-9]+)/
  ];
  
  for (const pattern of versionPatterns) {
    const match = output.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return undefined;
} 