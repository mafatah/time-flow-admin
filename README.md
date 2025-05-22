
# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/16ca980c-c11a-40b9-9bec-cfa784f78c4d

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/16ca980c-c11a-40b9-9bec-cfa784f78c4d) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

## Environment variables

This project uses Supabase. You can create a `.env` file in the project root with the following variables:

```bash
SUPABASE_URL=https://your-supabase-url
SUPABASE_PUBLISHABLE_KEY=your-supabase-key
```

Ensure these variables are set in your environment before running the application.

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/16ca980c-c11a-40b9-9bec-cfa784f78c4d) and click on Share -> Publish.

## Working with Codex offline

The Codex environment installs dependencies during setup and then disables
network access. If you need additional packages, add them to
`.openai/setup.sh`. The script runs automatically before the network is
disabled and should install your dependencies using `npm ci`.

## Auto-start permissions

The application configures itself to start automatically when you log in.
On **Windows**, a registry entry under
`HKCU\Software\Microsoft\Windows\CurrentVersion\Run` is created.
On **Linux**, a `.desktop` file is written to `~/.config/autostart`.
Both operations require write access to these locations, so ensure the
application has the necessary permissions.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
