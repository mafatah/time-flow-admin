import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Download, 
  Apple, 
  Monitor, 
  Smartphone,
  Shield,
  CheckCircle,
  ExternalLink
} from "lucide-react";

interface DownloadItem {
  platform: string;
  icon: React.ReactNode;
  description: string;
  filename: string;
  url: string;
  size: string;
  requirements: string;
  verified: boolean;
  disabled?: boolean;
}

const DownloadPage = () => {
  const version = "v1.0.55"; // Updated automatically by release pipeline
  const releaseDate = new Date().toLocaleDateString(); // Force deploy v1.0.34
  
  const downloads: DownloadItem[] = [
    {
      platform: "macOS (Apple Silicon)",
      icon: <Apple className="h-6 w-6" />,
      description: "For M1, M2, M3 Macs",
      filename: `TimeFlow-${version}-ARM64.dmg`,
      url: `https://github.com/mafatah/time-flow-admin/releases/download/${version}/TimeFlow-${version}-ARM64.dmg`,
      size: "~115 MB",
      requirements: "macOS 11.0+",
      verified: true
    },
    {
      platform: "macOS (Intel)",
      icon: <Apple className="h-6 w-6" />,
      description: "For Intel-based Macs",
      filename: `TimeFlow-${version}-Intel.dmg`,
      url: `https://github.com/mafatah/time-flow-admin/releases/download/${version}/TimeFlow-${version}-Intel.dmg`,
      size: "~122 MB",
      requirements: "macOS 10.14+",
      verified: true
    },
    {
      platform: "Windows",
      icon: <Monitor className="h-6 w-6" />,
      description: "For Windows 10/11",
      filename: `TimeFlow-${version}-Setup.exe`,
      url: `https://github.com/mafatah/time-flow-admin/releases/download/${version}/TimeFlow-${version}-Setup.exe`,
      size: "~84 MB",
      requirements: "Windows 10/11 (64-bit)",
      verified: true,
      disabled: false
    },
    {
      platform: "Linux",
      icon: <Smartphone className="h-6 w-6" />,
      description: "AppImage for Linux",
      filename: `TimeFlow-${version}.AppImage`,
      url: `https://github.com/mafatah/time-flow-admin/releases/download/${version}/TimeFlow-${version}.AppImage`,
      size: "~120 MB", 
      requirements: "Ubuntu 18.04+ or equivalent",
      verified: true,
      disabled: false
    }
  ];

  const handleDownload = (url: string, filename: string) => {
    // Track download analytics if needed
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Download started: ${filename}`);
    }
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            📱 Download Ebdaa Work Time
          </h1>
          <p className="text-xl text-gray-600 mb-6">
            Professional employee time tracking desktop application
          </p>
          <div className="flex justify-center items-center gap-4 mb-8">
            <Badge variant="secondary" className="text-lg px-4 py-2">
              Version {version}
            </Badge>
            <Badge variant="outline" className="text-sm">
              Released {releaseDate}
            </Badge>
          </div>
        </div>

        {/* Features Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12">
          {[
            { icon: <Shield className="h-5 w-5" />, text: "Code Signed & Notarized" },
            { icon: <CheckCircle className="h-5 w-5" />, text: "Enterprise Security" },
            { icon: <Download className="h-5 w-5" />, text: "Auto Updates" },
            { icon: <Monitor className="h-5 w-5" />, text: "Cross Platform" }
          ].map((feature, index) => (
            <div key={index} className="flex items-center gap-2 text-sm text-gray-600 bg-white/50 rounded-lg p-3">
              {feature.icon}
              <span>{feature.text}</span>
            </div>
          ))}
        </div>

        {/* Download Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {downloads.map((download, index) => (
            <Card key={index} className={`hover:shadow-lg transition-shadow ${download.disabled ? 'opacity-60' : ''}`}>
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  {download.icon}
                  <CardTitle className="text-xl">{download.platform}</CardTitle>
                  {download.verified && (
                    <Badge className="bg-green-100 text-green-800">
                      <Shield className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                  {download.disabled && (
                    <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                      Coming Soon
                    </Badge>
                  )}
                </div>
                <CardDescription>{download.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-sm text-gray-600">
                    <div>📁 {download.filename}</div>
                    <div>📊 Size: {download.size}</div>
                    <div>⚙️ Requires: {download.requirements}</div>
                  </div>
                  
                  <Button 
                    onClick={() => !download.disabled && handleDownload(download.url, download.filename)}
                    className="w-full"
                    size="lg"
                    disabled={download.disabled}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {download.disabled ? 'Coming Soon' : `Download for ${download.platform.split(' ')[0]}`}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Installation Instructions */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>📋 Installation Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold text-lg mb-2">🍎 macOS Installation</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                <li>Download the appropriate DMG file for your Mac</li>
                <li>Open the downloaded DMG file</li>
                <li>Drag "Ebdaa Work Time.app" to your Applications folder</li>
                <li>Eject the DMG and launch the app from Applications</li>
                <li>If prompted about security, go to System Preferences → Security & Privacy → "Open Anyway"</li>
              </ol>
            </div>
            
            <div>
              <h3 className="font-semibold text-lg mb-2">🪟 Windows Installation</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                <li>Download the EXE installer</li>
                <li>Right-click and select "Run as administrator"</li>
                <li>Follow the installation wizard</li>
                <li>Launch from Start Menu or Desktop shortcut</li>
              </ol>
            </div>
            
            <div>
              <h3 className="font-semibold text-lg mb-2">🐧 Linux Installation</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                <li>Download the AppImage file</li>
                <li>Make it executable: <code className="bg-gray-100 px-1 rounded">chmod +x TimeFlow-{version}.AppImage</code></li>
                <li>Run: <code className="bg-gray-100 px-1 rounded">./TimeFlow-{version}.AppImage</code></li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-gray-600 space-y-4">
          <div className="flex justify-center gap-6 text-sm">
            <a 
              href={`https://github.com/mafatah/time-flow-admin/releases/tag/${version}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-blue-600"
            >
              <ExternalLink className="h-4 w-4" />
              View on GitHub
            </a>
            <a 
              href="https://github.com/mafatah/time-flow-admin/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-blue-600"
            >
              All Releases
            </a>
          </div>
          <p className="text-sm">
            All downloads are code-signed and verified for security
          </p>
          <p className="text-xs text-gray-500">
            © 2025 Ebdaa Digital Technology. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DownloadPage;
