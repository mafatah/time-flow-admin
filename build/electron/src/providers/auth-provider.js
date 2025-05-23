"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthProvider = AuthProvider;
exports.useAuth = useAuth;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const supabase_1 = require("@/lib/supabase");
const use_toast_1 = require("@/components/ui/use-toast");
const AuthContext = (0, react_1.createContext)(undefined);
function AuthProvider({ children }) {
    const [user, setUser] = (0, react_1.useState)(null);
    const [userDetails, setUserDetails] = (0, react_1.useState)(null);
    const [session, setSession] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const { toast } = (0, use_toast_1.useToast)();
    (0, react_1.useEffect)(() => {
        async function getSession() {
            setLoading(true);
            // Set up auth state listener FIRST
            const { data: { subscription } } = supabase_1.supabase.auth.onAuthStateChange((event, session) => {
                setSession(session);
                setUser(session?.user ?? null);
                if (session?.user) {
                    // Use setTimeout to avoid blocking the auth callback
                    setTimeout(() => {
                        fetchUserDetails(session.user.id);
                    }, 0);
                }
                else {
                    setUserDetails(null);
                }
            });
            // THEN check for existing session
            const { data: { session }, error } = await supabase_1.supabase.auth.getSession();
            if (error) {
                console.error("Error getting session:", error);
                toast({
                    title: "Authentication error",
                    description: "There was a problem authenticating your session.",
                    variant: "destructive",
                });
            }
            setSession(session);
            if (session?.user) {
                setUser(session.user);
                await fetchUserDetails(session.user.id);
            }
            setLoading(false);
            return () => {
                subscription.unsubscribe();
            };
        }
        getSession();
    }, [toast]);
    async function fetchUserDetails(userId) {
        const { data, error } = await supabase_1.supabase
            .from("users")
            .select("*")
            .eq("id", userId)
            .single();
        if (error) {
            console.error("Error fetching user details:", error);
            return;
        }
        setUserDetails(data);
    }
    async function signIn(email, password) {
        try {
            const { error } = await supabase_1.supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) {
                throw error;
            }
            toast({
                title: "Successfully signed in",
            });
        }
        catch (error) {
            toast({
                title: "Error signing in",
                description: error.message,
                variant: "destructive",
            });
            throw error;
        }
    }
    async function signOut() {
        try {
            await supabase_1.supabase.auth.signOut();
            toast({
                title: "Successfully signed out",
            });
        }
        catch (error) {
            toast({
                title: "Error signing out",
                description: error.message,
                variant: "destructive",
            });
        }
    }
    const value = {
        user,
        userDetails,
        session,
        signIn,
        signOut,
        loading,
    };
    return (0, jsx_runtime_1.jsx)(AuthContext.Provider, { value: value, children: children });
}
function useAuth() {
    const context = (0, react_1.useContext)(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
