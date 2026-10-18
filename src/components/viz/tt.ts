/**
 * Chart tooltip text for a `data-tt` attribute: a title, then label/value rows, then an optional note.
 * ChartTooltip renders it on hover or focus, so server-rendered charts get rich tooltips with no client code.
 */
export function tt(title: string, rows: [string, string | number][] = [], note = ""): string {
  return [title, ...rows.map(([k, v]) => `${k}\t${v}`), ...(note ? [`~${note}`] : [])].join("\n");
}
