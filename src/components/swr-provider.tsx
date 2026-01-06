"use client";

import type { ReactNode } from "react";
import { SWRConfig, type SWRConfiguration } from "swr";

type Props = {
  children: ReactNode;
  fallback?: Record<string, unknown>;
};

const defaultConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 10_000,
  focusThrottleInterval: 5_000,
  errorRetryCount: 2,
  keepPreviousData: true,
  fetcher: async (resource: string, init?: RequestInit) => {
    const res = await fetch(resource, init);
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      const message = payload?.error ?? `Request failed: ${res.status} ${res.statusText}`;
      throw new Error(message);
    }
    return res.json();
  },
};

export function SwrProvider({ children, fallback }: Props) {
  return <SWRConfig value={{ ...defaultConfig, fallback }}>{children}</SWRConfig>;
}
