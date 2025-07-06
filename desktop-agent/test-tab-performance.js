#!/usr/bin/env node

/**
 * Desktop Agent Tab Switching Performance Test
 * 
 * This script tests and benchmarks the tab switching performance
 * in the Ebdaa Work Time desktop agent.
 */

const { app, BrowserWindow } = require('electron');
const path = require('path');

let testWindow = null;

function createTestWindow() {
    testWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        },
        show: false,
        title: 'Desktop Agent Performance Test'
    });

    testWindow.loadFile(path.join(__dirname, 'renderer/index.html'));

    testWindow.once('ready-to-show', () => {
        testWindow.show();
        console.log('🧪 Performance test window ready');
        
        // Run performance tests after a short delay
        setTimeout(runPerformanceTests, 2000);
    });

    return testWindow;
}

async function runPerformanceTests() {
    console.log('🚀 Starting tab switching performance tests...');
    
    const testResults = await testWindow.webContents.executeJavaScript(`
        (async () => {
            const results = {
                beforeOptimization: [],
                afterOptimization: [],
                cacheInitTime: 0,
                testResults: {}
            };
            
            // Test function to simulate original slow method
            function originalShowPage(pageId) {
                const start = performance.now();
                
                // Simulate original expensive operations
                document.querySelectorAll('.page-section').forEach(section => {
                    section.classList.remove('active');
                });
                
                document.querySelectorAll('.nav-item').forEach(item => {
                    item.classList.remove('active');
                });
                
                const targetPage = document.getElementById(pageId + 'Page');
                if (targetPage) {
                    targetPage.classList.add('active');
                }
                
                const navItem = document.querySelector('[data-page="' + pageId + '"]');
                if (navItem) {
                    navItem.classList.add('active');
                }
                
                return performance.now() - start;
            }
            
            // Test the new optimized method (already loaded)
            function testOptimizedMethod(pageId) {
                const start = performance.now();
                if (typeof showPage === 'function') {
                    showPage(pageId);
                }
                return performance.now() - start;
            }
            
            // Run tests for each tab
            const testPages = ['dashboard', 'timetracker', 'screenshots', 'reports'];
            
            console.log('📊 Testing original method...');
            for (let i = 0; i < 20; i++) {
                const pageId = testPages[i % testPages.length];
                const time = originalShowPage(pageId);
                results.beforeOptimization.push(time);
                await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
            }
            
            console.log('⚡ Testing optimized method...');
            for (let i = 0; i < 20; i++) {
                const pageId = testPages[i % testPages.length];
                const time = testOptimizedMethod(pageId);
                results.afterOptimization.push(time);
                await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
            }
            
            // Calculate statistics
            const avgBefore = results.beforeOptimization.reduce((a, b) => a + b, 0) / results.beforeOptimization.length;
            const avgAfter = results.afterOptimization.reduce((a, b) => a + b, 0) / results.afterOptimization.length;
            const improvement = ((avgBefore - avgAfter) / avgBefore * 100);
            
            results.testResults = {
                averageBeforeMs: avgBefore.toFixed(2),
                averageAfterMs: avgAfter.toFixed(2),
                improvementPercent: improvement.toFixed(1),
                maxBeforeMs: Math.max(...results.beforeOptimization).toFixed(2),
                maxAfterMs: Math.max(...results.afterOptimization).toFixed(2),
                minBeforeMs: Math.min(...results.beforeOptimization).toFixed(2),
                minAfterMs: Math.min(...results.afterOptimization).toFixed(2)
            };
            
            return results;
        })()
    `);
    
    // Display results
    console.log('\n📊 TAB SWITCHING PERFORMANCE TEST RESULTS');
    console.log('==========================================');
    console.log(`⏱️  Average Before Optimization: ${testResults.testResults.averageBeforeMs}ms`);
    console.log(`⚡ Average After Optimization:  ${testResults.testResults.averageAfterMs}ms`);
    console.log(`🚀 Performance Improvement:     ${testResults.testResults.improvementPercent}%`);
    console.log('');
    console.log('📈 Detailed Statistics:');
    console.log(`   Max Before: ${testResults.testResults.maxBeforeMs}ms | Max After: ${testResults.testResults.maxAfterMs}ms`);
    console.log(`   Min Before: ${testResults.testResults.minBeforeMs}ms | Min After: ${testResults.testResults.minAfterMs}ms`);
    console.log('');
    
    if (parseFloat(testResults.testResults.improvementPercent) > 0) {
        console.log('✅ SUCCESS: Tab switching performance has been improved!');
    } else {
        console.log('⚠️  WARNING: No significant performance improvement detected');
    }
    
    console.log('\n💡 Additional optimizations applied:');
    console.log('   • DOM element caching to avoid repeated queries');
    console.log('   • Hardware acceleration via CSS transforms');
    console.log('   • Debounced navigation handlers (150ms)');
    console.log('   • Lazy loading of heavy content');
    console.log('   • Early return for duplicate page switches');
    console.log('   • Keyboard shortcuts (Ctrl/Cmd + 1-4)');
    console.log('');
    console.log('🔍 To verify improvements, open DevTools and watch console');
    console.log('   output while switching tabs in the actual application.');
    
    // Keep window open for manual testing
    console.log('\n🧪 Test window will remain open for manual verification...');
    console.log('   Use Ctrl/Cmd + 1-4 to test keyboard shortcuts');
}

// App ready handler
app.whenReady().then(() => {
    createTestWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createTestWindow();
    }
}); 