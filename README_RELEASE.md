# 🚀 TimeFlow Release - Quick Reference

## 🎯 Quick Start

```bash
# Interactive release menu (recommended)
./quick-release.sh

# Complete cross-platform release
./scripts/ultimate-release.sh

# macOS-only release (faster)
./scripts/complete-release.sh
```

## 📦 Current Version: v1.0.39

## 🔗 Links
- **GitHub**: https://github.com/mafatah/time-flow-admin/releases
- **Download**: https://time-flow-admin.vercel.app/download
- **Login**: https://worktime.ebdaadt.com/login

## ⚡ One-Liner Releases

```bash
# Ultimate release with confirmation
./quick-release.sh && echo "✅ Release complete!"

# Quick macOS build and release
./scripts/complete-release.sh

# Test cross-platform builds
./scripts/build-cross-platform.sh
```

## 🔐 Credentials (Already Configured)
- Apple ID: `alshqawe66@gmail.com`
- Team ID: `6GW49LK9V9`
- GitHub: `mafatah/time-flow-admin`

## 📋 What Each Script Does

### `./quick-release.sh`
Interactive menu with 5 options:
1. 🍎 Ultimate Release (All platforms + GitHub)
2. 🍎 Complete Release (macOS only + GitHub)
3. 🪟🐧 Cross-Platform Build (Windows + Linux)
4. 📋 Web Build Only
5. ❌ Cancel

### `./scripts/ultimate-release.sh`
- Builds macOS (Intel + ARM64), Windows, Linux
- Signs and notarizes macOS builds
- Creates GitHub release
- Updates auto-update configs
- **Time**: 10-15 minutes

### `./scripts/complete-release.sh`
- Builds macOS (Intel + ARM64) only
- Signs and notarizes
- Creates GitHub release
- **Time**: 5-10 minutes

### `./scripts/build-cross-platform.sh`
- Builds Windows EXE and Linux AppImage
- No GitHub release
- **Time**: 2-5 minutes

## 🚨 Emergency Commands

```bash
# Check current version
node -p "require('./package.json').version"

# Quick web build
npm run build

# Manual version bump
npm version patch --no-git-tag-version

# Check Apple certificate
security find-identity -v -p codesigning

# Check GitHub auth
gh auth status
```

## 📁 Generated Files

After release:
```
dist/
├── TimeFlow-v1.0.39-Intel.dmg       # macOS Intel
├── TimeFlow-v1.0.39-ARM64.dmg       # macOS Apple Silicon
├── TimeFlow-v1.0.39-Setup.exe       # Windows
└── TimeFlow-v1.0.39-Linux.AppImage  # Linux

Auto-update configs:
├── latest-mac.yml                    # macOS updates
└── latest.yml                        # Windows updates
```

## ✅ Success Checklist

After running release:
- [ ] GitHub release created
- [ ] All platform files uploaded
- [ ] Download page updated
- [ ] Auto-update configs published
- [ ] No security warnings on installation

## 🆘 Troubleshooting

```bash
# If Apple signing fails
security find-identity -v -p codesigning

# If GitHub CLI auth fails
gh auth login

# If build fails
rm -rf dist build node_modules/.cache
npm ci

# If notarization times out
# Wait 10-15 minutes, Apple's service can be slow
```

## 📖 Full Documentation

For complete details, see:
- `RELEASE_WORKFLOW_GUIDE.md` - Comprehensive guide
- `RELEASE_SUMMARY.md` - What was implemented

---

**🎯 TL;DR: Run `./quick-release.sh` and choose option 1 for complete release!** 