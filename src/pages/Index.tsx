
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const Index = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Check if we have Supabase URL available
    const hasSupabase = Boolean(import.meta.env.VITE_SUPABASE_URL);
    
    // Only redirect to dashboard if Supabase is configured
    if (hasSupabase) {
      navigate("/");
    }
  }, [navigate]);
  
  // If Supabase is not configured, show a helpful message
  if (!import.meta.env.VITE_SUPABASE_URL) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-muted/40 p-6">
        <div className="max-w-md text-center">
          <h1 className="text-3xl font-bold text-primary mb-6">TrackHub</h1>
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-semibold mb-4">Supabase Connection Required</h2>
            <p className="mb-6">
              This application requires a connection to Supabase for authentication and data storage. 
              Please connect to Supabase by clicking the green Supabase button in the top right corner.
            </p>
            <div className="flex justify-center">
              <Button variant="default">
                Connect Supabase
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              After connecting, refresh this page to continue.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  return null;
};

export default Index;
