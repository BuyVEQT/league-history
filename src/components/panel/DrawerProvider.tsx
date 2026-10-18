"use client";

import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { monograms } from "@/components/viz/monograms";
import { useLeagueBase } from "@/components/useLeagueBase";
import type { PanelData } from "@/lib/analytics/panelView";
import { PANEL_EVENT, parsePanel, type PanelKind } from "./openPanel";
import { ManagerPanel, NotFound, PlayerPanel, SeasonPanel, type PanelCtx } from "./panels";

const KIND_LABEL: Record<PanelKind, string> = { manager: "Manager", season: "Season", player: "Player" };
const PARAM = "panel";

const DrawerContext = createContext<{ openPanel: (kind: PanelKind, id: string) => void; closePanel: () => void }>({
  openPanel: () => {},
  closePanel: () => {},
});

/** `openPanel(kind, id)` / `closePanel()` for any client component under the league layout. */
export const useDrawer = () => useContext(DrawerContext);

/** The current URL with `?panel=` set (or removed), keeping other params and the hash. */
function urlWith(panel: string | null): string {
  const u = new URL(window.location.href);
  if (panel) u.searchParams.set(PARAM, panel);
  else u.searchParams.delete(PARAM);
  return u.pathname + u.search + u.hash;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * The side panel: a right-hand drawer over a dimmed page with manager, season or player details.
 * Opens from `openPanel` (context or the DOM event in ./openPanel) and from a click on any element
 * with `data-panel="<kind>:<id>"`; a modified click (Cmd/Ctrl/Shift/Alt) still follows a link.
 * The open panel is mirrored in `?panel=kind:id`, read on the client after load so pages stay static.
 */
export function DrawerProvider({ data, children }: { data: PanelData; children: ReactNode }) {
  const [panel, setPanel] = useState<[PanelKind, string] | null>(null);
  const [open, setOpen] = useState(false);
  const drawerRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const openRef = useRef(false);
  const pathname = usePathname();
  const base = useLeagueBase();

  /** Players by id, falling back to a name match for links that only know the name. */
  const findPlayer = useCallback(
    (id: string) => {
      if (data.players[id]) return id;
      const n = id.toLowerCase();
      return Object.keys(data.players).find((k) => data.players[k].name.toLowerCase() === n) ?? null;
    },
    [data],
  );
  const exists = useCallback(
    (kind: PanelKind, id: string) => (kind === "manager" ? !!data.managers[id] : kind === "season" ? !!data.seasons[Number(id)] : findPlayer(id) !== null),
    [data, findPlayer],
  );

  const show = useCallback(
    (kind: PanelKind, id: string, sync = true) => {
      if (!openRef.current) {
        const a = document.activeElement;
        lastFocus.current = a instanceof HTMLElement && a !== document.body ? a : null;
      }
      openRef.current = true;
      const key = kind === "player" ? (findPlayer(id) ?? id) : id;
      setPanel([kind, key]);
      setOpen(true);
      if (sync) window.history.replaceState(null, "", urlWith(`${kind}:${key}`));
    },
    [findPlayer],
  );

  /** `restore` = put focus back on the trigger; `sync` = drop the URL param (not when a navigation is replacing the URL). */
  const hide = useCallback((restore = true, sync = true) => {
    if (!openRef.current) return;
    openRef.current = false;
    setOpen(false);
    if (sync && new URL(window.location.href).searchParams.has(PARAM)) window.history.replaceState(null, "", urlWith(null));
    if (restore && lastFocus.current?.isConnected) lastFocus.current.focus({ preventScroll: true });
    lastFocus.current = null;
  }, []);

  // Open from the URL on load and after each navigation; a navigation without the param closes the panel.
  const firstPath = useRef(true);
  useEffect(() => {
    const fromUrl = (e?: Event) => {
      const p = parsePanel(new URLSearchParams(window.location.search).get(PARAM));
      if (p && exists(...p)) show(p[0], p[1], false);
      else if (e || !firstPath.current) hide(false, false);
    };
    fromUrl();
    firstPath.current = false;
    window.addEventListener("popstate", fromUrl);
    return () => window.removeEventListener("popstate", fromUrl);
  }, [pathname, exists, show, hide]);

  // Any element with data-panel opens it. Capture phase, so a Next <Link> sees the click as handled.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const el = e.target instanceof Element ? e.target.closest("[data-panel]") : null;
      const p = parsePanel(el?.getAttribute("data-panel"));
      if (!p || !exists(...p)) return;
      e.preventDefault();
      show(...p);
    };
    const onEvent = (e: Event) => {
      const { kind, id } = (e as CustomEvent<{ kind: PanelKind; id: string }>).detail ?? {};
      if (kind && id && exists(kind, id)) show(kind, id);
    };
    document.addEventListener("click", onClick, true);
    document.addEventListener(PANEL_EVENT, onEvent);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener(PANEL_EVENT, onEvent);
    };
  }, [exists, show]);

  // Esc closes; Tab stays inside the drawer while it is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        hide();
        return;
      }
      if (e.key !== "Tab" || !drawerRef.current) return;
      const items = [...drawerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const inside = drawerRef.current.contains(document.activeElement);
      if (e.shiftKey && (document.activeElement === first || !inside)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !inside)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, hide]);

  // Each new panel starts at the top with focus on ✕.
  useEffect(() => {
    if (!open) return;
    bodyRef.current?.scrollTo({ top: 0 });
    closeRef.current?.focus({ preventScroll: true });
  }, [open, panel]);

  const ctx = useMemo((): Omit<PanelCtx, "close"> => {
    const mono = monograms(Object.values(data.managers).map((m) => ({ id: m.id, name: m.name })));
    const labels = new Map(data.years.map((y) => [y.year, y.label]));
    return {
      data,
      base,
      mono,
      nameOf: (id) => data.managers[id]?.name ?? id,
      labelOf: (y) => labels.get(y) ?? String(y),
    };
  }, [data, base]);
  const panelCtx: PanelCtx = { ...ctx, close: () => hide(false) };

  const api = useMemo(() => ({ openPanel: (kind: PanelKind, id: string) => exists(kind, id) && show(kind, id), closePanel: () => hide() }), [exists, show, hide]);

  let content: ReactNode = null;
  if (panel) {
    const [kind, id] = panel;
    const m = kind === "manager" ? data.managers[id] : undefined;
    const s = kind === "season" ? data.seasons[Number(id)] : undefined;
    const p = kind === "player" ? data.players[id] : undefined;
    content = m ? <ManagerPanel m={m} ctx={panelCtx} /> : s ? <SeasonPanel s={s} ctx={panelCtx} /> : p ? <PlayerPanel p={p} ctx={panelCtx} /> : <NotFound kind={kind} />;
  }

  return (
    <DrawerContext.Provider value={api}>
      {children}
      <div className={`pn-veil ${open ? "open" : ""}`} onClick={() => hide()} aria-hidden />
      <aside
        ref={drawerRef}
        className={`pn-drawer ${open ? "open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pn-title"
        aria-hidden={!open}
        inert={!open}
        onClick={(e) => {
          // A plain click on a link inside the panel navigates away: let the panel go with it.
          const a = e.target instanceof Element ? e.target.closest("a[href]") : null;
          if (a && !e.defaultPrevented && !(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)) hide(false, false);
        }}
      >
        <div className="pn-head">
          <span className="pn-kind">{panel ? KIND_LABEL[panel[0]] : ""}</span>
          <button ref={closeRef} type="button" className="pn-x" aria-label="Close panel" onClick={() => hide()}>
            ✕
          </button>
        </div>
        <div ref={bodyRef} className="pn-body">
          {content}
        </div>
      </aside>
    </DrawerContext.Provider>
  );
}
