const TZ = "Asia/Jakarta"; // GMT+7 / WIB

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
}

/**
 * Returns the current date/time formatted as a datetime-local input value
 * (YYYY-MM-DDTHH:mm) in the WIB timezone (GMT+7).
 */
export function nowLocalDateTimeString(): string {
  const now = new Date();
  // Format each part in WIB
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/**
 * Returns today's date as YYYYMMDD in WIB — used for invoice generation.
 */
export function todayWIBString(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: TZ, dateStyle: "short" })
    .format(new Date())
    .replace(/-/g, "");
}

export function generateInvoice(): string {
  const date = todayWIBString();
  const rand = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  return `INV-${date}-${rand}`;
}

/** Format a date string for display — day + short month only. */
export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}

/** Format an ISO datetime string in WIB for display (e.g. "20 Jun 2026, 15.30"). */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", {
    timeZone: TZ,
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** Format an ISO datetime string as a short date in WIB (e.g. "20 Jun 2026"). */
export function formatDateWIB(
  iso: string,
  opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric" },
): string {
  return new Date(iso).toLocaleDateString("id-ID", { timeZone: TZ, ...opts });
}

/** Format an ISO datetime string as time only in WIB (e.g. "15.30"). */
export function formatTimeWIB(iso: string): string {
  return new Date(iso).toLocaleTimeString("id-ID", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
  });
}
