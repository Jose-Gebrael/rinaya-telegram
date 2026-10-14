// One line per event, with a timestamp; pm2 keeps the output on the VPS.
// Never log tokens or .env values.
export function log(event: string, data: Record<string, unknown> = {}) {
  const fields = Object.entries(data).map(([k, v]) => `${k}=${typeof v === "bigint" ? v.toString() : JSON.stringify(v)}`);
  console.log([new Date().toISOString(), event, ...fields].join(" "));
}
