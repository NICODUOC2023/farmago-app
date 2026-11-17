import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';

import { MapScreen } from '@/components/maps/MapScreen';
import { ConsentGate } from '@/components/privacy/ConsentGate';
import { useAuth } from '@/providers/AuthProvider';
import { hasConsent } from '@/services/consents';

export default function HomeScreen() {
  const { session, isLoading } = useAuth();
  const [checking, setChecking] = useState(true);
  const [needsConsent, setNeedsConsent] = useState(false);

  useEffect(() => {
    if (isLoading || !session) {
      setTimeout(() => setChecking(false), 0);
      return;
    }
    let mounted = true;
    (async () => {
      const terms = await hasConsent('terms_of_service');
      const privacy = await hasConsent('privacy_policy');
      if (mounted) {
        setTimeout(() => {
          setNeedsConsent(!(terms && privacy));
          setChecking(false);
        }, 0);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [session, isLoading]);

  if (isLoading || checking) {
    return null;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (needsConsent) {
    return <ConsentGate onDone={() => setNeedsConsent(false)} />;
  }

  return <MapScreen />;
}
