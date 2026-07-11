import type { Filing, FilingSearchParams, FilingDocument, Stock } from "@/types/sec";

// ─── Configuration ───────────────────────────────────────────────────────────

const USER_AGENT = "CommerceApp/1.0 admin@example.com";
const SEC_BASE_URL = "https://www.sec.gov";
const SEC_DATA_URL = "https://data.sec.gov";

// ─── Rate Limiter ────────────────────────────────────────────────────────────

class RateLimiter {
  private requests: number[] = [];
  private readonly maxPerSecond: number;

  constructor(maxPerSecond: number) {
    this.maxPerSecond = maxPerSecond;
  }

  async acquire(): Promise<void> {
    const now = Date.now();
    // Remove timestamps older than 1 second
    this.requests = this.requests.filter((t) => now - t < 1000);

    if (this.requests.length >= this.maxPerSecond) {
      // Wait until the oldest request falls outside the 1-second window
      const oldest = this.requests[0];
      const delay = 1000 - (now - oldest) + 10; // +10ms buffer
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    this.requests.push(Date.now());
  }
}

const rateLimiter = new RateLimiter(10);

// ─── Fetch Helpers ───────────────────────────────────────────────────────────

function buildHeaders(): HeadersInit {
  return {
    "User-Agent": USER_AGENT,
    Accept: "application/json",
  };
}

async function secFetch(url: string): Promise<Response> {
  await rateLimiter.acquire();

  const res = await fetch(url, { headers: buildHeaders() });

  if (res.status === 404) {
    throw new Error(`SEC resource not found: ${url}`);
  }

  if (!res.ok) {
    throw new Error(`SEC API error (${res.status}): ${res.statusText}`);
  }

  return res;
}

// ─── CIK Utilities ───────────────────────────────────────────────────────────

/**
 * Pad CIK to 10 digits with leading zeros.
 */
export function padCik(cik: string): string {
  return cik.padStart(10, "0");
}

// ─── Ticker Search (with in-memory cache) ────────────────────────────────────

interface TickerEntry {
  cik_str: number;
  ticker: string;
  title: string;
}

let tickersCache: TickerEntry[] | null = null;
let tickersCachePromise: Promise<TickerEntry[]> | null = null;

async function fetchAllTickers(): Promise<TickerEntry[]> {
  if (tickersCache) return tickersCache;

  // Deduplicate concurrent calls while first fetch is in-flight
  if (tickersCachePromise) return tickersCachePromise;

  tickersCachePromise = (async () => {
    const res = await secFetch(
      `${SEC_BASE_URL}/files/company_tickers.json`
    );
    const data: Record<string, TickerEntry> = await res.json();
    tickersCache = Object.values(data);
    return tickersCache;
  })();

  return tickersCachePromise;
}

/**
 * Search companies by ticker or name.
 * Fetches SEC's company_tickers.json and returns matching stocks sorted by relevance.
 */
export async function searchStocks(query: string): Promise<Stock[]> {
  if (!query || query.trim().length === 0) return [];

  const normalized = query.trim().toUpperCase();
  const tickers = await fetchAllTickers();

  const results: Stock[] = tickers
    .filter((entry) => {
      const tickerMatch = entry.ticker.toUpperCase().includes(normalized);
      const nameMatch = entry.title.toUpperCase().includes(normalized);
      return tickerMatch || nameMatch;
    })
    .map((entry) => ({
      ticker: entry.ticker,
      name: entry.title,
      cik: String(entry.cik_str),
      cikPadded: padCik(String(entry.cik_str)),
      exchange: guessExchange(entry.ticker),
    }));

  // Sort: exact ticker match first, then starts with, then includes in ticker/name
  results.sort((a, b) => {
    const aTicker = a.ticker.toUpperCase();
    const bTicker = b.ticker.toUpperCase();

    const aExact = aTicker === normalized ? 0 : 1;
    const bExact = bTicker === normalized ? 0 : 1;
    if (aExact !== bExact) return aExact - bExact;

    const aStarts = aTicker.startsWith(normalized) ? 0 : 1;
    const bStarts = bTicker.startsWith(normalized) ? 0 : 1;
    if (aStarts !== bStarts) return aStarts - bStarts;

    return a.ticker.localeCompare(b.ticker);
  });

  return results.slice(0, 10);
}

/**
 * Guess exchange based on ticker patterns.
 * Falls back to "NASDAQ" for common 1-4 letter tickers, "NYSE" for others.
 */
function guessExchange(ticker: string): string {
  // Common NASDAQ tickers are typically 1-4 characters
  if (ticker.length <= 4) return "NASDAQ";
  return "NYSE";
}

// ─── Filings ─────────────────────────────────────────────────────────────────

interface RecentFilings {
  form: string[];
  primaryDocDescription?: string[];
  description?: string[];
  filingDate: string[];
  accessionNumber: string[];
  primaryDocument: string[];
}

/**
 * Get filings for a company within optional date range and form types.
 */
export async function getFilings(
  params: FilingSearchParams
): Promise<Filing[]> {
  const { cik, from, to, types } = params;
  const paddedCik = padCik(cik);

  const url = `${SEC_DATA_URL}/submissions/CIK${paddedCik}.json`;

  let data: { filings: { recent: RecentFilings } };
  try {
    const res = await secFetch(url);
    data = await res.json();
  } catch (err) {
    console.error("Failed to fetch SEC filings:", err);
    throw err;
  }

  const recent = data.filings?.recent;
  if (!recent?.form || !recent.filingDate?.length) {
    return [];
  }

  // Defensive: use the minimum length across all arrays to avoid index mismatches
  const count = Math.min(
    recent.form.length,
    recent.filingDate.length,
    recent.accessionNumber?.length ?? Infinity,
    recent.primaryDocument?.length ?? Infinity,
  );

  const filings: Filing[] = [];

  for (let i = 0; i < count; i++) {
    const formType = recent.form[i];
    const filingDate = recent.filingDate[i];

    // Filter by form types
    if (types && types.length > 0) {
      const matchesType = types.some((t) => {
        // Support wildcard-like matching (e.g. "10-K" matches "10-K", "10-K/A")
        return formType === t || formType.startsWith(t + "/");
      });
      if (!matchesType) continue;
    }

    // Filter by date range
    if (from && filingDate < from) continue;
    if (to && filingDate > to) continue;

    const accessionNumber = recent.accessionNumber?.[i];
    const primaryDoc = recent.primaryDocument?.[i];

    // Skip entries with missing critical data
    if (!accessionNumber || !primaryDoc) continue;

    const document: FilingDocument = {
      name: primaryDoc,
      type: formType,
      sequence: 1,
    };

    // SEC API uses primaryDocDescription; description is a fallback
    const desc = recent.primaryDocDescription?.[i] ?? recent.description?.[i] ?? "";

    filings.push({
      accessionNumber,
      formType,
      description: desc,
      filingDate,
      documents: [document],
    });
  }

  // Sort by filingDate descending (newest first)
  filings.sort((a, b) => b.filingDate.localeCompare(a.filingDate));

  return filings.slice(0, 100);
}

// ─── Download URL ────────────────────────────────────────────────────────────

/**
 * Generate the download URL for a specific filing document.
 */
export function getFilingDownloadUrl(
  cik: string,
  accessionNumber: string,
  documentName: string
): { url: string; filename: string } {
  const cikRaw = cik.replace(/^0+/, ""); // Remove leading zeros for URL
  const accessionNoDashes = accessionNumber.replace(/-/g, "");

  const url = `${SEC_BASE_URL}/Archives/edgar/data/${cikRaw}/${accessionNoDashes}/${documentName}`;
  const filename = documentName;

  return { url, filename };
}
