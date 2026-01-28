# Authentication Quick Reference

Quick reference for using authentication in SEKAR Web Dashboard.

## Import Auth Hooks

```typescript
import { useAuth, useUser, useRequireAuth } from '@/lib/auth/hooks';
```

## Get Current User

```typescript
// In any component
const user = useUser();

if (user) {
  console.log(user.full_name); // "Admin User"
  console.log(user.role);      // "admin"
}
```

## Access Auth Methods

```typescript
const { user, loading, login, logout } = useAuth();

// Login
await login({ username: 'admin', password: 'admin123' });

// Logout
await logout();
```

## Protect Routes (Client-Side)

```typescript
// Require any authenticated user
function MyPage() {
  useRequireAuth();
  // Page content
}

// Require specific roles
function AdminPage() {
  useRequireAuth(['admin', 'top_management']);
  // Admin-only content
}
```

## Check User Role

```typescript
import { useHasRole } from '@/lib/auth/hooks';

function SomeComponent() {
  const isAdmin = useHasRole(['admin']);
  const canManage = useHasRole(['admin', 'top_management']);

  return (
    <>
      {isAdmin && <AdminButton />}
      {canManage && <ManageButton />}
    </>
  );
}
```

## Conditional Rendering

```typescript
const user = useUser();

return (
  <>
    {user?.role === 'admin' && <AdminPanel />}
    {user?.role === 'top_management' && <ExecutivePanel />}
    {user?.role === 'kepala_rayon' && <RayonPanel />}
  </>
);
```

## Role Types

```typescript
type UserRole =
  | 'admin'
  | 'top_management'
  | 'kepala_rayon'
  | 'koordinator_lapangan'
  | 'worker'
  | 'linmas';
```

## Test Credentials

```
admin / admin123
top_management1 / password123
kepala_rayon_selatan / password123
koordinator_bungkul / password123
```

## API Client

```typescript
import { authApi } from '@/lib/api/auth';

// All methods return promises
await authApi.login({ username, password });
await authApi.logout();
await authApi.getCurrentUser();
await authApi.refreshToken(); // Usually automatic
```

## Protected Route Component

```typescript
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

function MyPage() {
  return (
    <ProtectedRoute requiredRoles={['admin']}>
      <AdminContent />
    </ProtectedRoute>
  );
}
```

## Middleware (Automatic)

Routes automatically protected:
- `/dashboard/*` → Requires authentication
- `/login` → Redirects if already logged in
- `/` → Redirects to dashboard or login

## Environment Variables

```env
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
```

## Common Patterns

### Loading State
```typescript
const { user, loading } = useAuth();

if (loading) {
  return <LoadingSpinner />;
}

return <DashboardContent user={user} />;
```

### Error Handling
```typescript
const { login, error } = useAuth();

const handleSubmit = async (data) => {
  try {
    await login(data);
    // Success - will redirect automatically
  } catch (err) {
    // Error is already in auth context
    console.error('Login failed:', error);
  }
};
```

### Check Authentication
```typescript
import { useIsAuthenticated } from '@/lib/auth/hooks';

const isAuthenticated = useIsAuthenticated();

if (!isAuthenticated) {
  return <LoginPrompt />;
}
```

## Troubleshooting

### User is null after login
- Check backend is running
- Verify cookies are set (browser dev tools)
- Check API_URL environment variable

### Redirect loop
- Clear browser cookies
- Check middleware.ts matcher
- Verify token is valid

### 401 Unauthorized
- Token expired (should auto-refresh)
- Backend not running
- CORS issue (check backend CORS settings)

## Security Best Practices

✅ DO:
- Use provided hooks and context
- Keep tokens in httpOnly cookies
- Handle errors gracefully
- Show loading states

❌ DON'T:
- Store tokens in localStorage
- Access cookies directly
- Skip authentication checks
- Hardcode credentials
