
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Check for an existing session
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        navigate("/");
      } else {
        navigate("/login");
      }
    };
    
    checkSession();
  }, [navigate]);
  
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-muted/40 p-6">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-bold text-primary mb-6">TrackHub</h1>
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-semibold mb-4">Welcome to TrackHub</h2>
          <p className="mb-6">
            Employee time tracking and productivity monitoring platform.
            Redirecting to login page...
          </p>
          <div className="flex justify-center">
            <Button variant="default" onClick={() => navigate("/login")}>
              Go to Login
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
