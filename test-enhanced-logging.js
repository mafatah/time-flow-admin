#!/usr/bin/env node

/**
 * Test script to demonstrate enhanced activity logging
 * This script will trigger various activity types to show the detailed logging
 */

console.log('🧪 Enhanced Activity Logging Test');
console.log('==================================');
console.log('');
console.log('This script will demonstrate the enhanced logging for:');
console.log('  🖱️ Mouse clicks with detailed metrics');
console.log('  ⌨️ Keyboard strokes with session totals');
console.log('  🖱️ Mouse movements with activity scores');
console.log('  📊 Activity summaries with productivity levels');
console.log('');

// Simulate enhanced logging output (since we can't directly access the Electron app from here)
function simulateMouseClickLog() {
  const timestamp = new Date().toISOString();
  const clickCount = 1;
  const totalClicks = Math.floor(Math.random() * 50) + 1;
  const scoreIncrease = 15;
  const activityScore = Math.min(100, Math.floor(Math.random() * 85) + scoreIncrease);
  
  console.log('🖱️ Real mouse click detected: 1 click, total clicks: ' + totalClicks);
  console.log('🖱️ MOUSE CLICK DETAILS:', {
    timestamp: timestamp,
    click_count: clickCount,
    total_session_clicks: totalClicks,
    activity_score_before: activityScore - scoreIncrease,
    activity_score_after: activityScore,
    score_increase: scoreIncrease,
    session_totals: {
      mouse_clicks: totalClicks,
      keystrokes: Math.floor(Math.random() * 200),
      mouse_movements: Math.floor(Math.random() * 500)
    },
    user_status: 'GENUINELY_ACTIVE_CLICKING'
  });
  console.log('');
}

function simulateKeystrokeLog() {
  const timestamp = new Date().toISOString();
  const keystrokeCount = Math.floor(Math.random() * 5) + 1;
  const totalKeystrokes = Math.floor(Math.random() * 200) + keystrokeCount;
  const scoreIncrease = keystrokeCount * 10;
  const activityScore = Math.min(100, Math.floor(Math.random() * 70) + scoreIncrease);
  
  console.log(`⌨️ Real keystroke detected: ${keystrokeCount} keystroke${keystrokeCount > 1 ? 's' : ''}, total keystrokes: ${totalKeystrokes}`);
  console.log('⌨️ KEYSTROKE DETAILS:', {
    timestamp: timestamp,
    keystroke_count: keystrokeCount,
    total_session_keystrokes: totalKeystrokes,
    activity_score_before: activityScore - scoreIncrease,
    activity_score_after: activityScore,
    score_increase: scoreIncrease,
    session_totals: {
      mouse_clicks: Math.floor(Math.random() * 50),
      keystrokes: totalKeystrokes,
      mouse_movements: Math.floor(Math.random() * 500)
    },
    user_status: 'GENUINELY_ACTIVE_TYPING'
  });
  console.log('');
}

function simulateMouseMovementLog() {
  const timestamp = new Date().toISOString();
  const movementCount = Math.floor(Math.random() * 20) + 5;
  const totalMovements = Math.floor(Math.random() * 500) + movementCount;
  const scoreIncrease = movementCount * 2;
  const activityScore = Math.min(100, Math.floor(Math.random() * 60) + scoreIncrease);
  
  console.log(`🖱️ Real mouse movement detected: ${movementCount} movement${movementCount > 1 ? 's' : ''}, total movements: ${totalMovements}`);
  console.log('🖱️ MOUSE MOVEMENT DETAILS:', {
    timestamp: timestamp,
    movement_count: movementCount,
    total_session_movements: totalMovements,
    activity_score_before: activityScore - scoreIncrease,
    activity_score_after: activityScore,
    score_increase: scoreIncrease,
    session_totals: {
      mouse_clicks: Math.floor(Math.random() * 50),
      keystrokes: Math.floor(Math.random() * 200),
      mouse_movements: totalMovements
    },
    user_status: 'GENUINELY_ACTIVE_MOVING'
  });
  console.log('');
}

function simulateActivitySummary() {
  const timestamp = new Date().toISOString();
  const activityScore = Math.floor(Math.random() * 100);
  const totalClicks = Math.floor(Math.random() * 50);
  const totalKeystrokes = Math.floor(Math.random() * 200);
  const totalMovements = Math.floor(Math.random() * 500);
  
  console.log('📊 ACTIVITY SUMMARY:', {
    timestamp: timestamp,
    latest_input_type: 'MOUSE_CLICK',
    current_activity_score: activityScore,
    session_activity: {
      total_clicks: totalClicks,
      total_keystrokes: totalKeystrokes,
      total_movements: totalMovements,
      combined_inputs: totalClicks + totalKeystrokes + totalMovements
    },
    productivity_level: activityScore >= 80 ? 'HIGH' : 
                        activityScore >= 50 ? 'MEDIUM' : 
                        activityScore >= 20 ? 'LOW' : 'MINIMAL',
    user_engagement: 'REAL_USER_ACTIVE'
  });
  console.log('');
}

// Run the demonstration
async function runDemo() {
  console.log('🎯 === ENHANCED LOGGING DEMONSTRATION ===');
  console.log('🎯 This shows detailed logs for keyboard, mouse clicks, and movements...');
  console.log('');
  
  console.log('🎯 [1/6] Mouse click example:');
  simulateMouseClickLog();
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log('🎯 [2/6] Keystroke example:');
  simulateKeystrokeLog();
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log('🎯 [3/6] Mouse movement example:');
  simulateMouseMovementLog();
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log('🎯 [4/6] Multiple keystrokes example:');
  simulateKeystrokeLog();
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log('🎯 [5/6] Activity summary example:');
  simulateActivitySummary();
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log('🎯 [6/6] Multiple mouse clicks example:');
  simulateMouseClickLog();
  
  console.log('🎯 === DEMONSTRATION COMPLETE ===');
  console.log('');
  console.log('✨ Key Features of Enhanced Logging:');
  console.log('   📊 Detailed metrics for each input type');
  console.log('   📈 Activity score tracking with before/after values');
  console.log('   🎯 Session totals for comprehensive monitoring');
  console.log('   🔍 User status classification (CLICKING, TYPING, MOVING)');
  console.log('   📋 Productivity level assessment (HIGH, MEDIUM, LOW, MINIMAL)');
  console.log('   ⏱️ Timestamp tracking for all activities');
  console.log('');
  console.log('🚀 This enhanced logging system provides much more detailed');
  console.log('   information compared to the previous simple logs!');
  console.log('');
  console.log('📝 To see REAL logs from the actual app:');
  console.log('   1. Interact with your mouse and keyboard');
  console.log('   2. Check the Electron app console (should be open in dev mode)');
  console.log('   3. Look for similar detailed log entries with real data');
}

// Run the demo
runDemo().catch(console.error); 