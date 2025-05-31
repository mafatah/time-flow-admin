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
  const [os, setOs] = useState<'windows' | 'mac' | 'linux' | 'unknown'>('unknown');
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    const detectOS = () => {
      const userAgent = window.navigator.userAgent;
      const platform = window.navigator.platform;
      
      if (platform.includes('Mac') || userAgent.includes('Mac')) {
        setOs('mac');
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
    
    // Simulate download process
    setTimeout(() => {
      // In a real implementation, you would trigger the actual download here
      console.log(`Downloading TimeFlow Desktop for ${platform}`);
      
      // For now, we'll just show an alert
      alert(`Download started for ${platform}. The actual download links will be configured by your administrator.`);
      
      setDownloading(null);
    }, 1500);
  };

  const getOSIcon = (platform: string) => {
    switch (platform) {
      case 'mac':
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
      case 'windows':
        return 'Windows';
      case 'linux':
        return 'Linux';
      default:
        return 'Unknown';
    }
  };

  if (variant === 'compact') {
    return (
      <div className={`flex flex-col sm:flex-row gap-2 ${className}`}>
        <Badge variant="outline" className="w-fit">
          {getOSIcon(os)}
          <span className="ml-1">{getOSName(os)} Detected</span>
        </Badge>
        <Button
          size="sm"
          onClick={() => handleDownload(os)}
          disabled={downloading === os}
          className="flex items-center gap-2"
        >
          {downloading === os ? (
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
          Download the desktop application for enhanced time tracking with screenshot capture and automatic activity monitoring.
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
                <div className="text-xs opacity-70">Windows 10/11</div>
              </div>
            </Button>

            {/* macOS Download */}
            <Button
              variant={os === 'mac' ? 'default' : 'outline'}
              onClick={() => handleDownload('mac')}
              disabled={downloading === 'mac'}
              className="flex flex-col items-center gap-2 h-auto p-4"
            >
              {downloading === 'mac' ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-background border-t-transparent" />
              ) : (
                <Apple className="h-5 w-5" />
              )}
              <div className="text-center">
                <div className="font-medium">macOS</div>
                <div className="text-xs opacity-70">Intel & Apple Silicon</div>
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
                <div className="text-xs opacity-70">AppImage</div>
              </div>
            </Button>
          </div>

          <div className="bg-muted/50 p-3 rounded-lg">
            <h4 className="font-medium text-sm mb-2">Features included:</h4>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Automatic screenshot capture</li>
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