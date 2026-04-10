/**
 * MindClient — HTTP client wrapper for the MIND developer API.
 *
 * Auth: X-API-Key header with a `mind_` prefixed key.
 * Base URL: https://www.m-i-n-d.ai (or override for self-hosted).
 *
 * All methods are typed end to end. Errors are normalized to MindClientError
 * with status code, response body, and request context.
 */

export interface Logger {
  info: (msg: string, ...args: unknown[]) => void;
  warn: (msg: string, ...args: unknown[]) => void;
  error: (msg: string, ...args: unknown[]) => void;
  debug?: (msg: string, ...args: unknown[]) => void;
}

export interface MindClientOptions {
  apiKey: string;
  baseUrl?: string;
  logger?: Logger;
  timeoutMs?: number;
  maxRetries?: number;
}

export class MindClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly path: string,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = "MindClientError";
  }
}

// ─── Domain types (mirror MIND backend response shapes) ───

export type QueryMode = "hybrid" | "mix" | "global" | "local" | "naive";

export interface QueryRequest {
  query: string;
  mode?: QueryMode;
  top_k?: number;
  history_turns?: number;
  user_prompt?: string;
}

export interface QueryResponse {
  answer: string;
  sources?: Array<{
    id: string;
    title?: string;
    snippet?: string;
    score?: number;
  }>;
  credit_cost?: number;
  model_used?: string;
}

export interface DocumentCreateRequest {
  title: string;
  content: string;
  tags?: string[];
  source?: string;
  metadata?: Record<string, unknown>;
}

export interface MindDocument {
  id: string;
  title: string;
  content?: string;
  tags?: string[];
  source?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  content_preview?: string;
}

export interface DocumentListResponse {
  documents: MindDocument[];
  total?: number;
  page?: number;
  page_size?: number;
}

export interface EntryCreateRequest {
  title?: string;
  content: string;
  type?: "thought" | "entry" | "observation";
  tags?: string[];
  source?: string;
}

export interface MindEntry {
  id: string;
  title?: string;
  content: string;
  type?: string;
  tags?: string[];
  created_at?: string;
}

export interface GraphInfoResponse {
  entity_count?: number;
  relationship_count?: number;
  storage_health?: string;
  credits_remaining?: number;
  [key: string]: unknown;
}

export interface LifeItemCreateRequest {
  title: string;
  description?: string;
  type?: "task" | "goal" | "project";
  status?: "todo" | "in_progress" | "blocked" | "done";
  priority?: "low" | "medium" | "high" | "urgent";
  due_date?: string;
  parent_id?: string;
  tags?: string[];
}

export interface LifeItem {
  id: string;
  title: string;
  description?: string;
  type?: string;
  status?: string;
  priority?: string;
  due_date?: string;
  created_at?: string;
}

export interface CrmContactCreateRequest {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  type?: string;
  stage?: string;
  notes?: string;
  tags?: string[];
}

export interface CrmContact {
  id: string;
  name: string;
  email?: string;
  company?: string;
  stage?: string;
  created_at?: string;
}

export interface CrmActivityLogRequest {
  type: "call" | "email" | "meeting" | "note" | "other";
  summary: string;
  occurred_at?: string;
  metadata?: Record<string, unknown>;
}

// ─── Client ───

export class MindClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly logger: Logger | undefined;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;

  constructor(opts: MindClientOptions) {
    if (!opts.apiKey) {
      throw new Error("MindClient: apiKey is required");
    }
    this.apiKey = opts.apiKey;
    this.baseUrl = (opts.baseUrl ?? "https://www.m-i-n-d.ai").replace(/\/$/, "");
    this.logger = opts.logger;
    this.timeoutMs = opts.timeoutMs ?? 30_000;
    this.maxRetries = opts.maxRetries ?? 2;
  }

  // ─── Query / Search ───

  async query(req: QueryRequest): Promise<QueryResponse> {
    return this.request<QueryResponse>("POST", "/developer/v1/query", req);
  }

  // ─── Documents ───

  async createDocument(req: DocumentCreateRequest): Promise<MindDocument> {
    return this.request<MindDocument>("POST", "/developer/v1/documents", req);
  }

  async listDocuments(opts: { limit?: number; offset?: number } = {}): Promise<DocumentListResponse> {
    const params = new URLSearchParams();
    if (opts.limit !== undefined) params.set("limit", String(opts.limit));
    if (opts.offset !== undefined) params.set("offset", String(opts.offset));
    const qs = params.toString();
    return this.request<DocumentListResponse>(
      "GET",
      `/developer/v1/documents${qs ? `?${qs}` : ""}`,
    );
  }

  async getDocument(id: string): Promise<MindDocument> {
    return this.request<MindDocument>("GET", `/developer/v1/documents/${id}`);
  }

  async deleteDocument(id: string): Promise<{ ok: boolean }> {
    return this.request<{ ok: boolean }>("DELETE", `/developer/v1/documents/${id}`);
  }

  // ─── Entries (lighter-weight than documents) ───

  async createEntry(req: EntryCreateRequest): Promise<MindEntry> {
    return this.request<MindEntry>("POST", "/developer/v1/entries", req);
  }

  async listEntries(opts: { limit?: number; offset?: number } = {}): Promise<{ entries: MindEntry[] }> {
    const params = new URLSearchParams();
    if (opts.limit !== undefined) params.set("limit", String(opts.limit));
    if (opts.offset !== undefined) params.set("offset", String(opts.offset));
    const qs = params.toString();
    return this.request<{ entries: MindEntry[] }>(
      "GET",
      `/developer/v1/entries${qs ? `?${qs}` : ""}`,
    );
  }

  async searchEntries(query: string, limit = 10): Promise<{ entries: MindEntry[] }> {
    const params = new URLSearchParams({ q: query, limit: String(limit) });
    return this.request<{ entries: MindEntry[] }>(
      "GET",
      `/developer/v1/entries/search?${params}`,
    );
  }

  async deleteEntry(id: string): Promise<{ ok: boolean }> {
    return this.request<{ ok: boolean }>("DELETE", `/developer/v1/entries/${id}`);
  }

  // ─── Graph ───

  async getGraphInfo(): Promise<GraphInfoResponse> {
    return this.request<GraphInfoResponse>("GET", "/developer/v1/graph");
  }

  async getGraphDiagnostics(): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>("GET", "/developer/v1/graph/diagnostics");
  }

  // ─── Life Management ───

  async createLifeItem(req: LifeItemCreateRequest): Promise<LifeItem> {
    return this.request<LifeItem>("POST", "/developer/v1/life/items", req);
  }

  async listLifeItems(opts: { status?: string; limit?: number } = {}): Promise<{ items: LifeItem[] }> {
    const params = new URLSearchParams();
    if (opts.status) params.set("status", opts.status);
    if (opts.limit !== undefined) params.set("limit", String(opts.limit));
    const qs = params.toString();
    return this.request<{ items: LifeItem[] }>(
      "GET",
      `/developer/v1/life/items${qs ? `?${qs}` : ""}`,
    );
  }

  async completeLifeItem(id: string): Promise<{ ok: boolean }> {
    return this.request<{ ok: boolean }>("POST", `/developer/v1/life/items/${id}/complete`, {});
  }

  // ─── CRM ───

  async createCrmContact(req: CrmContactCreateRequest): Promise<CrmContact> {
    return this.request<CrmContact>("POST", "/developer/v1/crm/contacts", req);
  }

  async listCrmContacts(opts: { limit?: number } = {}): Promise<{ contacts: CrmContact[] }> {
    const params = new URLSearchParams();
    if (opts.limit !== undefined) params.set("limit", String(opts.limit));
    const qs = params.toString();
    return this.request<{ contacts: CrmContact[] }>(
      "GET",
      `/developer/v1/crm/contacts${qs ? `?${qs}` : ""}`,
    );
  }

  async logCrmActivity(
    contactId: string,
    req: CrmActivityLogRequest,
  ): Promise<{ ok: boolean }> {
    return this.request<{ ok: boolean }>(
      "POST",
      `/developer/v1/crm/contacts/${contactId}/activities`,
      req,
    );
  }

  // ─── Internal HTTP layer ───

  private async request<T>(
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      "X-API-Key": this.apiKey,
      Accept: "application/json",
      "User-Agent": "openclaw-mind/0.1.0",
    };
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    let lastError: Error | undefined;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const resp = await fetch(url, {
          method,
          headers,
          body: body !== undefined ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!resp.ok) {
          const text = await resp.text().catch(() => "");
          let parsed: unknown = text;
          try {
            parsed = JSON.parse(text);
          } catch {
            // body is not JSON; keep as text
          }

          // Retry transient failures
          if ([429, 500, 502, 503, 504].includes(resp.status) && attempt < this.maxRetries) {
            const backoff = 500 * Math.pow(2, attempt);
            this.logger?.warn?.(
              `MIND ${method} ${path} → ${resp.status}, retrying in ${backoff}ms (attempt ${attempt + 1}/${this.maxRetries + 1})`,
            );
            await sleep(backoff);
            continue;
          }

          throw new MindClientError(
            `MIND API ${resp.status} ${resp.statusText} on ${method} ${path}`,
            resp.status,
            path,
            parsed,
          );
        }

        const ct = resp.headers.get("content-type") ?? "";
        if (ct.includes("application/json")) {
          return (await resp.json()) as T;
        }
        return (await resp.text()) as unknown as T;
      } catch (err) {
        clearTimeout(timeout);
        lastError = err as Error;
        if (err instanceof MindClientError) throw err;
        if (attempt < this.maxRetries) {
          const backoff = 500 * Math.pow(2, attempt);
          this.logger?.warn?.(
            `MIND ${method} ${path} network error, retrying in ${backoff}ms: ${(err as Error).message}`,
          );
          await sleep(backoff);
          continue;
        }
        throw err;
      }
    }
    throw lastError ?? new Error("MindClient: exhausted retries");
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
