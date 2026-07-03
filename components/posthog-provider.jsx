'use client';
import { useEffect } from 'react';
import posthog from 'posthog-js';

let inited = false;

export function PostHogProvider({ children }) {
  useEffect(() => {
    if (inited) return;
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';
    if (!key) return;
    posthog.init(key, { api_host: host, capture_pageview: true, person_profiles: 'identified_only' });
    inited = true;
  }, []);
  return children;
}
