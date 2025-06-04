// Runtime test for activity tracking - run this while the desktop app is running
console.log('🧪 Runtime Activity Tracking Test');
console.log('=================================');
console.log('This will test if the activity tracking is working in real-time.');
console.log('Make sure the desktop app is running first!');

console.log('\n📋 Test Instructions:');
console.log('1. Keep this terminal visible');
console.log('2. Move your mouse around for 10 seconds');
console.log('3. Click the mouse a few times');
console.log('4. Type on your keyboard');
console.log('5. Then stay idle for 30 seconds');

console.log('\n👀 Watch the desktop app console for:');
console.log('✅ "🖱️ Mouse moved: X px" - Mouse movement detection');
console.log('✅ "🖱️ Click detected" - Mouse click detection');
console.log('✅ "⌨️ Keystroke detected" - Keyboard activity');
console.log('✅ "💤 ACTIVITY_DECAY" - Score decay when idle');
console.log('✅ "⚡ REAL_ACTIVITY_RECORDED" - Activity recording');

console.log('\n🎯 Expected Activity Flow:');
console.log('1. Mouse movements should increment mouse_movements counter');
console.log('2. Clicks should increment mouse_clicks counter');
console.log('3. Keystrokes should increment keystrokes counter');
console.log('4. Activity score should increase with activity');
console.log('5. Activity score should decay when idle');
console.log('6. No "stdout.trim is not a function" errors');

console.log('\n✅ If you see the expected logs, the system is working correctly!');
console.log('❌ If you don\'t see activity logs, check the desktop app console.');

process.exit(0); 