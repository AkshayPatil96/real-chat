import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useEffect, useState } from 'react';
import { setTokenProvider } from '@/store/api/baseQuery';
import { useGetCurrentUserQuery } from '@/store/api';

export function useAuth() {
  const { getToken, isLoaded, isSignedIn } = useClerkAuth();
  const [isTokenReady, setIsTokenReady] = useState(false);

  const { data } = useGetCurrentUserQuery(
    undefined,
    { skip: !isTokenReady },
  );

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      setTokenProvider(async () => {
        try {
          return await getToken();
        } catch (error) {
          console.error('Failed to get auth token:', error);
          return null;
        }
      });
      setIsTokenReady(true);
    } else if (isLoaded && !isSignedIn) {
      // Clear token provider if not signed in
      setTokenProvider(async () => null);
      setIsTokenReady(false);
    }
  }, [getToken, isLoaded, isSignedIn]);

  return {
    user: data,
    isLoaded,
    isSignedIn,
    isTokenReady,
    getToken,
  };
}
