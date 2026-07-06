/**
 * Login Page Loading State
 *
 * Shown while login page is loading
 */
export default function LoginLoading() {
  return (
    <div className="min-h-screen bg-nb-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card skeleton */}
        <div className="bg-nb-white border-2 border-nb-black shadow-nb-md p-8">
          {/* Logo/Title skeleton */}
          <div className="text-center mb-8 space-y-2">
            <div className="h-10 w-32 bg-nb-gray-200 mx-auto animate-pulse" />
            <div className="h-4 w-48 bg-nb-gray-200 mx-auto animate-pulse" />
          </div>

          {/* Form skeleton */}
          <div className="space-y-4">
            {/* Username field skeleton */}
            <div className="space-y-1">
              <div className="h-5 w-20 bg-nb-gray-200 animate-pulse" />
              <div className="h-12 w-full bg-nb-gray-100 border-2 border-nb-gray-300 animate-pulse" />
            </div>

            {/* Password field skeleton */}
            <div className="space-y-1">
              <div className="h-5 w-20 bg-nb-gray-200 animate-pulse" />
              <div className="h-12 w-full bg-nb-gray-100 border-2 border-nb-gray-300 animate-pulse" />
            </div>

            {/* Button skeleton */}
            <div className="h-12 w-full bg-nb-gray-300 border-2 border-nb-gray-400 animate-pulse" />
          </div>

          {/* Info box skeleton */}
          <div className="mt-6 p-4 bg-nb-gray-100 border-2 border-nb-gray-300 animate-pulse">
            <div className="h-4 w-32 bg-nb-gray-300 mb-2" />
            <div className="space-y-1">
              <div className="h-3 w-full bg-nb-gray-300" />
              <div className="h-3 w-full bg-nb-gray-300" />
              <div className="h-3 w-3/4 bg-nb-gray-300" />
            </div>
          </div>
        </div>

        {/* Footer skeleton */}
        <div className="text-center mt-4">
          <div className="h-4 w-48 bg-nb-gray-200 mx-auto animate-pulse" />
        </div>
      </div>
    </div>
  );
}
