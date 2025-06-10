import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface LogEntry {
  timestamp: string;
  message: string;
  type: 'info' | 'error' | 'warning' | 'success';
}

export default function DebugJSLoading() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [networkResults, setNetworkResults] = useState<string>('');
  const [envInfo, setEnvInfo] = useState<string>('');

  // Override console methods to capture logs
  useEffect(() => {
    console.log('🚀 Debug page loaded');
    
    const addToLog = (message: string, type: LogEntry['type'] = 'info') => {
      const newLog: LogEntry = {
        timestamp: new Date().toLocaleTimeString(),
        message,
        type
      };
      setLogs(prev => [...prev, newLog]);
    };

    // Store original console methods
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    // Override console methods to capture ALL output
    console.log = function(...args: any[]) {
      originalLog.apply(console, args);
      addToLog(args.join(' '), 'info');
    };

    console.error = function(...args: any[]) {
      originalError.apply(console, args);
      const errorMessage = args.join(' ');
      addToLog('❌ ' + errorMessage, 'error');
      
      // Check for specific syntax error
      if (errorMessage.includes('SyntaxError') || errorMessage.includes('Unexpected token')) {
        addToLog('🚨 SYNTAX ERROR DETECTED: ' + errorMessage, 'error');
      }
    };

    console.warn = function(...args: any[]) {
      originalWarn.apply(console, args);
      addToLog('⚠️ ' + args.join(' '), 'warning');
    };

    // Enhanced global error handlers with more specific detection
    const handleError = (event: ErrorEvent) => {
      const errorDetails = {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      };
      
      const errorString = `Global Error: ${event.message} at ${event.filename}:${event.lineno}`;
      addToLog(errorString, 'error');
      
      // Specifically look for syntax errors
      if (event.message.includes('Unexpected token') || event.message.includes('SyntaxError')) {
        addToLog('🚨 SYNTAX ERROR IN GLOBAL HANDLER: ' + JSON.stringify(errorDetails), 'error');
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const rejectionDetails = `Unhandled Promise Rejection: ${event.reason}`;
      addToLog(rejectionDetails, 'error');
      
      if (rejectionDetails.includes('Unexpected token') || rejectionDetails.includes('SyntaxError')) {
        addToLog('🚨 SYNTAX ERROR IN PROMISE REJECTION: ' + rejectionDetails, 'error');
      }
    };

    // Add resource error detection for script tags
    const handleResourceError = (event: Event) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'SCRIPT') {
        const scriptElement = target as HTMLScriptElement;
        addToLog(`🚨 SCRIPT LOADING ERROR: ${scriptElement.src}`, 'error');
      }
    };

    window.addEventListener('error', handleError, true); // Use capture phase
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    document.addEventListener('error', handleResourceError, true); // Capture resource loading errors

    // Initialize environment info
    initEnvInfo();

    // Cleanup
    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
      window.removeEventListener('error', handleError, true);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      document.removeEventListener('error', handleResourceError, true);
    };
  }, []);

  const initEnvInfo = () => {
    const info = `
URL: ${window.location.href}
Origin: ${window.location.origin}
Pathname: ${window.location.pathname}
User Agent: ${navigator.userAgent}
Referrer: ${document.referrer}
Protocol: ${window.location.protocol}
Host: ${window.location.host}
Document Ready State: ${document.readyState}
Local Storage Available: ${!!localStorage}
Session Storage Available: ${!!sessionStorage}
React App Version: ${(import.meta.env as any).VITE_APP_VERSION || 'Unknown'}
Build Mode: ${(import.meta.env as any).MODE || 'Unknown'}
`;
    setEnvInfo(info);
  };

  const testJSBundles = async () => {
    setNetworkResults('🔄 Testing JavaScript bundle loading...');
    
    const bundlePaths = [
      '/assets/index.js',
      '/assets/index-wvEYJeXC.js',
      '/assets/index-Dg4k3RGd.js',
      '/dist/assets/index.js',
      './assets/index.js',
      `${window.location.origin}/assets/index.js`
    ];
    
    let results = 'Bundle Test Results:\n';
    
    for (const path of bundlePaths) {
      try {
        console.log(`Testing bundle: ${path}`);
        const response = await fetch(path, { method: 'GET' });
        const contentType = response.headers.get('content-type') || 'unknown';
        
        if (response.ok) {
          const text = await response.text();
          const preview = text.substring(0, 200);
          
          if (text.startsWith('<!DOCTYPE html>') || text.includes('<html')) {
            results += `❌ ${path} - Status: ${response.status} - RETURNING HTML INSTEAD OF JS!\n`;
            results += `   Content-Type: ${contentType}\n`;
            results += `   Preview: ${preview}...\n\n`;
          } else if (text.includes('SyntaxError') || text.includes('Unexpected token')) {
            results += `❌ ${path} - Status: ${response.status} - CONTAINS SYNTAX ERROR!\n`;
            results += `   Content-Type: ${contentType}\n`;
            results += `   Preview: ${preview}...\n\n`;
          } else {
            results += `✅ ${path} - Status: ${response.status} - Valid JS\n`;
            results += `   Content-Type: ${contentType}\n`;
            results += `   Size: ${text.length} chars\n\n`;
          }
        } else {
          results += `❌ ${path} - Status: ${response.status} - ${response.statusText}\n\n`;
        }
      } catch (error: any) {
        results += `❌ ${path} - Error: ${error.message}\n\n`;
        console.error(`Error testing ${path}:`, error);
      }
    }
    
    setNetworkResults(results);
  };

  const testAPIEndpoint = async () => {
    try {
      const response = await fetch('/reports/time-reports');
      const text = await response.text();
      
      let result = `API Test Results:\n`;
      result += `Status: ${response.status}\n`;
      result += `Content-Type: ${response.headers.get('content-type')}\n`;
      
      if (text.startsWith('<!DOCTYPE html>') || text.includes('<html')) {
        result += `❌ Received HTML instead of expected content\n`;
        result += `First 500 chars: ${text.substring(0, 500)}...\n`;
      } else {
        result += `✅ Received non-HTML content\n`;
      }
      
      setNetworkResults(result);
    } catch (error: any) {
      setNetworkResults(`❌ API Test Error: ${error.message}`);
    }
  };

  const checkConsoleErrors = () => {
    const errorCount = logs.filter(log => log.type === 'error').length;
    setNetworkResults(`Console Errors Found: ${errorCount}`);
  };

  const clearLog = () => {
    setLogs([]);
  };

  const simulateError = () => {
    try {
      // Simulate the reported error
      eval('< unexpected token');
    } catch (error: any) {
      console.error('Simulated syntax error:', error);
    }
  };

  const testModuleImport = () => {
    try {
      // Test dynamic import with a non-existent module (using string to avoid build issues)
      const modulePath = './nonexistent-module.js';
      import(/* @vite-ignore */ modulePath)
        .catch(error => console.error('Module import test failed:', error));
    } catch (error: any) {
      console.error('Module import error:', error);
    }
  };

  const testTimeReportsPage = () => {
    console.log('Attempting to navigate to time reports page...');
    window.location.href = '/reports/time-reports';
  };

  const getLogTypeColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'error': return 'text-red-600 bg-red-50';
      case 'warning': return 'text-orange-600 bg-orange-50';
      case 'success': return 'text-green-600 bg-green-50';
      default: return 'text-blue-600 bg-blue-50';
    }
  };

  const monitorScriptLoading = () => {
    console.log('🔍 Starting script loading monitor...');
    
    // Override the original script creation to monitor all scripts
    const originalCreateElement = document.createElement;
    let scriptCount = 0;
    
    document.createElement = function(tagName: string) {
      const element = originalCreateElement.call(this, tagName);
      
      if (tagName.toLowerCase() === 'script') {
        scriptCount++;
        const scriptElement = element as HTMLScriptElement;
        const scriptId = `script-${scriptCount}`;
        
        console.log(`📜 Script ${scriptId} created`);
        
        scriptElement.addEventListener('load', () => {
          console.log(`✅ Script ${scriptId} loaded successfully: ${scriptElement.src}`);
        });
        
        scriptElement.addEventListener('error', (event) => {
          console.error(`❌ Script ${scriptId} failed to load: ${scriptElement.src}`, event);
        });
        
        // Monitor for syntax errors by trying to execute script content
        if (scriptElement.src) {
          fetch(scriptElement.src)
            .then(response => response.text())
            .then(content => {
              if (content.startsWith('<!DOCTYPE') || content.includes('<html')) {
                console.error(`🚨 Script ${scriptId} contains HTML instead of JavaScript: ${scriptElement.src}`);
              } else if (content.includes('SyntaxError') || content.includes('Unexpected token')) {
                console.error(`🚨 Script ${scriptId} contains syntax errors: ${scriptElement.src}`);
              }
            })
            .catch(err => {
              console.error(`❌ Could not fetch script ${scriptId} content: ${scriptElement.src}`, err);
            });
        }
      }
      
      return element;
    };
    
    console.log('✅ Script loading monitor active');
    setNetworkResults('Script loading monitor activated. Check console for real-time script loading events.');
  };

  const testTimeReportsWithMonitoring = () => {
    console.log('🎯 Testing Time Reports page with full monitoring...');
    
    // Start monitoring before navigation
    monitorScriptLoading();
    
    // Add additional error listeners specifically for this test
    const errorHandler = (event: ErrorEvent) => {
      if (event.message.includes('Unexpected token') || event.message.includes('SyntaxError')) {
        console.error('🚨 CAUGHT SYNTAX ERROR DURING TIME REPORTS TEST:', {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack
        });
      }
    };
    
    window.addEventListener('error', errorHandler);
    
    // Navigate after a short delay
    setTimeout(() => {
      console.log('🚀 Navigating to time reports...');
      window.location.href = '/reports/time-reports';
    }, 1000);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">🔍 TimeFlow JavaScript Loading Debugger</h1>
        <Badge variant="outline">React Version</Badge>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>📊 Environment Information</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-50 p-4 rounded text-sm overflow-x-auto whitespace-pre-wrap">
            {envInfo}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>🌐 Network & Bundle Tests</CardTitle>
          <CardDescription>Test JavaScript bundle accessibility and API endpoints</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={testJSBundles} variant="outline">Test JS Bundle Loading</Button>
            <Button onClick={testAPIEndpoint} variant="outline">Test API Endpoint</Button>
            <Button onClick={checkConsoleErrors} variant="outline">Check Console Errors</Button>
            <Button onClick={monitorScriptLoading} variant="outline">Monitor Script Loading</Button>
          </div>
          {networkResults && (
            <pre className="bg-gray-50 p-4 rounded text-sm overflow-x-auto whitespace-pre-wrap">
              {networkResults}
            </pre>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>📝 Live Console Log</CardTitle>
          <CardDescription>Real-time capture of console messages</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={clearLog} variant="outline" className="mb-4">Clear Log</Button>
          <div className="max-h-96 overflow-y-auto space-y-2 border rounded p-4">
            {logs.map((log, index) => (
              <div
                key={index}
                className={`p-2 rounded text-sm border-l-4 ${getLogTypeColor(log.type)}`}
              >
                <strong>[{log.timestamp}]</strong> {log.message}
              </div>
            ))}
            {logs.length === 0 && (
              <div className="text-gray-500 text-center py-4">No logs yet...</div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>🔧 Manual Tests</CardTitle>
          <CardDescription>Simulate various error conditions and test scenarios</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button onClick={simulateError} variant="outline">Simulate JS Error</Button>
            <Button onClick={testModuleImport} variant="outline">Test Module Import</Button>
            <Button onClick={testTimeReportsWithMonitoring} variant="outline">Load Time Reports Page</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 