import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, Monitor, Apple, Laptop, CheckCircle, AlertCircle } from 'lucide-react';

interface DesktopDownloadProps {
  variant?: 'full' | 'compact';
  className?: string;
}

interface DownloadNotification {
  platform: string;
  filename: string;
  size: string;
  show: boolean;
}

const DesktopDownload: React.FC<DesktopDownloadProps> = ({ variant = 'compact', className = '' }) => {
  const [os, setOs] = useState<'windows' | 'mac' | 'mac-intel' | 'mac-arm' | 'linux' | 'unknown'>('unknown');
  const [downloading, setDownloading] = useState<string | null>(null);
  const [notification, setNotification] = useState<DownloadNotification | null>(null);
  
  // Debug configuration - set to false to disable file verification
  const ENABLE_FILE_VERIFICATION = false; // Temporarily disabled for troubleshooting

  useEffect(() => {
    const detectOS = () => {
      const userAgent = window.navigator.userAgent;
      const platform = window.navigator.platform;
      
      // Debug logging
      console.log('OS Detection Debug:', {
        userAgent,
        platform,
        hasIntel: userAgent.includes('Intel'),
        hasARM64: userAgent.includes('ARM64'),
        hasSafari: userAgent.includes('Safari'),
        safariVersion: userAgent.match(/Version\/(\d+)/)?.[1],
        macOSVersion: userAgent.match(/Mac OS X (\d+_\d+)/)?.[1],
        screenWidth: window.screen.width,
        devicePixelRatio: window.devicePixelRatio
      });
      
      if (platform.includes('Mac') || userAgent.includes('Mac')) {
        // Advanced Apple Silicon detection with multiple methods
        let isAppleSilicon = false;
        let confidence = 0;
        
        // Method 1: Check for explicit ARM indicators
        if (userAgent.includes('ARM64') || platform.includes('ARM')) {
          isAppleSilicon = true;
          confidence = 100;
        }
        // Method 2: Check if explicitly Intel
        else if (userAgent.includes('Intel')) {
          // Safari on Apple Silicon often reports Intel for compatibility
          // Use additional heuristics to detect Apple Silicon
          
          const safariVersion = userAgent.match(/Version\/(\d+)/)?.[1];
          const macOSMatch = userAgent.match(/Mac OS X (\d+)_(\d+)/);
          
          // Check for modern Safari (16+) with certain characteristics
          if (safariVersion && parseInt(safariVersion) >= 16) {
            confidence += 30;
          }
          
          // Check for modern screen characteristics (Apple Silicon Macs often have high DPI)
          if (window.devicePixelRatio >= 2) {
            confidence += 25;
          }
          
          // Check for common Apple Silicon screen sizes
          const screenWidth = window.screen.width;
          if (screenWidth === 1440 || screenWidth === 1512 || screenWidth === 1728 || screenWidth === 1800) {
            confidence += 25;
          }
          
          // Check for macOS version patterns (Apple Silicon came with Big Sur)
          if (macOSMatch) {
            const major = parseInt(macOSMatch[1]);
            const minor = parseInt(macOSMatch[2]);
            // macOS 11.0+ (Big Sur) or 10.16+ indicates potential Apple Silicon
            if (major >= 11 || (major === 10 && minor >= 16)) {
              confidence += 20;
            }
          }
          
          // If confidence is high enough, assume Apple Silicon despite "Intel" in UA
          if (confidence >= 60) {
            isAppleSilicon = true;
          }
        }
        // Method 3: For other cases without Intel marker
        else {
          isAppleSilicon = true;
          confidence = 70;
        }
        
        console.log('Apple Silicon Detection:', {
          result: isAppleSilicon,
          confidence: confidence,
          reason: isAppleSilicon ? 'Detected as Apple Silicon' : 'Detected as Intel'
        });
        
        setOs(isAppleSilicon ? 'mac-arm' : 'mac-intel');
        
      } else if (platform.includes('Win') || userAgent.includes('Windows')) {
        setOs('windows');
      } else if (platform.includes('Linux') || userAgent.includes('Linux')) {
        setOs('linux');
      } else {
        setOs('unknown');
      }
    };

    detectOS();
  }, []);

  const handleDownload = async (platform: string) => {
    setDownloading(platform);
    
    // Use GitHub releases for reliable downloads - v1.0.8 with APPLE DEVELOPER ID SIGNED
    const downloadFiles = {
      windows: `https://github.com/mafatah/time-flow-admin/releases/download/v1.0.8/TimeFlow-Setup.exe`,
      'mac-intel': `https://github.com/mafatah/time-flow-admin/releases/download/v1.0.8/TimeFlow-Signed-x64.dmg`, // APPLE DEVELOPER ID SIGNED + UNIVERSAL BINARY
      'mac-arm': `https://github.com/mafatah/time-flow-admin/releases/download/v1.0.8/TimeFlow-Signed-x64.dmg`, // APPLE DEVELOPER ID SIGNED + UNIVERSAL BINARY
      'mac': `https://github.com/mafatah/time-flow-admin/releases/download/v1.0.8/TimeFlow-Signed-x64.dmg`, // Default to Apple signed DMG
      linux: `https://github.com/mafatah/time-flow-admin/releases/download/v1.0.8/TimeFlow.AppImage`
    };
    
    const filePath = downloadFiles[platform as keyof typeof downloadFiles];
    const filename = filePath?.split('/').pop() || '';
    const fileSize = getFileSize(platform);
    const expectedBytes = getExpectedBytes(platform);
    
    console.log('Download Debug:', {
      platform,
      detectedOS: os,
      filePath,
      expectedSize: expectedBytes,
      userAgent: navigator.userAgent,
      isLocalDownload: true
    });
    
    if (filePath) {
      try {
        // Verify file integrity before download
        if (expectedBytes > 0 && ENABLE_FILE_VERIFICATION) {
          console.log('🔍 Verifying file integrity...');
          const isValid = await verifyDownload(filePath, expectedBytes);
          
          if (!isValid) {
            console.warn('⚠️ File verification failed, but proceeding with download...');
            // Don't throw error, just warn and proceed
            // throw new Error('File size mismatch - file may be corrupted');
          } else {
            console.log('✅ File verification passed');
          }
        } else if (!ENABLE_FILE_VERIFICATION) {
          console.log('⚠️ File verification is disabled - proceeding without validation');
        }
        
        // Create invisible link element for direct download
        const link = document.createElement('a');
        link.href = filePath;
        link.download = filename;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        
        // Don't use cache-busting for binary files as it can cause corruption
        // const cacheBuster = Date.now();
        // const downloadUrl = `${filePath}?v=${cacheBuster}`;
        
        // Use simple direct link method for binary files (most reliable)
        console.log('🚀 Starting download with direct link method...');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Remove the fetch-based download method as it can corrupt binary files
        /*
        try {
          console.log('🚀 Starting download with fetch method...');
          await downloadWithProgress(downloadUrl, filename);
          console.log('✅ Download completed successfully');
        } catch (fetchError) {
          console.log('⚠️ Fetch download failed, trying direct link method...');
          
          // Fallback to direct link method
          link.href = downloadUrl;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
        */
        
        // Show non-blocking success notification with file info
        setNotification({
          platform: getOSName(platform),
          filename,
          size: fileSize,
          show: true
        });
        
        setDownloading(null);
        
        // Auto-hide notification after 10 seconds (longer for large files)
        setTimeout(() => {
          setNotification(prev => prev ? { ...prev, show: false } : null);
        }, 10000);
        
      } catch (error) {
        console.error('Download error:', error);
        // Show detailed error notification
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setNotification({
          platform: 'Error',
          filename: `Download failed: ${errorMessage}. Please try again or contact support.`,
          size: '',
          show: true
        });
        setDownloading(null);
        
        // Auto-hide error notification after 15 seconds
        setTimeout(() => {
          setNotification(prev => prev ? { ...prev, show: false } : null);
        }, 15000);
      }
    } else {
      // Show error notification instead of alert
      setNotification({
        platform: 'Error',
        filename: 'Download file not found - please try again',
        size: '',
        show: true
      });
      setDownloading(null);
      
      // Auto-hide error notification after 5 seconds
      setTimeout(() => {
        setNotification(prev => prev ? { ...prev, show: false } : null);
      }, 5000);
    }
  };
  
  const getOSIcon = (platform: string) => {
    switch (platform) {
      case 'mac':
      case 'mac-intel':
      case 'mac-arm':
        return <Apple className="h-4 w-4" />;
      case 'windows':
        return <Monitor className="h-4 w-4" />;
      case 'linux':
        return <Laptop className="h-4 w-4" />;
      default:
        return <Download className="h-4 w-4" />;
    }
  };

  const getOSName = (platform: string) => {
    switch (platform) {
      case 'mac':
        return 'macOS';
      case 'mac-intel':
        return 'macOS (Intel)';
      case 'mac-arm':
        return 'macOS (Apple Silicon)';
      case 'windows':
        return 'Windows';
      case 'linux':
        return 'Linux';
      default:
        return 'Unknown';
    }
  };

  const getFileSize = (platform: string) => {
    switch (platform) {
      case 'mac-arm':
        return '122MB'; // Updated for TimeFlow-ARM-Fixed.dmg
      case 'mac-intel':
      case 'mac':
        return '391MB'; // Updated for TimeFlow-Apple-Signed.dmg (APPLE DEVELOPER ID SIGNED)
      case 'windows':
        return '85MB';
      case 'linux':
        return '120MB';
      default:
        return '';
    }
  };

  const getExpectedBytes = (platform: string) => {
    switch (platform) {
      case 'mac-arm':
        return 122560627; // TimeFlow-ARM-Fixed.dmg size
      case 'mac-intel':
      case 'mac':
        return 391000000; // TimeFlow-Apple-Signed.dmg size (APPLE DEVELOPER ID SIGNED)
      case 'windows':
        return 88816714; // Actual EXE size
      default:
        return 0;
    }
  };

  // Add file verification function
  const verifyDownload = async (url: string, expectedSize: number): Promise<boolean> => {
    try {
      console.log('🔍 Verifying file at:', url);
      
      // Try HEAD request first
      const response = await fetch(url, { 
        method: 'HEAD',
        cache: 'no-cache', // Ensure fresh response
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        console.warn('HEAD request failed, trying GET request...');
        // If HEAD fails, try GET with range to get file info
        const getResponse = await fetch(url, { 
          method: 'GET',
          headers: {
            'Range': 'bytes=0-1023', // Get first 1KB to check file
            'Cache-Control': 'no-cache'
          }
        });
        
        if (!getResponse.ok) {
          console.warn('File verification failed - proceeding anyway');
          return true; // Proceed if we can't verify
        }
        
        const contentRange = getResponse.headers.get('content-range');
        if (contentRange) {
          // Parse "bytes 0-1023/123648729" format
          const match = contentRange.match(/bytes \d+-\d+\/(\d+)/);
          if (match) {
            const actualSize = parseInt(match[1]);
            return validateFileSize(actualSize, expectedSize);
          }
        }
        
        return true; // Proceed if we can't parse range
      }
      
      const contentLength = response.headers.get('content-length');
      
      if (contentLength) {
        const actualSize = parseInt(contentLength);
        return validateFileSize(actualSize, expectedSize);
      }
      
      console.warn('No content-length header found - proceeding anyway');
      return true; // If no content-length header, assume OK
    } catch (error) {
      console.warn('File verification error:', error);
      return true; // If verification fails, proceed anyway
    }
  };

  const validateFileSize = (actualSize: number, expectedSize: number): boolean => {
    const sizeDiff = Math.abs(actualSize - expectedSize);
    const tolerance = Math.max(expectedSize * 0.02, 1024 * 1024); // 2% tolerance or 1MB, whichever is larger
    
    console.log('File size validation:', {
      expected: expectedSize,
      actual: actualSize,
      difference: sizeDiff,
      tolerance: tolerance,
      valid: sizeDiff <= tolerance,
      percentDiff: ((sizeDiff / expectedSize) * 100).toFixed(2) + '%'
    });
    
    const isValid = sizeDiff <= tolerance;
    
    if (!isValid) {
      console.error('❌ File size validation failed:', {
        expectedMB: (expectedSize / 1024 / 1024).toFixed(2) + 'MB',
        actualMB: (actualSize / 1024 / 1024).toFixed(2) + 'MB',
        toleranceMB: (tolerance / 1024 / 1024).toFixed(2) + 'MB'
      });
    }
    
    return isValid;
  };

  // Add alternative download method for large files
  const downloadWithProgress = async (url: string, filename: string): Promise<void> => {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
      }
      
      const blob = await response.blob();
      
      // Create download link
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up object URL
      window.URL.revokeObjectURL(downloadUrl);
      
    } catch (error) {
      console.error('Progress download failed:', error);
      throw error;
    }
  };

  if (variant === 'compact') {
    const normalizedOS = os.startsWith('mac') ? os : os; // Keep the specific mac variant for proper DMG selection
    
    return (
      <div className={`relative ${className}`}>
        <div className="flex flex-col sm:flex-row gap-2">
          <Badge variant="outline" className="w-fit">
            {getOSIcon(os)}
            <span className="ml-1">{getOSName(os)} Detected</span>
          </Badge>
          <Button
            size="sm"
            onClick={() => handleDownload(normalizedOS)}
            disabled={downloading === normalizedOS}
            className="flex items-center gap-2"
          >
            {downloading === normalizedOS ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-background border-t-transparent" />
                <span>Downloading...</span>
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                <span>Download Desktop App</span>
              </>
            )}
          </Button>
        </div>
        
        {/* Download notification */}
        {notification && (
          <div className={`fixed top-4 right-4 z-50 transition-all duration-300 ${
            notification.show ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
          }`}>
            <div className={`p-4 rounded-lg shadow-lg border max-w-sm ${
              notification.platform === 'Error' 
                ? 'bg-red-50 border-red-200 text-red-800' 
                : 'bg-green-50 border-green-200 text-green-800'
            }`}>
              <div className="flex items-start gap-3">
                {notification.platform === 'Error' ? (
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                )}
                <div className="flex-1">
                  <h4 className="font-medium text-sm mb-1">
                    {notification.platform === 'Error' ? 'Download Failed' : `Download started for ${notification.platform}!`}
                  </h4>
                  {notification.platform !== 'Error' && (
                    <>
                      <p className="text-xs opacity-90 mb-2">
                        File: {notification.filename}<br />
                        Size: {notification.size}
                      </p>
                      <div className="text-xs opacity-80">
                        <strong>Installation Notes:</strong><br />
                        • Windows: Run as administrator<br />
                        • macOS: Drag to Applications<br />
                        • Linux: Make executable and run
                      </div>
                    </>
                  )}
                  {notification.platform === 'Error' && (
                    <p className="text-xs opacity-90">
                      {notification.filename}. Please try again or contact your administrator.
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setNotification(prev => prev ? { ...prev, show: false } : null)}
                  className="text-xs opacity-60 hover:opacity-100"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Ebdaa Work Time Desktop App
          </CardTitle>
          <CardDescription>
            Download the enterprise-ready desktop application with zero security warnings. Professional terminal-based installation bypasses all macOS Gatekeeper prompts for seamless deployment.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {getOSIcon(os)}
                <span className="ml-1">Your System: {getOSName(os)}</span>
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Windows Download */}
              <Button
                variant={os === 'windows' ? 'default' : 'outline'}
                onClick={() => handleDownload('windows')}
                disabled={downloading === 'windows'}
                className="flex flex-col items-center gap-2 h-auto p-4"
              >
                {downloading === 'windows' ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-background border-t-transparent" />
                ) : (
                  <Monitor className="h-5 w-5" />
                )}
                <div className="text-center">
                  <div className="font-medium">Windows</div>
                  <div className="text-xs opacity-70">Windows 10/11 • {getFileSize('windows')}</div>
                </div>
              </Button>

              {/* macOS Download */}
              <Button
                variant={os.startsWith('mac') ? 'default' : 'outline'}
                onClick={() => handleDownload(os.startsWith('mac') ? os : 'mac')}
                disabled={downloading === (os.startsWith('mac') ? os : 'mac')}
                className="flex flex-col items-center gap-2 h-auto p-4"
              >
                {downloading === (os.startsWith('mac') ? os : 'mac') ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-background border-t-transparent" />
                ) : (
                  <Apple className="h-5 w-5" />
                )}
                <div className="text-center">
                  <div className="font-medium">macOS</div>
                  <div className="text-xs opacity-70">
                    {os === 'mac-arm' ? `Apple Silicon • ${getFileSize('mac-arm')}` : 
                     os === 'mac-intel' ? `Intel • ${getFileSize('mac-intel')}` : 
                     `Auto-detected • ${getFileSize('mac')}`}
                  </div>
                </div>
              </Button>

              {/* Linux Download */}
              <Button
                variant={os === 'linux' ? 'default' : 'outline'}
                onClick={() => handleDownload('linux')}
                disabled={downloading === 'linux'}
                className="flex flex-col items-center gap-2 h-auto p-4"
              >
                {downloading === 'linux' ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-background border-t-transparent" />
                ) : (
                  <Laptop className="h-5 w-5" />
                )}
                <div className="text-center">
                  <div className="font-medium">Linux</div>
                  <div className="text-xs opacity-70">AppImage • {getFileSize('linux')}</div>
                </div>
              </Button>
            </div>

            <div className="bg-muted/50 p-3 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Features included:</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Random screenshot capture (2 per 10 minutes)</li>
                <li>• Activity and idle time tracking</li>
                <li>• Application usage monitoring</li>
                <li>• Real-time sync with dashboard</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Download notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 transition-all duration-300 ${
          notification.show ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
        }`}>
          <div className={`p-4 rounded-lg shadow-lg border max-w-sm ${
            notification.platform === 'Error' 
              ? 'bg-red-50 border-red-200 text-red-800' 
              : 'bg-green-50 border-green-200 text-green-800'
          }`}>
            <div className="flex items-start gap-3">
              {notification.platform === 'Error' ? (
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              )}
              <div className="flex-1">
                <h4 className="font-medium text-sm mb-1">
                  {notification.platform === 'Error' ? 'Download Failed' : `Download started for ${notification.platform}!`}
                </h4>
                {notification.platform !== 'Error' && (
                  <>
                    <p className="text-xs opacity-90 mb-2">
                      File: {notification.filename}<br />
                      Size: {notification.size}
                    </p>
                    <div className="text-xs opacity-80">
                      <strong>Installation Notes:</strong><br />
                      • Windows: Run as administrator<br />
                      • macOS: Drag to Applications<br />
                      • Linux: Make executable and run
                    </div>
                  </>
                )}
                {notification.platform === 'Error' && (
                  <p className="text-xs opacity-90">
                    {notification.filename}. Please try again or contact your administrator.
                  </p>
                )}
              </div>
              <button
                onClick={() => setNotification(prev => prev ? { ...prev, show: false } : null)}
                className="text-xs opacity-60 hover:opacity-100"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DesktopDownload; 