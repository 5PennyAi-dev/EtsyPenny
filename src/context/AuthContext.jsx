import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase'; // Adjust path based on your setup

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // 1. Get initial session with timeout safety
    const initializeAuth = async () => {
      try {
        // Race condition: if getSession hangs, we don't want to block forever
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Auth Timeout")), 5000));

        const sessionResult = await Promise.race([sessionPromise, timeoutPromise]);
        
        if (mounted) {
            const { data: { session } } = sessionResult;
            setUser(session?.user ?? null);
            
            if (session?.user) {
              await fetchProfile(session.user.id);
            }
        }
      } catch (err) {
        console.warn("Auth Initialization Warning:", err);
      } finally {
        if (mounted) {
            setLoading(false);
        }
      }
    };

    initializeAuth();

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      if (currentUser) {
        // We do typically want to wait for profile, but let's not block the UI if it fails
        fetchProfile(currentUser.id).catch(e => console.error("Profile fetch failed in listener", e));
      } else {
        setProfile(null);
      }
      
      // CRITICAL: Ensure we unblock loading even if getSession is still stuck
      setLoading(false);
    });

    return () => {
        mounted = false;
        subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') {
         console.error('Error fetching profile:', error.message);
      } else if (data) {
          setProfile(data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error.message);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    profile,
    signOut,
    loading,
    refreshProfile: () => fetchProfile(user?.id)
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="flex items-center justify-center min-h-screen bg-slate-50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
           <p className="ml-4 text-indigo-600">Loading App...</p>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
