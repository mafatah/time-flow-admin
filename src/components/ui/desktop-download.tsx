import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, Monitor, Apple, Laptop } from 'lucide-react';

interface DesktopDownloadProps {
  variant?: 'full' | 'compact';
  className?: string;
}

const DesktopDownload: React.FC<DesktopDownloadProps> = ({ variant = 'compact', className = '' }) => {
  const [os, setOs] = useState<'windows' | 'mac' | 'mac-intel' | 'mac-arm' | 'linux' | 'unknown'>('unknown');
  const [downloading, setDownloading] = useState<string | null>(null);

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
    
    // Use GitHub Releases for reliable large file hosting
    const githubReleaseBase = 'https://github.com/mafatah/time-flow-admin/releases/download/v1.0.0';
    
    // Define the download files from GitHub Releases
    const downloadFiles = {
      windows: `${githubReleaseBase}/EbdaaWorkTime-Setup.exe`,
      'mac-intel': `${githubReleaseBase}/EbdaaWorkTime-Intel.dmg`,
      'mac-arm': `${githubReleaseBase}/EbdaaWorkTime-ARM.dmg`,
      'mac': `${githubReleaseBase}/EbdaaWorkTime-Intel.dmg`, // Default to Intel for generic mac
      linux: `${githubReleaseBase}/EbdaaWorkTime.AppImage`
    };
    
    const filePath = downloadFiles[platform as keyof typeof downloadFiles];
    
    console.log('Download Debug:', {
      platform,
      detectedOS: os,
      filePath,
      userAgent: navigator.userAgent
    });
    
    if (filePath) {
      try {
        // Direct link to GitHub Releases - opens in new tab to avoid CORS issues
        window.open(filePath, '_blank');
        
        // Show success message
        setTimeout(() => {
          alert(`✅ Download started for ${getOSName(platform)}!\n\nFile: ${filePath.split('/').pop()}\nSize: ${getFileSize(platform)}\n\n📋 Installation Notes:\n• Windows: Run the .exe file as administrator\n• macOS: Open the .dmg file and drag to Applications\n• Linux: Make the .AppImage executable and run\n\n🔐 The app includes automatic screenshot capture and activity tracking capabilities.\n\n📁 Downloaded from: GitHub Releases (reliable for large files)`);
          setDownloading(null);
        }, 500);
      } catch (error) {
        console.error('Download error:', error);
        alert('❌ Download failed. Please try again or contact your administrator.');
        setDownloading(null);
      }
    } else {
      alert('❌ Download file not found. Please contact your administrator.');
      setDownloading(null);
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
        return '112MB';
      case 'mac-intel':
      case 'mac':
        return '118MB';
      case 'windows':
        return '85MB';
      case 'linux':
        return '120MB';
      default:
        return '';
    }
  };

  if (variant === 'compact') {
    const normalizedOS = os.startsWith('mac') ? os : os; // Keep the specific mac variant for proper DMG selection
    
    return (
      <div className={`flex flex-col sm:flex-row gap-2 ${className}`}>
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
    );
  }

  return (
    <Card className={className}>
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

          {/* Debug Override Section */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="text-sm font-medium text-yellow-800 mb-2">Debug: Force Download Type</div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDownload('mac-arm')}
                className="text-xs"
              >
                Force ARM Download
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDownload('mac-intel')}
                className="text-xs"
              >
                Force Intel Download
              </Button>
            </div>
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
  );
};

export default DesktopDownload; 