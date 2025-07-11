
import * as React from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session, AuthChangeEvent } from "@supabase/supabase-js";
import { useToast } from "@/components/ui/use-toast";
import { validateUserId } from "@/utils/uuid-validation";

// Define the UserDetails type based on actual database columns
interface UserDetails {
  id: string;
  email: string;
  full_name: string;
  role: string;
  avatar_url: string | null;
}

interface AuthContextType {
  user: User | null;
  userDetails: UserDetails | null;
  session: Session | null;
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        if (!mounted) return;
        
        setLoading(true);
        setError(null);
        
        // Set up auth state listener FIRST
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event: AuthChangeEvent, session: Session | null) => {
            if (!mounted) return;
            
            // Auth state change logging disabled for performance
            setSession(session);
            setUser(session?.user ?? null);
            
            if (session?.user) {
              // Use setTimeout to avoid blocking the auth callback
              setTimeout(() => {
                if (mounted) {
                  fetchUserDetails(session.user.id);
                }
              }, 0);
            } else {
              setUserDetails(null);
            }
          }
        );
        
        // THEN check for existing session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (sessionError) {
          console.error("Error getting session:", sessionError);
          setError(`Authentication error: ${sessionError.message}`);
          if (toast) {
            toast({
              title: "Authentication error",
              description: "There was a problem with your session. Please try logging in again.",
              variant: "destructive",
            });
          }
        } else {
          setSession(session);

          if (session?.user) {
            setUser(session.user);
            await fetchUserDetails(session.user.id);
          }
        }

        return () => {
          mounted = false;
          subscription.unsubscribe();
        };
      } catch (err) {
        if (!mounted) return;
        
        console.error("Auth initialization error:", err);
        setError("Failed to initialize authentication");
        if (toast) {
          toast({
            title: "System Error",
            description: "Failed to initialize authentication system. Please refresh the page.",
            variant: "destructive",
          });
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, [toast]);

  async function fetchUserDetails(userId: string) {
    try {
      // Validate user ID before making database call
      const validUserId = validateUserId(userId);
      if (!validUserId) {
        console.error('Invalid user ID provided:', userId);
        setError('Invalid user session');
        return;
      }

      // User details fetch logging disabled for performance
      const { data, error } = await supabase
        .from("users")
        .select(`
          id,
          email,
          full_name,
          role,
          avatar_url
        `)
        .eq("id", validUserId)
        .single();

      if (error) {
        console.error("Error fetching user details:", error);
        // Don't show error to user for missing profile, it might be a new user
        if (error.code !== 'PGRST116') { // Not found error
          setError(`Failed to load user profile: ${error.message}`);
        }
        return;
      }
      
              // User details logging disabled for performance
      setUserDetails(data);
      setError(null);
    } catch (error) {
      console.error("Unexpected error fetching user details:", error);
      setError("Failed to load user profile");
    }
  }

  async function signIn(email: string, password: string, rememberMe: boolean = false) {
    try {
      setError(null);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }
      
      if (toast) {
        toast({
          title: "Successfully signed in",
          description: "Welcome back!",
        });
      }
    } catch (error: any) {
      const errorMessage = error.message || "An unexpected error occurred";
      setError(errorMessage);
      if (toast) {
        toast({
          title: "Error signing in",
          description: errorMessage,
          variant: "destructive",
        });
      }
      throw error;
    }
  }

  async function signOut() {
    try {
      setError(null);
      await supabase.auth.signOut();
      
      if (toast) {
        toast({
          title: "Successfully signed out",
        });
      }
    } catch (error: any) {
      const errorMessage = error.message || "Error signing out";
      setError(errorMessage);
      if (toast) {
        toast({
          title: "Error signing out",
          description: errorMessage,
          variant: "destructive",
        });
      }
    }
  }

  const value = {
    user,
    userDetails,
    session,
    signIn,
    signOut,
    loading,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
