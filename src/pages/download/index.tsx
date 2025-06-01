import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import DesktopDownload from '@/components/ui/desktop-download';
import EbdaaTimeLogo from '@/components/ui/timeflow-logo';
import { ArrowLeft, Shield, Clock, Camera, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';

const DownloadPage = () => {
  return (
    <div className="min-h-screen bg-muted/40 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <EbdaaTimeLogo size={40} />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Download TimeFlow Desktop</h1>
              <p className="text-gray-600">Download the desktop app directly - no login required</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Download Section */}
          <div className="lg:col-span-2">
            <DesktopDownload variant="full" />
          </div>

          {/* Features & Benefits */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Why Desktop App?</CardTitle>
                <CardDescription>
                  Get enhanced time tracking with automatic screenshots, activity monitoring, and real-time sync. Download available for Windows, macOS, and Linux.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Camera className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Auto Screenshots</h4>
                      <p className="text-sm text-muted-foreground">
                        Random screenshots every 2-8 minutes during activity
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Activity className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Activity Monitoring</h4>
                      <p className="text-sm text-muted-foreground">
                        Tracks mouse, keyboard, and application usage
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-purple-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Idle Detection</h4>
                      <p className="text-sm text-muted-foreground">
                        Automatically pauses when you're away
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-orange-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Secure & Private</h4>
                      <p className="text-sm text-muted-foreground">
                        All data encrypted and securely transmitted
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">System Requirements</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div>
                    <strong>Windows:</strong>
                    <p className="text-muted-foreground">Windows 10 or later (64-bit)</p>
                  </div>
                  <div>
                    <strong>macOS:</strong>
                    <p className="text-muted-foreground">macOS 10.14 or later (Intel & Apple Silicon)</p>
                  </div>
                  <div>
                    <strong>Linux:</strong>
                    <p className="text-muted-foreground">Ubuntu 18.04+ or equivalent</p>
                  </div>
                  <div>
                    <strong>Memory:</strong>
                    <p className="text-muted-foreground">Minimum 4GB RAM</p>
                  </div>
                  <div>
                    <strong>Storage:</strong>
                    <p className="text-muted-foreground">500MB free disk space</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Installation Help</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p><strong>Windows:</strong> Run the .exe installer as administrator</p>
                <p><strong>macOS:</strong> Drag the app to Applications folder</p>
                <p><strong>Linux:</strong> Make the AppImage executable and run</p>
                <p className="pt-2 text-muted-foreground">
                  Need help? Contact your administrator or IT support.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-12">
          <Card>
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2">Do I need to keep the web app open?</h4>
                  <p className="text-sm text-muted-foreground">
                    No, the desktop app works independently. You can close your browser and continue tracking.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Can I use both apps simultaneously?</h4>
                  <p className="text-sm text-muted-foreground">
                    Yes, but time tracking should be done through the desktop app for accurate monitoring.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Is my data secure?</h4>
                  <p className="text-sm text-muted-foreground">
                    Yes, all screenshots and data are encrypted and transmitted securely to your company's database.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Can I work offline?</h4>
                  <p className="text-sm text-muted-foreground">
                    The app will cache data during brief disconnections and sync when reconnected.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DownloadPage; 