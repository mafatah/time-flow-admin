
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  useEffect(() => {
    // Check for an existing session
    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          throw error;
        }
        
        if (data.session) {
          // Get user details to determine role
          const { data: userDetails, error: userError } = await supabase
            .from("users")
            .select("role")
            .eq("id", data.session.user.id)
            .single();
          
          if (userError) {
            console.error("Error fetching user role:", userError);
            navigate("/login");
            return;
          }
          
          // Redirect based on role
          if (userDetails?.role === 'admin' || userDetails?.role === 'manager') {
            navigate("/admin");
          } else {
            navigate("/employee/dashboard");
          }
        } else {
          navigate("/login");
        }
      } catch (error: any) {
        console.error("Error checking session:", error);
        toast({
          title: "Error",
          description: "Failed to check authentication status",
          variant: "destructive",
        });
        navigate("/login");
      }
    };
    
    checkSession();
  }, [navigate, toast]);
  
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-muted/40 p-6">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-bold text-primary mb-6">TrackHub</h1>
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-semibold mb-4">Welcome to TrackHub</h2>
          <p className="mb-6">
            Employee time tracking and productivity monitoring platform.
            Redirecting based on your role...
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
