'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { createClientBrowser } from '@/lib/supabase-browser';
import { User, Session } from '@supabase/supabase-js';

// --- Auth Context ---
interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

// --- Selection Context ---
interface SelectionContextType {
  selectedEmailId: string | null;
  setSelectedEmailId: (id: string | null) => void;
}

const SelectionContext = createContext<SelectionContextType>({
  selectedEmailId: null,
  setSelectedEmailId: () => {},
});

export const useSelection = () => useContext(SelectionContext);

// --- App Providers Component ---
export function AppProviders({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);

  const supabase = createClientBrowser();

  useEffect(() => {
    const setData = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Error fetching session:', error);
      }
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    };

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    setData();

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      <SelectionContext.Provider value={{ selectedEmailId, setSelectedEmailId }}>
        {children}
      </SelectionContext.Provider>
    </AuthContext.Provider>
  );
}
