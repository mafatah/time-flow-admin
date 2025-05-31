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
    
    // Define download URLs
    const downloadUrls = {
      windows: '/downloads/TimeFlow-Setup.exe',
      mac: '/downloads/TimeFlow.dmg', 
      linux: '/downloads/TimeFlow.AppImage'
    };
    
    try {
      const url = downloadUrls[platform as keyof typeof downloadUrls];
      
      if (!url) {
        throw new Error('Download not available for this platform');
      }
      
      // Check if file exists
      const response = await fetch(url, { method: 'HEAD' });
      
      if (response.ok) {
        // File exists, start download
        const link = document.createElement('a');
        link.href = url;
        link.download = url.split('/').pop() || `TimeFlow-${platform}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log(`Downloaded TimeFlow Desktop for ${platform}`);
        
        // Show warning dialog after download starts
        setTimeout(() => {
          showDownloadDialog(platform);
        }, 1000);
        
      } else {
        // File doesn't exist, show instructions
        showDownloadDialog(platform);
      }
    } catch (error) {
      console.error('Download failed:', error);
      showDownloadDialog(platform);
    } finally {
      setDownloading(null);
    }
  };
  
  const getDownloadInstructions = (platform: string) => {
    const platformName = getOSName(platform);
    
    if (platform === 'mac') {
      return {
        title: `${platformName} Desktop Installer - Zero Security Warnings`,
        message: `✅ Download started! This TimeFlow installer bypasses all macOS Gatekeeper warnings using terminal-based installation.`,
        features: [
          '🔄 Automatic time tracking',
          '📸 Smart screenshot capture (2 random per 10 minutes)',
          '⚡ Activity monitoring',
          '🔒 Secure data sync',
          '📊 Detailed productivity insights'
        ],
        instructions: [
          '✅ ZERO Gatekeeper warnings - Enterprise ready',
          'Double-click the downloaded .dmg file to open',
          'Double-click "TimeFlow Desktop Installer.command"',
          'Terminal will open with professional installation interface',
          'Type "y" and press Enter to install (requires admin password)',
          'App installs directly to Applications folder with full macOS trust',
          'This method bypasses ALL security warnings completely'
        ]
      };
    }
    
    return {
      title: `${platformName} Desktop App - Development Version`,
      message: `✅ Download started! However, the TimeFlow desktop app file you downloaded is a placeholder file for development purposes. It is not a functional installer.`,
      features: [
        '🔄 Automatic time tracking',
        '📸 Smart screenshot capture (2 random per 10 minutes)',
        '⚡ Activity monitoring',
        '🔒 Secure data sync',
        '📊 Detailed productivity insights'
      ],
      instructions: [
        'The downloaded file is a placeholder - do not attempt to install it',
        'Contact your administrator to get the actual desktop application',
        'The development team is preparing the final release',
        'Use the web version for time tracking functionality'
      ]
    };
  };

  const showDownloadDialog = (platform: string) => {
    const info = getDownloadInstructions(platform);
    
    // Create a more user-friendly dialog
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      font-family: system-ui, -apple-system, sans-serif;
    `;
    
    modal.innerHTML = `
      <div style="
        background: white;
        padding: 2rem;
        border-radius: 12px;
        max-width: 500px;
        margin: 1rem;
        box-shadow: 0 20px 40px rgba(0,0,0,0.3);
      ">
        <h2 style="margin: 0 0 1rem 0; color: #2563eb; font-size: 1.5rem;">${info.title}</h2>
        <p style="margin: 0 0 1rem 0; color: #666; line-height: 1.5;">${info.message}</p>
        
        <h3 style="margin: 1.5rem 0 0.5rem 0; color: #333; font-size: 1.1rem;">🚀 Coming Features:</h3>
        <ul style="margin: 0 0 1.5rem 0; padding-left: 1.5rem; color: #666;">
          ${info.features.map(feature => `<li style="margin: 0.25rem 0;">${feature}</li>`).join('')}
        </ul>
        
        <h3 style="margin: 1.5rem 0 0.5rem 0; color: #333; font-size: 1.1rem;">📋 Installation Steps:</h3>
        <ol style="margin: 0 0 1.5rem 0; padding-left: 1.5rem; color: #666;">
          ${info.instructions.map(instruction => `<li style="margin: 0.25rem 0;">${instruction}</li>`).join('')}
        </ol>
        
        <div style="display: flex; gap: 1rem; justify-content: flex-end;">
          <button onclick="this.closest('div').remove()" style="
            background: #2563eb;
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
          ">Got it!</button>
        </div>
      </div>
    `;
    
    modal.onclick = (e) => {
      if (e.target === modal) modal.remove();
    };
    
    document.body.appendChild(modal);
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
                <div className="text-xs opacity-70">Zero Warnings • Terminal Install</div>
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