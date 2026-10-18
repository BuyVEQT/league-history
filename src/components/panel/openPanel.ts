/** What the side panel can show. Triggers name one as `data-panel="<kind>:<id>"`. */
export type PanelKind = "manager" | "season" | "player";
export const PANEL_KINDS: PanelKind[] = ["manager", "season", "player"];

/** Event the DrawerProvider listens for, so code outside React context (d3 handlers) can open a panel. */
export const PANEL_EVENT = "panel:open";

export function openPanel(kind: PanelKind, id: string) {
  document.dispatchEvent(new CustomEvent(PANEL_EVENT, { detail: { kind, id } }));
}

/** `data-panel` value for a trigger, or undefined when there is nothing to open. */
export const panelAttr = (kind: PanelKind, id: string | number | null | undefined) => (id == null || id === "" ? undefined : `${kind}:${id}`);

/** "player:abc" → ["player", "abc"]; null for anything malformed. */
export function parsePanel(value: string | null | undefined): [PanelKind, string] | null {
  if (!value) return null;
  const i = value.indexOf(":");
  const kind = value.slice(0, i) as PanelKind;
  const id = value.slice(i + 1);
  return i > 0 && id && PANEL_KINDS.includes(kind) ? [kind, id] : null;
}
