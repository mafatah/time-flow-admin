# 🍎 TimeFlow App Notarization Guide

## ✅ Prerequisites Met
- Apple Developer Program membership ✅
- App-specific password ✅  
- Developer ID certificate ✅
- notarytool available ✅

---

## 🚀 Let's Notarize Your App!

### Step 1: Store Credentials (One-time setup)
```bash
# Store your Apple ID credentials securely in Keychain
xcrun notarytool store-credentials "timeflow-notary" \
  --apple-id "your-apple-id@email.com" \
  --team-id "6GW49LK9V9" \
  --password "your-app-specific-password"
```

### Step 2: Extract App from DMG
```bash
# Mount the signed DMG
hdiutil attach public/downloads/TimeFlow-Signed.dmg -mountpoint /tmp/timeflow_mount

# Copy app to working directory
cp -R "/tmp/timeflow_mount/Ebdaa Work Time.app" ./

# Unmount DMG
hdiutil detach /tmp/timeflow_mount
```

### Step 3: Create ZIP for Notarization
```bash
# Create ZIP archive (required format for notarization)
ditto -c -k --keepParent "Ebdaa Work Time.app" "TimeFlow-notarization.zip"
```

### Step 4: Submit for Notarization
```bash
# Submit to Apple (this will take 2-10 minutes)
xcrun notarytool submit "TimeFlow-notarization.zip" \
  --keychain-profile "timeflow-notary" \
  --wait
```

### Step 5: Staple the Ticket
```bash
# Once approved, staple the notarization ticket to the app
xcrun stapler staple "Ebdaa Work Time.app"
```

### Step 6: Verify Notarization
```bash
# Verify the app is properly notarized
xcrun stapler validate "Ebdaa Work Time.app"
spctl --assess --type exec "Ebdaa Work Time.app"
```

### Step 7: Create Notarized DMG
```bash
# Create new DMG with notarized app
hdiutil create -volname "Install Ebdaa Work Time" \
  -srcfolder "Ebdaa Work Time.app" \
  -ov -format UDZO \
  "TimeFlow-Notarized.dmg"

# Sign the DMG
codesign --force --sign "Developer ID Application: Ebdaa Digital Technology (6GW49LK9V9)" \
  "TimeFlow-Notarized.dmg"
```

---

## 🎯 Expected Results

### Before Notarization:
- Security warning: "Apple could not verify..."
- User must right-click → Open
- Shows as "unidentified developer"

### After Notarization:
- ✅ No security warnings
- ✅ Double-click to install works
- ✅ Shows as trusted developer
- ✅ Professional user experience

---

## 🔧 Troubleshooting

### Common Issues:
1. **Invalid credentials**: Check Apple ID and app-specific password
2. **Wrong team ID**: Verify 6GW49LK9V9 is correct
3. **App rejected**: Check for prohibited APIs or hardened runtime issues
4. **Network timeout**: Retry submission

### Check Status:
```bash
# Get submission history
xcrun notarytool history --keychain-profile "timeflow-notary"

# Get specific submission info
xcrun notarytool info SUBMISSION_ID --keychain-profile "timeflow-notary"

# Get detailed logs if rejected
xcrun notarytool log SUBMISSION_ID --keychain-profile "timeflow-notary"
```

---

## 📋 Next Steps After Notarization

1. **Test on clean Mac** - verify no warnings
2. **Update GitHub release** with notarized DMG
3. **Update download links** to use notarized version
4. **Document the process** for future releases

---

## 💡 Benefits You'll Get

- **Zero user friction** - no installation warnings
- **Professional appearance** - looks like Mac App Store quality
- **IT department approval** - meets enterprise security standards
- **User confidence** - no scary security messages
- **Easier support** - fewer installation help requests 