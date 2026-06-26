import dynamic from 'next/dynamic';

const LoginForm = dynamic(() => import('./LoginForm'), { ssr: true });

export default function LoginPage() {
  return <LoginForm />;
}
