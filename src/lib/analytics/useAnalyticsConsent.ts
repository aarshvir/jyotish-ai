'use client';

import { useEffect, useState } from 'react';
import { analyticsConsentRevision, browserPrivacySignal, hasAnalyticsConsent, subscribeAnalyticsConsent } from './consent';

export function useAnalyticsConsent() {
  const [state, setState] = useState({ allowed: false, revision: 0, blocked: false });
  useEffect(() => {
    const sync = () => setState({ allowed: hasAnalyticsConsent(), revision: analyticsConsentRevision(), blocked: browserPrivacySignal() });
    const unsubscribe = subscribeAnalyticsConsent(sync);
    sync();
    return unsubscribe;
  }, []);
  return state;
}
