"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import { SPOTLIGHT_CHANGE_EVENT, SPOTLIGHT_SET_EVENT, spotlightCss, spotlightKey } from "@/lib/spotlight";

export interface SpotlightManager {
  id: string;
  name: string;
}

interface SpotlightValue {
  /** The spotlit manager's id, or null for nobody. */
  spot: string | null;
  setSpot: (id: string | null) => void;
  managers: SpotlightManager[];
}

const SpotlightContext = createContext<SpotlightValue>({ spot: null, setSpot: () => {}, managers: [] });

/** The current spotlight and a setter; any client component under the league layout can use it. */
export const useSpotlight = () => useContext(SpotlightContext);

// One tiny store per league key: localStorage when it works, memory when it throws (private mode, blocked storage).
const memory = new Map<string, string | null>();
const listeners = new Set<() => void>();

function readStored(key: string): string | null {
  if (!memory.has(key)) {
    let v: string | null = null;
    try {
      v = window.localStorage.getItem(key);
    } catch {}
    memory.set(key, v);
  }
  return memory.get(key) ?? null;
}

function writeStored(key: string, id: string | null) {
  memory.set(key, id);
  try {
    if (id) window.localStorage.setItem(key, id);
    else window.localStorage.removeItem(key);
  } catch {}
  listeners.forEach((l) => l());
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  // Another tab changed it: drop the cached value so the next read picks it up.
  const onStorage = (e: StorageEvent) => {
    if (e.key?.startsWith("spotlight:")) {
      memory.delete(e.key);
      onChange();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

const STYLE_ID = "spotlight-style";

/**
 * Spotlight one manager across every page of a league: sets `data-spot` on <body> and writes one generated
 * style rule that fades every `data-m`-tagged mark and row belonging to anyone else. Also listens for a
 * `spotlight:set` window event ({ detail: { managerId } }) so non-React code and other widgets can set it.
 */
export function SpotlightProvider({ league, managers, children }: { league: string; managers: SpotlightManager[]; children: React.ReactNode }) {
  const key = spotlightKey(league);
  const stored = useSyncExternalStore(
    subscribe,
    () => readStored(key),
    () => null,
  );
  const spot = stored && managers.some((m) => m.id === stored) ? stored : null;
  const setSpot = useCallback(
    (id: string | null) => writeStored(key, id && managers.some((m) => m.id === id) ? id : null),
    [key, managers],
  );

  useEffect(() => {
    const onSet = (e: Event) => setSpot((e as CustomEvent<{ managerId?: string | null }>).detail?.managerId ?? null);
    window.addEventListener(SPOTLIGHT_SET_EVENT, onSet);
    return () => window.removeEventListener(SPOTLIGHT_SET_EVENT, onSet);
  }, [setSpot]);

  useEffect(() => {
    let style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement("style");
      style.id = STYLE_ID;
      document.head.appendChild(style);
    }
    style.textContent = spotlightCss(spot);
    if (spot) document.body.dataset.spot = spot;
    else delete document.body.dataset.spot;
    window.dispatchEvent(new CustomEvent(SPOTLIGHT_CHANGE_EVENT, { detail: { managerId: spot } }));
  }, [spot]);

  // Leaving the league (legal pages, unlock) clears the fading.
  useEffect(
    () => () => {
      delete document.body.dataset.spot;
      document.getElementById(STYLE_ID)?.remove();
    },
    [],
  );

  const value = useMemo(() => ({ spot, setSpot, managers }), [spot, setSpot, managers]);
  return <SpotlightContext.Provider value={value}>{children}</SpotlightContext.Provider>;
}
