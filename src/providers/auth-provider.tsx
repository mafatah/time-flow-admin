
import * as React from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { useToast } from "@/components/ui/use-toast";

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
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    async function getSession() {
      setLoading(true);
      
      // Set up auth state listener FIRST
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, session) => {
          console.log('Auth state change:', event, session?.user?.email);
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            // Use setTimeout to avoid blocking the auth callback
            setTimeout(() => {
              fetchUserDetails(session.user.id);
            }, 0);
          } else {
            setUserDetails(null);
          }
        }
      );
      
      // THEN check for existing session
      const { data: { session }, error } = await supabase.auth.getSession();
      
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

  async function fetchUserDetails(userId: string) {
    try {
      console.log('Fetching user details for:', userId);
      const { data, error } = await supabase
        .from("users")
        .select(`
          id,
          email,
          full_name,
          role,
          avatar_url
        `)
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error fetching user details:", error);
        return;
      }
      
      console.log('User details fetched:', data);
      setUserDetails(data);
    } catch (error) {
      console.error("Unexpected error fetching user details:", error);
    }
  }

  async function signIn(email: string, password: string) {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }
      
      toast({
        title: "Successfully signed in",
      });
    } catch (error: any) {
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
      await supabase.auth.signOut();
      
      // If running in Electron, also clear the Electron session
      if (typeof window !== 'undefined' && (window as any).electron) {
        (window as any).electron.logout();
      }
      
      toast({
        title: "Successfully signed out",
      });
    } catch (error: any) {
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
