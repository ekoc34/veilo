'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

interface UserProfile {
  uid: string;
  name: string;
  username: string;
  email: string;
  bio?: string;
  profileImg?: string;
  followers?: number;
  createdAt?: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const docRef = doc(db, 'users', firebaseUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setProfile({
              uid: firebaseUser.uid,
              name: data.name || firebaseUser.displayName || '',
              username: data.username || '',
              email: data.email || firebaseUser.email || '',
              bio: data.bio || '',
              profileImg: data.profileImg || '/images/default-avatar.svg',
              followers: data.followers || 0,
              createdAt: data.createdAt || '',
            });
          } else {
            setProfile({
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || '',
              username: '',
              email: firebaseUser.email || '',
              profileImg: '/images/default-avatar.svg',
              followers: 0,
            });
          }
        } catch {
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  async function logout() {
    await signOut(auth);
    setUser(null);
    setProfile(null);
    window.location.href = '/';
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
