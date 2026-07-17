import { useEffect, useState } from 'react';
import type { AccountSession, AuthService } from '../cloud/types';

export function useAccountSession(auth: AuthService | null) {
  const [session, setSession] = useState<AccountSession | null>(null);
  const [loading, setLoading] = useState(auth !== null);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  useEffect(() => {
    if (!auth) {
      return;
    }

    let active = true;
    const unsubscribe = auth.onAuthStateChange(({ event, session: nextSession }) => {
      if (active) {
        setSession(nextSession);
        setPasswordRecovery(event === 'password-recovery');
        setLoading(false);
      }
    });

    void auth
      .getSession()
      .then((nextSession) => {
        if (active) {
          setSession(nextSession);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setSession(null);
          setLoading(false);
        }
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [auth]);

  return { session, loading, passwordRecovery, clearPasswordRecovery: () => setPasswordRecovery(false) };
}
