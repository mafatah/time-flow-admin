"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("react");
const react_router_dom_1 = require("react-router-dom");
const button_1 = require("@/components/ui/button");
const supabase_1 = require("@/lib/supabase");
const use_toast_1 = require("@/components/ui/use-toast");
const Index = () => {
    const navigate = (0, react_router_dom_1.useNavigate)();
    const { toast } = (0, use_toast_1.useToast)();
    (0, react_1.useEffect)(() => {
        // Check for an existing session
        const checkSession = async () => {
            try {
                const { data, error } = await supabase_1.supabase.auth.getSession();
                if (error) {
                    throw error;
                }
                if (data.session) {
                    navigate("/dashboard");
                }
                else {
                    navigate("/login");
                }
            }
            catch (error) {
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
    return (<div className="flex flex-col items-center justify-center h-screen bg-muted/40 p-6">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-bold text-primary mb-6">TrackHub</h1>
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-semibold mb-4">Welcome to TrackHub</h2>
          <p className="mb-6">
            Employee time tracking and productivity monitoring platform.
            Redirecting to login page...
          </p>
          <div className="flex justify-center">
            <button_1.Button variant="default" onClick={() => navigate("/login")}>
              Go to Login
            </button_1.Button>
          </div>
        </div>
      </div>
    </div>);
};
exports.default = Index;
