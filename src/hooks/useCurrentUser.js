import { useAuth } from '@/lib/AuthContext';

export function useCurrentUser() {
  const { user } = useAuth();
  return user;
}