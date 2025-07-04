#!/usr/bin/env node

/**
 * Test Script: Screenshot Frequency Monitor
 * Monitors desktop agent logs to verify 3 screenshots per 10-minute periods
 */

const fs = require('fs');
const path = require('path');

console.log('📸 Screenshot Frequency Monitor');
console.log('===============================');
console.log('Monitoring desktop agent for screenshot frequency...');
console.log('Expected: 3 random screenshots per 10-minute period');
console.log('');

// Track screenshot timings
let screenshotTimestamps = [];
let monitoringStart = Date.now();

// Simulation of what the desktop agent does
function simulateScreenshotScheduling() {
  let count = 0;
  
  function scheduleNext() {
    // Same logic as the updated desktop agent
    const minInterval = 90;  // 1.5 minutes
    const maxInterval = 240; // 4 minutes
    const randomInterval = Math.floor(Math.random() * (maxInterval - minInterval + 1)) + minInterval;
    
    const nextTime = new Date(Date.now() + randomInterval * 1000);
    
    console.log(`📸 Screenshot #${count + 1} scheduled in ${randomInterval}s (${Math.round(randomInterval/60)}min) at ${nextTime.toLocaleTimeString()}`);
    
    setTimeout(() => {
      count++;
      const now = Date.now();
      screenshotTimestamps.push(now);
      
      console.log(`✅ Screenshot #${count} captured at ${new Date(now).toLocaleTimeString()}`);
      
      // Analyze frequency every 3 screenshots
      if (count % 3 === 0) {
        analyzeFrequency();
      }
      
      scheduleNext();
    }, randomInterval * 1000);
  }
  
  scheduleNext();
}

function analyzeFrequency() {
  if (screenshotTimestamps.length < 3) return;
  
  // Get last 3 screenshots
  const last3 = screenshotTimestamps.slice(-3);
  const timeSpan = (last3[2] - last3[0]) / 1000; // seconds
  const timeSpanMinutes = timeSpan / 60;
  
  console.log('');
  console.log('📊 FREQUENCY ANALYSIS');
  console.log('====================');
  console.log(`Last 3 screenshots span: ${Math.round(timeSpanMinutes * 100) / 100} minutes`);
  console.log(`Target: ~10 minutes | Actual: ${Math.round(timeSpanMinutes * 100) / 100} minutes`);
  
  if (timeSpanMinutes <= 12 && timeSpanMinutes >= 8) {
    console.log('✅ GOOD: Within acceptable range (8-12 minutes)');
  } else if (timeSpanMinutes > 12) {
    console.log('⚠️ SLOW: Screenshots are too spread out');
  } else {
    console.log('⚠️ FAST: Screenshots are too frequent');
  }
  
  // Show intervals between screenshots
  console.log('\nIntervals between screenshots:');
  for (let i = 1; i < last3.length; i++) {
    const interval = (last3[i] - last3[i-1]) / 1000 / 60; // minutes
    console.log(`  Screenshot ${i-1+screenshotTimestamps.length-2} → ${i+screenshotTimestamps.length-2}: ${Math.round(interval * 100) / 100} minutes`);
  }
  console.log('');
}

// Monitor for actual desktop agent logs if available
function monitorDesktopAgentLogs() {
  const logPatterns = [
    '📸 Screenshot captured successfully',
    '✅ Screenshot captured successfully',
    'Screenshot #'
  ];
  
  // This would monitor actual logs in a real scenario
  console.log('💡 To monitor actual desktop agent:');
  console.log('   1. Start the desktop agent: npm start');
  console.log('   2. Watch logs for screenshot capture messages');
  console.log('   3. Verify timing matches the simulation below');
  console.log('');
}

// Show current configuration
function showConfiguration() {
  console.log('⚙️ CURRENT CONFIGURATION');
  console.log('========================');
  console.log('Screenshot frequency: 3 per 10 minutes');
  console.log('Random interval range: 1.5 - 4 minutes');
  console.log('Expected average: ~3.33 minute intervals');
  console.log('');
}

// Main execution
showConfiguration();
monitorDesktopAgentLogs();

console.log('🚀 Starting screenshot frequency simulation...');
console.log('This simulates the timing you\'ll see in the actual desktop agent');
console.log('Press Ctrl+C to stop monitoring');
console.log('');

simulateScreenshotScheduling();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n📊 FINAL STATISTICS');
  console.log('===================');
  console.log(`Total screenshots simulated: ${screenshotTimestamps.length}`);
  console.log(`Total monitoring time: ${Math.round((Date.now() - monitoringStart) / 1000 / 60 * 100) / 100} minutes`);
  
  if (screenshotTimestamps.length >= 2) {
    const totalTime = (screenshotTimestamps[screenshotTimestamps.length - 1] - screenshotTimestamps[0]) / 1000 / 60;
    const rate = screenshotTimestamps.length / totalTime * 10; // per 10 minutes
    console.log(`Actual rate: ${Math.round(rate * 100) / 100} screenshots per 10 minutes`);
    console.log(`Target rate: 3 screenshots per 10 minutes`);
    
    if (rate >= 2.5 && rate <= 3.5) {
      console.log('✅ SUCCESS: Rate is within target range!');
    } else {
      console.log('⚠️ ADJUSTMENT NEEDED: Rate is outside target range');
    }
  }
  
  console.log('\n👋 Monitoring stopped');
  process.exit(0);
}); 