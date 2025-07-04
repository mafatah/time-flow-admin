# TimeFlow - Employee Time Tracking & Productivity Monitoring

A modern time tracking and productivity monitoring solution with a clean, streamlined architecture.

## Architecture Overview

### 🖥️ Desktop Agent (`/desktop-agent/`)
**Purpose**: Lightweight background monitoring for employees
- Runs silently on employee machines
- Captures screenshots, tracks apps/URLs, detects idle time
- Connects directly to Supabase database
- Minimal UI for employee login/settings

### 🌐 Web Admin (`/src/`)
**Purpose**: Administrator dashboard (web interface)
- Full-featured admin interface accessible via web browser
- Manages employees, projects, reports, and analytics
- Views all data collected by desktop agents
- Real-time monitoring and reporting

## Quick Start

### For Employees (Desktop Agent)
```bash
cd desktop-agent
npm install
npm start
```

### For Administrators (Web Interface)
```bash
npm install
npm run dev  # Development mode
npm run build  # Production build
```

## Key Features

### Desktop Agent
- ✅ Cross-platform (Windows, Mac, Linux)
- ✅ Automatic screenshot capture
- ✅ Application and URL tracking
- ✅ Idle time detection
- ✅ Anti-cheat monitoring
- ✅ Offline data sync
- ✅ Minimal resource usage

### Web Admin
- ✅ Real-time dashboard
- ✅ Employee management
- ✅ Project tracking
- ✅ Detailed reporting
- ✅ Screenshot viewer
- ✅ Activity analytics
- ✅ Suspicious behavior detection

## Configuration

### Desktop Agent Setup
1. Copy `desktop-agent/config.json.example` to `desktop-agent/config.json`
2. Set your Supabase credentials in environment variables:
   ```bash
   export SUPABASE_URL="your-supabase-url"
   export SUPABASE_ANON_KEY="your-supabase-anon-key"
   ```

### Web Admin Setup
1. Copy `.env.example` to `.env`
2. Configure your environment variables:
   ```bash
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

## Data Flow

```
Desktop Agent → Supabase Database ← Web Admin
```

- **Desktop agents** collect employee activity data and store it in Supabase
- **Web admin** reads from the same Supabase database to display reports and analytics
- All data is automatically synchronized in real-time

## Deployment

### Desktop Agent
Deploy to employee machines using the built-in installer:
```bash
cd desktop-agent
npm run build:mac    # For macOS
npm run build:win    # For Windows
npm run build:linux  # For Linux
```

### Web Admin
Deploy as a web application:
```bash
npm run build
# Deploy the dist/ folder to your web server
```

## Technology Stack

### Desktop Agent
- Electron for cross-platform desktop app
- Node.js for backend functionality
- Supabase for database and authentication

### Web Admin
- React with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- shadcn/ui for components
- Supabase for backend services

## Building the project

The TypeScript configuration is used for compiling the web application.

- `tsconfig.app.json` is used when compiling the web code.

You can build the web application using:

```bash
npm run build:web
```

For development mode:

```bash
npm run dev
```

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/16ca980c-c11a-40b9-9bec-cfa784f78c4d) and click on Share → Publish.

## Working with Codex offline

The Codex environment installs dependencies during setup and then disables
network access. If you need additional packages, add them to
`.openai/setup.sh`. The script runs automatically before the network is
disabled and should install your dependencies using `npm ci`.

## Auto-start permissions

The desktop agent configures itself to start automatically when employees log in.
On **Windows**, a registry entry under
`HKCU\Software\Microsoft\Windows\CurrentVersion\Run` is created.
On **Linux**, a `.desktop` file is written to `~/.config/autostart`.
Both operations require write access to these locations, so ensure the
application has the necessary permissions.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

## Benefits of This Architecture

✅ **Lightweight**: Desktop agent has minimal resource usage  
✅ **Scalable**: Web admin can manage unlimited desktop agents  
✅ **Secure**: All data flows through Supabase database  
✅ **Cross-platform**: Desktop agent works on all platforms  
✅ **No duplication**: Single database, clean architecture  
✅ **Real-time**: Instant synchronization between agents and admin  
✅ **Maintainable**: Clear separation of concerns

## Support

For issues or questions, please create an issue in the GitHub repository.

---

*Built with ❤️ by Ebdaa Digital Technology*
