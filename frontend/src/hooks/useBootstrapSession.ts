import { useEffect, useState } from 'react';

import type { UserSession } from '@/src/types/session';
import { loadSession } from '@/src/utils/storage';

export function useBootstrapSession() {
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<UserSession | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function bootstrap() {
      try {
        const foundSession = await loadSession();
        if (isMounted) {
          setSession(foundSession);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    bootstrap();

    return () => {
      isMounted = false;
    };
  }, []);

  return { isLoading, session };
}
