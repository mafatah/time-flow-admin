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
      
      if (platform.includes('Mac') || userAgent.includes('Mac')) {
        // Try to detect Apple Silicon vs Intel
        // This is a heuristic approach as direct detection isn't always reliable in browser
        const isLikelyAppleSilicon = !userAgent.includes('Intel') && 
          (userAgent.includes('Safari') || userAgent.includes('Chrome'));
        
        if (isLikelyAppleSilicon) {
          setOs('mac-arm');
        } else {
          setOs('mac-intel');
        }
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
    
    // Define download URLs with architecture detection for macOS
    const getDownloadUrl = (platform: string) => {
      // Use GitHub releases for all platforms to avoid file size limits
      const baseUrl = 'https://github.com/mafatah/time-flow-admin/releases/download/v1.0.0';
      
      if (platform === 'mac' || platform === 'mac-intel' || platform === 'mac-arm') {
        // For mac-arm, use the ARM DMG; for mac-intel or generic mac, use Intel DMG
        return platform === 'mac-arm' 
          ? `${baseUrl}/TimeFlow-0.0.0-arm64.dmg`
          : `${baseUrl}/TimeFlow-0.0.0.dmg`;
      }
      
      // Windows and Linux also use GitHub releases
      const downloadUrls = {
        windows: `${baseUrl}/TimeFlow-Setup-0.0.0.exe`,
        linux: `${baseUrl}/TimeFlow-0.0.0.AppImage`
      };
      
      return downloadUrls[platform as keyof typeof downloadUrls];
    };
    
    try {
      const url = getDownloadUrl(platform);
      
      if (!url) {
        throw new Error('Download not available for this platform');
      }
      
      // Start download directly without checking if file exists
      const link = document.createElement('a');
      link.href = url;
      link.download = url.split('/').pop() || `TimeFlow-${platform}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log(`Downloaded TimeFlow Desktop for ${platform}:`, url);
      
      // No popup - clean download experience
      
    } catch (error) {
      console.error('Download failed:', error);
      // Even on error, don't show popup - just log it
    } finally {
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
        return '198MB';
      case 'mac-intel':
      case 'mac':
        return '406MB';
      case 'windows':
        return '166MB';
      case 'linux':
        return '621MB';
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
          TimeFlow Desktop App
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
  );
};

export default DesktopDownload; 