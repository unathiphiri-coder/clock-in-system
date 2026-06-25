'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { UserRole } from '@/lib/types';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: UserRole | UserRole[];
}

export function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }
        if (!requiredRole) {
          setHasAccess(true);
          setIsLoading(false);
          return;
        }
        const { data: userRoles } = await supabase.from('user_roles').select('role_name').eq('user_id', user.id);
        const roles = userRoles?.map((r) => r.role_name) || [];
        const requiredRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
        const hasRequiredRole = roles.some((role) => requiredRoles.includes(role as UserRole));
        if (!hasRequiredRole) {
          router.push('/unauthorized');
          return;
        }
        setHasAccess(true);
      } catch (error) {
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, [router, requiredRole, supabase]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold text-gray-800">Access Denied</h1>
      </div>
    );
  }
  return <>{children}</>;
}
