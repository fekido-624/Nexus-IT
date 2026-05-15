
"use client"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Storage, User } from '@/lib/storage';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function initAuth() {
      await Storage.init();
      const session = Storage.getSession();
      setUser(session);
      setLoading(false);
    }

    initAuth();
  }, []);

  const login = async (email: string, pass: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password: pass })
    });

    if (!response.ok) {
      return false;
    }

    const matched = await response.json();
    Storage.setSession(matched);
    setUser(matched);

    if (matched.role === 'admin') {
      router.push('/admin/dashboard');
    } else {
      router.push('/user/catalogue');
    }

    return true;
  };

  const logout = () => {
    Storage.setSession(null);
    setUser(null);
    router.push('/login');
  };

  return { user, loading, login, logout };
}
