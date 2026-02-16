'use client';

import { useAuth } from '@/lib/auth/hooks';
import { Card, CardContent } from '@/components/ui';

export default function DebugPage() {
  const { user, loading, error } = useAuth();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Debug Information</h1>

      <Card>
        <CardContent className="p-6">
          <h2 className="font-bold mb-4">Auth State</h2>
          <pre className="bg-nb-gray-100 p-4 rounded overflow-auto text-xs">
            {JSON.stringify({ user, loading, error }, null, 2)}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h2 className="font-bold mb-4">Window Object</h2>
          <pre className="bg-nb-gray-100 p-4 rounded overflow-auto text-xs">
            {JSON.stringify({
              width: typeof window !== 'undefined' ? window.innerWidth : 0,
              height: typeof window !== 'undefined' ? window.innerHeight : 0,
              userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A',
            }, null, 2)}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h2 className="font-bold mb-4">Test Rendering</h2>
          <div className="space-y-2">
            <div className="h-12 bg-nb-primary text-white flex items-center justify-center font-bold">
              Primary Color Test
            </div>
            <div className="h-12 bg-nb-success text-white flex items-center justify-center font-bold">
              Success Color Test
            </div>
            <div className="h-12 border-2 border-nb-black flex items-center justify-center font-bold">
              Border Test
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
