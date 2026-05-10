// Resolves a JSON-path-like binding "$.foo.bar[0]" against a data object.
// Special case: "$BACKEND/..." returns the URL as a string (or null if no backend).
export function resolveBinding(
  expr: string,
  data: Record<string, unknown>,
  backendUrl: string | null
): unknown {
  if (typeof expr !== "string") return expr;
  if (expr.startsWith("$BACKEND/")) {
    if (!backendUrl) return null;
    const path = expr.slice("$BACKEND".length); // e.g. "/metrics"
    // Insert path before any existing query string so e.g.
    // "https://host?token=X" + "/metrics" → "https://host/metrics?token=X"
    const qIdx = backendUrl.indexOf("?");
    if (qIdx === -1) return backendUrl + path;
    return backendUrl.slice(0, qIdx) + path + backendUrl.slice(qIdx);
  }
  if (!expr.startsWith("$")) return expr;
  const path = expr.slice(1).replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean);
  let cur: unknown = data;
  for (const seg of path) {
    if (cur == null) return undefined;
    cur = (cur as Record<string, unknown>)[seg];
  }
  return cur;
}
