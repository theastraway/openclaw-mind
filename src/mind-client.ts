/**
 * MindClient — HTTP client wrapper for the MIND developer + admin APIs.
 *
 * Auth: X-API-Key header with a `mind_` prefixed key.
 * Base URL: https://www.m-i-n-d.ai (or override for self-hosted).
 *
 * All methods are typed end to end. Errors are normalized to MindClientError
 * with status code, response body, and request context. Transient failures
 * (429/5xx + network errors) retry with exponential backoff.
 *
 * Surface parity: every method here maps 1:1 to a method on the canonical
 * @astramindapp/mcp-server client. Plugin tools register the same 24 named
 * tools the MCP server exposes — same names, same actions, same shapes —
 * so an OpenClaw agent and a Claude Code agent talk to MIND identically.
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

// ─── Query / Search ────────────────────────────────────────────

export type QueryMode = "hybrid" | "mix" | "global" | "local" | "naive";

export interface QueryRequest {
  query: string;
  mode?: QueryMode;
  top_k?: number;
  history_turns?: number;
  user_prompt?: string;
  model?: string;
}

export interface QuerySource {
  id?: string;
  title?: string;
  snippet?: string;
  score?: number;
}

export interface QueryResponse {
  answer: string;
  response?: string; // canonical MCP server uses 'response'
  sources?: QuerySource[];
  credit_cost?: number;
  credits_used?: number;
  credits_remaining?: number;
  model_used?: string;
}

// ─── Documents ─────────────────────────────────────────────────

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

// ─── Folders ───────────────────────────────────────────────────

export interface MindFolder {
  id: string;
  name: string;
  parent_id: string | null;
  created_at?: string;
  updated_at?: string;
  document_count?: number;
}

export interface FolderListResponse {
  folders: MindFolder[];
  unfiled_count: number;
  total_count: number;
}

// ─── Entries / Thoughts ────────────────────────────────────────

export interface EntryCreateRequest {
  title?: string;
  content: string;
  type?: "thought" | "entry" | "observation";
  tags?: string[];
  source?: string;
}

export interface MindEntry {
  id: string;
  entry_id?: string;
  title?: string;
  content: string;
  type?: string;
  tags?: string[];
  created_at?: string;
}

// ─── Graph ─────────────────────────────────────────────────────

export interface GraphInfoResponse {
  total_entities?: number;
  entity_count?: number;
  total_relationships?: number;
  relationship_count?: number;
  popular_labels?: Array<{ label: string | null; count: number }>;
  storage_health?: string;
  storage_status?: { workspace_id: string; status: string };
  credits_remaining?: number;
  [key: string]: unknown;
}

// ─── Life ──────────────────────────────────────────────────────

export interface LifeItemCreateRequest {
  title: string;
  description?: string;
  type?: "task" | "goal" | "project";
  status?: "todo" | "in_progress" | "blocked" | "done";
  priority?: "low" | "medium" | "high" | "urgent";
  due_date?: string;
  parent_id?: string;
  tags?: string[];
  color?: string;
  target_date?: string;
}

export interface LifeItem {
  id: string;
  item_id?: string;
  title: string;
  description?: string;
  type?: string;
  status?: string;
  priority?: string;
  due_date?: string;
  tags?: string[];
  color?: string;
  target_date?: string;
  scheduled_start?: string;
  scheduled_end?: string;
  created_at?: string;
  updated_at?: string;
}

export interface LifeStatsResponse {
  total_items: number;
  status_counts: Record<string, number>;
  completion_rate: number;
}

export interface CalendarEventResponse {
  event_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time?: string;
  all_day?: boolean;
  created_at?: string;
}

export interface CalendarEventListResponse {
  events: CalendarEventResponse[];
  scheduled_items?: Array<{
    item_id: string;
    title: string;
    scheduled_start?: string;
    scheduled_end?: string;
    status?: string;
  }>;
}

export interface CreateCalendarEventRequest {
  title: string;
  description?: string;
  start_time: string;
  end_time?: string;
  all_day?: boolean;
}

// ─── CRM ───────────────────────────────────────────────────────

export interface CrmContactCreateRequest {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  type?: string;
  stage?: string;
  source?: string;
  value?: number;
  notes?: string;
  tags?: string[];
}

export interface CrmContact {
  id?: string;
  contact_id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  type?: string;
  stage?: string;
  source?: string;
  value?: number;
  tags?: string[];
  notes?: string;
  next_follow_up?: string;
  activity_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CrmActivityRequest {
  type: string;
  title: string;
  description?: string;
}

export interface CrmActivityResponse {
  activity_id: string;
  type: string;
  title?: string;
  description?: string;
  created_at?: string;
}

// ─── Tasks ─────────────────────────────────────────────────────

export type TaskStatus = "open" | "in_progress" | "blocked" | "done";
export type TaskPriority = "none" | "low" | "medium" | "high" | "urgent";
export type TaskParentType = "none" | "life_item" | "contact" | "agent";
export type TaskAssigneeType = "unassigned" | "user" | "agent" | "external";

export interface TaskCreateRequest {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string;
  estimated_minutes?: number;
  tags?: string[];
  parent_type?: TaskParentType;
  parent_id?: string;
  parent_label?: string;
  assignee_type?: TaskAssigneeType;
  assignee_id?: string;
  assignee_label?: string;
  dispatch_agent?: boolean;
}

export interface TaskUpdateRequest {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string;
  estimated_minutes?: number;
  tags?: string[];
  parent_type?: TaskParentType;
  parent_id?: string;
  parent_label?: string;
}

export interface TaskAssignRequest {
  assignee_type: TaskAssigneeType;
  assignee_id?: string;
  assignee_label?: string;
  dispatch_agent?: boolean;
}

export interface Task {
  task_id: string;
  user_id?: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  due_date?: string;
  tags?: string[];
  estimated_minutes?: number;
  actual_minutes?: number;
  timer_running?: boolean;
  parent_type?: string;
  parent_id?: string;
  parent_label?: string;
  assignee_type?: string;
  assignee_id?: string;
  assignee_label?: string;
  agent_run_status?: string;
  agent_run_note?: string;
  position?: number;
  is_overdue?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface TaskListResult {
  tasks: Task[];
  total: number;
  page?: number;
  page_size?: number;
}

export interface TaskReport {
  total: number;
  open: number;
  in_progress: number;
  blocked: number;
  done: number;
  overdue: number;
  unassigned?: number;
  completion_rate: number;
  [key: string]: unknown;
}

// ─── Profile / Credits ─────────────────────────────────────────

export interface ProfileResponse {
  username: string;
  bio?: string;
  display_name?: string;
  thoughts_count?: number;
  followers_count?: number;
  following_count?: number;
  preferred_llm_model?: string;
  created_at?: string;
  [key: string]: unknown;
}

// ─── Insights ─────────────────────────────────────────────────

export interface InsightsListResponse {
  insights: Array<{
    insight_id?: string;
    insight_type?: string;
    title?: string;
    message?: string;
    priority?: string;
    category?: string;
    actionable?: boolean;
    action_suggestion?: string;
    viewed?: boolean;
    generated_at?: string;
  }>;
  total: number;
  unread: number;
}

export interface WeeklySummaryResponse {
  period?: Record<string, unknown>;
  entries_count?: number;
  documents_count?: number;
  highlights?: string[];
  summary_text?: string;
  summary?: string;
  top_topics?: string[];
  created_at?: string;
}

// ─── Research ─────────────────────────────────────────────────

export interface ResearchJobResponse {
  job_id: string;
  topic?: string;
  title?: string;
  status: string;
  depth?: string;
  papers_count?: number;
  credits_used?: number;
  research_summary?: string;
  paper_citations?: Array<Record<string, unknown>>;
  created_at?: string;
}

export interface ResearchJobListResponse {
  jobs: ResearchJobResponse[];
  total: number;
}

// ─── Notifications ────────────────────────────────────────────

export interface NotificationResponse {
  notification_id: string;
  type?: string;
  title?: string;
  message?: string;
  read: boolean;
  created_at?: string;
}

export interface NotificationsListResponse {
  notifications: NotificationResponse[];
  total: number;
  unread: number;
}

// ─── Automations ──────────────────────────────────────────────

export interface AutomationResponse {
  id: string;
  task: string;
  interval: string;
  schedule?: Record<string, unknown> | null;
  enabled: boolean;
  created_at: string;
  last_run_at?: string | null;
  next_run_at?: string | null;
  total_runs: number;
  total_credits_used: number;
  last_result?: string | null;
  last_status?: string | null;
}

export interface AutomationListResponse {
  automations: AutomationResponse[];
  total: number;
}

// ─── Front Layer Templates ────────────────────────────────────

export interface FrontLayerTemplateSummary {
  type: string;
  description: string;
  filename: string;
  fetch_url: string;
  source_tag: string;
}

export interface FrontLayerTemplateDetail {
  type: string;
  description: string;
  source_tag: string;
  default_tags: string[];
  filename: string;
  body: string;
  store_via: string;
}

// ─── Multi-MIND Accounts ──────────────────────────────────────

export interface MindAccount {
  username: string;
  workspace_id: string;
  label: string;
  role: "owner" | "viewer";
  is_self: boolean;
  is_active: boolean;
  grant_id: string | null;
}

// ─── Agent Command Center ────────────────────────────────────

export type AgentStatus = "running" | "paused" | "planned" | "archived" | "error";
export type AgentCadence = "continuous" | "scheduled" | "on-demand";
export type LiveStatus = "online" | "stale" | "offline" | "unknown";
export type AgentKind = "agent" | "workflow";

export interface AgentAuthority {
  can_autonomous: string[];
  requires_approval: string[];
}

export interface WorkflowStep {
  order: number;
  name: string;
  description: string;
  kind: string;
  credentials: string[];
  inputs: string[];
  outputs: string[];
  notes: string;
}

export interface AgentRecord {
  slug: string;
  name: string;
  description: string;
  status: AgentStatus;
  cadence: AgentCadence;
  host: string | null;
  host_address: string | null;
  port: number | null;
  health_url: string | null;
  source_path: string | null;
  source_repo: string | null;
  mind_identity_doc_id: string | null;
  responsibilities: string[];
  authority: AgentAuthority;
  triggers: string[];
  tags: string[];
  owner_email: string;
  owner_username: string;
  your_role?: "owner" | "viewer";
  open_ticket_count?: number;
  expected_interval_seconds: number;
  invoice_ids: string[];
  kind: AgentKind;
  linked_workflow_slugs: string[];
  steps: WorkflowStep[];
  trigger_summary: string | null;
  inputs_summary: string | null;
  outputs_summary: string | null;
  credentials_required: string[];
  last_heartbeat: string | null;
  last_run: string | null;
  current_job: string | null;
  config: Record<string, unknown>;
  live_status: LiveStatus;
  created_at?: string;
  updated_at?: string;
  updated_by?: string;
}

export interface AgentStats {
  total: number;
  running: number;
  planned: number;
  paused: number;
  archived: number;
  error: number;
  online: number;
  stale: number;
  offline: number;
}

export interface AgentActivity {
  activity_id: string;
  agent_slug: string;
  ts: string;
  type: string;
  source: string;
  payload: Record<string, unknown>;
}

export interface AgentShare {
  id: string;
  agent_slug: string;
  grantee_username: string;
  grantee_label?: string;
  role: "owner" | "viewer";
  granted_by?: string;
  created_at?: string;
  updated_at?: string;
}

// ─── Agent Tickets ───────────────────────────────────────────

export type TicketKind = "feedback" | "critique" | "idea" | "feature" | "bug";
export type TicketStatus = "open" | "triaged" | "in_progress" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "urgent";

export interface AgentTicketComment {
  comment_id: string;
  ticket_id: string;
  author: string;
  author_label?: string;
  body: string;
  created_at: string;
}

export interface AgentTicket {
  ticket_id: string;
  agent_slug: string;
  agent_name?: string;
  kind: TicketKind;
  title: string;
  body: string;
  status: TicketStatus;
  priority: TicketPriority;
  assignee: string | null;
  created_by?: string;
  created_by_label?: string;
  created_by_role?: string | null;
  comment_count: number;
  created_at: string;
  updated_at: string;
  resolved_at?: string | null;
  comments?: AgentTicketComment[];
}

export interface TicketStats {
  total: number;
  open: number;
}

// ─── Client ────────────────────────────────────────────────────

export class MindClient {
  private readonly apiKey: string;
  public readonly baseUrl: string;
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
    const raw = await this.request<Record<string, unknown>>(
      "POST",
      "/developer/v1/query",
      req,
    );
    // Normalize backend response shape:
    //   - some endpoints return `response`, some return `answer`
    //   - sources can come back as string[] OR object[] OR null — coerce to
    //     a uniform QuerySource[] so callers can rely on `.title` / `.score`
    const rawSources = (raw.sources ?? null) as unknown;
    let sources: QuerySource[] | undefined;
    if (Array.isArray(rawSources)) {
      sources = rawSources.map((s) =>
        typeof s === "string"
          ? { title: s }
          : (s as QuerySource),
      );
    }
    return {
      ...(raw as unknown as QueryResponse),
      answer:
        (raw.answer as string) ??
        (raw.response as string) ??
        "",
      sources,
    };
  }

  // ─── Documents ───

  async createDocument(req: DocumentCreateRequest): Promise<MindDocument> {
    return this.request<MindDocument>("POST", "/developer/v1/documents", req);
  }

  async listDocuments(opts: { limit?: number; offset?: number; page?: number; page_size?: number } = {}): Promise<DocumentListResponse> {
    const params = new URLSearchParams();
    if (opts.page !== undefined) params.set("page", String(opts.page));
    if (opts.page_size !== undefined) params.set("page_size", String(opts.page_size));
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

  // ─── Folders ───

  async listFolders(): Promise<FolderListResponse> {
    return this.request<FolderListResponse>("GET", "/developer/v1/folders");
  }

  async createFolder(name: string, parentId?: string | null): Promise<{ folder: MindFolder }> {
    return this.request<{ folder: MindFolder }>("POST", "/developer/v1/folders", {
      name,
      parent_id: parentId ?? null,
    });
  }

  async updateFolder(
    folderId: string,
    body: { name?: string; parent_id?: string | null },
  ): Promise<{ folder: MindFolder }> {
    return this.request<{ folder: MindFolder }>("PATCH", `/developer/v1/folders/${folderId}`, body);
  }

  async deleteFolder(
    folderId: string,
  ): Promise<{ status: string; reparented_to: string | null; documents_reparented: number }> {
    return this.request("DELETE", `/developer/v1/folders/${folderId}`);
  }

  async moveDocuments(
    docIds: string[],
    folderId: string | null,
  ): Promise<{ status: string; moved: number; folder_id: string | null }> {
    return this.request("POST", "/developer/v1/documents/move", {
      doc_ids: docIds,
      folder_id: folderId,
    });
  }

  // ─── Entries ───

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

  async getEntry(entryId: string): Promise<MindEntry> {
    return this.request<MindEntry>("GET", `/developer/v1/entries/${entryId}`);
  }

  async searchEntries(query: string, limit = 10): Promise<{ entries: MindEntry[]; total?: number }> {
    const params = new URLSearchParams({ query, limit: String(limit) });
    return this.request<{ entries: MindEntry[]; total?: number }>(
      "GET",
      `/developer/v1/entries/search?${params}`,
    );
  }

  async deleteEntry(id: string): Promise<{ ok: boolean }> {
    return this.request<{ ok: boolean }>("DELETE", `/developer/v1/entries/${id}`);
  }

  // ─── Thoughts ───

  async createThought(content: string): Promise<Record<string, unknown>> {
    return this.request("POST", "/developer/v1/thoughts", { content });
  }

  async listThoughts(): Promise<{ thoughts: Array<Record<string, unknown>> }> {
    return this.request("GET", "/developer/v1/thoughts");
  }

  async searchThoughts(query: string, limit = 15): Promise<{ thoughts: Array<Record<string, unknown>>; total?: number }> {
    const params = new URLSearchParams({ query, limit: String(limit) });
    return this.request("GET", `/developer/v1/thoughts/search?${params}`);
  }

  async deleteThought(thoughtId: string): Promise<{ ok: boolean }> {
    return this.request("DELETE", `/developer/v1/thoughts/${thoughtId}`);
  }

  // ─── Graph ───

  async getGraphInfo(): Promise<GraphInfoResponse> {
    return this.request<GraphInfoResponse>("GET", "/developer/v1/graph");
  }

  async getGraphDiagnostics(): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>("GET", "/developer/v1/graph/diagnostics");
  }

  // ─── Life ───

  private normalizeLifeItem(raw: Record<string, unknown>): LifeItem {
    return {
      ...(raw as unknown as LifeItem),
      id: (raw.item_id as string) ?? (raw.id as string),
    };
  }

  async createLifeItem(req: LifeItemCreateRequest): Promise<LifeItem> {
    const raw = await this.request<Record<string, unknown>>(
      "POST",
      "/developer/v1/life/items",
      req,
    );
    return this.normalizeLifeItem(raw);
  }

  async listLifeItems(
    opts: { status?: string; limit?: number } = {},
  ): Promise<{ items: LifeItem[]; total?: number }> {
    const params = new URLSearchParams();
    if (opts.status) params.set("status", opts.status);
    if (opts.limit !== undefined) params.set("limit", String(opts.limit));
    const qs = params.toString();
    const raw = await this.request<{ items: Record<string, unknown>[]; total?: number }>(
      "GET",
      `/developer/v1/life/items${qs ? `?${qs}` : ""}`,
    );
    return {
      items: (raw.items ?? []).map((it) => this.normalizeLifeItem(it)),
      total: raw.total,
    };
  }

  async getLifeItem(itemId: string): Promise<LifeItem> {
    const raw = await this.request<Record<string, unknown>>("GET", `/developer/v1/life/items/${itemId}`);
    return this.normalizeLifeItem(raw);
  }

  async updateLifeItem(
    itemId: string,
    patch: Partial<LifeItemCreateRequest> & { status?: string },
  ): Promise<LifeItem> {
    const raw = await this.request<Record<string, unknown>>(
      "PATCH",
      `/developer/v1/life/items/${itemId}`,
      patch,
    );
    return this.normalizeLifeItem(raw);
  }

  async moveLifeItem(itemId: string, newStatus: string): Promise<LifeItem> {
    const raw = await this.request<Record<string, unknown>>(
      "POST",
      `/developer/v1/life/items/${itemId}/move`,
      { new_status: newStatus },
    );
    return this.normalizeLifeItem(raw);
  }

  async completeLifeItem(id: string): Promise<{ status: string; item_id?: string }> {
    return this.request("POST", `/developer/v1/life/items/${id}/complete`, {});
  }

  async deleteLifeItem(id: string): Promise<{ status: string }> {
    return this.request<{ status: string }>("DELETE", `/developer/v1/life/items/${id}`);
  }

  async bulkDeleteLifeItems(
    ids: string[],
  ): Promise<{ status: string; deleted_count: number; deleted_ids: string[]; not_found: string[] }> {
    return this.request("POST", "/developer/v1/life/items/bulk-delete", { item_ids: ids });
  }

  async lifeStats(): Promise<LifeStatsResponse> {
    return this.request<LifeStatsResponse>("GET", "/developer/v1/life/stats");
  }

  async listCalendarEvents(
    startDate?: string,
    endDate?: string,
  ): Promise<CalendarEventListResponse> {
    const params = new URLSearchParams();
    if (startDate) params.set("start_date", startDate);
    if (endDate) params.set("end_date", endDate);
    const qs = params.toString();
    return this.request<CalendarEventListResponse>(
      "GET",
      `/developer/v1/life/calendar${qs ? `?${qs}` : ""}`,
    );
  }

  async createCalendarEvent(req: CreateCalendarEventRequest): Promise<CalendarEventResponse> {
    return this.request<CalendarEventResponse>("POST", "/developer/v1/life/calendar", req);
  }

  async deleteCalendarEvent(eventId: string): Promise<{ ok: boolean }> {
    return this.request("DELETE", `/developer/v1/life/calendar/${eventId}`);
  }

  async updateCalendarEvent(
    eventId: string,
    patch: Partial<CreateCalendarEventRequest>,
  ): Promise<CalendarEventResponse> {
    return this.request<CalendarEventResponse>(
      "PATCH",
      `/developer/v1/life/calendar/${eventId}`,
      patch,
    );
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

  async getCrmContact(contactId: string): Promise<CrmContact> {
    return this.request<CrmContact>("GET", `/developer/v1/crm/contacts/${contactId}`);
  }

  async updateCrmContact(
    contactId: string,
    patch: Partial<CrmContactCreateRequest>,
  ): Promise<CrmContact> {
    return this.request<CrmContact>("PATCH", `/developer/v1/crm/contacts/${contactId}`, patch);
  }

  async deleteCrmContact(contactId: string): Promise<{ ok: boolean }> {
    return this.request("DELETE", `/developer/v1/crm/contacts/${contactId}`);
  }

  async logCrmActivity(
    contactId: string,
    req: CrmActivityRequest,
  ): Promise<{ activity_id: string; status: string }> {
    return this.request("POST", `/developer/v1/crm/contacts/${contactId}/activities`, req);
  }

  async listCrmActivities(
    contactId: string,
  ): Promise<{ activities: CrmActivityResponse[] }> {
    return this.request("GET", `/developer/v1/crm/contacts/${contactId}/activities`);
  }

  // ─── Tasks ───

  async createTask(req: TaskCreateRequest): Promise<Task> {
    return this.request<Task>("POST", "/developer/v1/tasks", req);
  }

  async listTasks(
    params: Record<string, string | number | boolean> = {},
  ): Promise<TaskListResult> {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
    }
    const s = qs.toString();
    return this.request<TaskListResult>("GET", `/developer/v1/tasks${s ? `?${s}` : ""}`);
  }

  async getTask(taskId: string): Promise<Task> {
    return this.request<Task>("GET", `/developer/v1/tasks/${encodeURIComponent(taskId)}`);
  }

  async updateTask(taskId: string, patch: TaskUpdateRequest): Promise<Task> {
    return this.request<Task>(
      "PATCH",
      `/developer/v1/tasks/${encodeURIComponent(taskId)}`,
      patch,
    );
  }

  async completeTask(taskId: string, done = true, note?: string): Promise<Task> {
    return this.request<Task>(
      "POST",
      `/developer/v1/tasks/${encodeURIComponent(taskId)}/complete`,
      { done, note },
    );
  }

  async assignTask(taskId: string, req: TaskAssignRequest): Promise<Task> {
    return this.request<Task>(
      "POST",
      `/developer/v1/tasks/${encodeURIComponent(taskId)}/assign`,
      req,
    );
  }

  async deleteTask(taskId: string): Promise<{ status: string }> {
    return this.request<{ status: string }>(
      "DELETE",
      `/developer/v1/tasks/${encodeURIComponent(taskId)}`,
    );
  }

  async getTaskReport(
    opts: { parent_type?: string; parent_id?: string } = {},
  ): Promise<TaskReport> {
    const qs = new URLSearchParams();
    if (opts.parent_type) qs.set("parent_type", opts.parent_type);
    if (opts.parent_id) qs.set("parent_id", opts.parent_id);
    const s = qs.toString();
    return this.request<TaskReport>(
      "GET",
      `/developer/v1/tasks/reports${s ? `?${s}` : ""}`,
    );
  }

  // ─── Profile ───

  async getProfile(username?: string): Promise<ProfileResponse> {
    const path = username
      ? `/developer/v1/profile/${encodeURIComponent(username)}`
      : "/developer/v1/profile";
    return this.request<ProfileResponse>("GET", path);
  }

  async updateProfile(patch: Record<string, unknown>): Promise<ProfileResponse> {
    return this.request<ProfileResponse>("PUT", "/developer/v1/profile", patch);
  }

  async getChatPrompt(): Promise<{ prompt: string }> {
    return this.request("GET", "/developer/v1/profile/chat-prompt");
  }

  async setChatPrompt(prompt: string): Promise<{ ok?: boolean }> {
    return this.request("PUT", "/developer/v1/profile/chat-prompt", { prompt });
  }

  async getThoughtPrompt(): Promise<{ prompt: string }> {
    return this.request("GET", "/developer/v1/profile/thought-prompt");
  }

  async setThoughtPrompt(prompt: string): Promise<{ ok?: boolean }> {
    return this.request("PUT", "/developer/v1/profile/thought-prompt", { prompt });
  }

  async getModel(): Promise<Record<string, unknown>> {
    return this.request("GET", "/developer/v1/profile/llm-model/current");
  }

  async setModel(modelId: string): Promise<Record<string, unknown>> {
    return this.request("PUT", "/developer/v1/profile/llm-model", { model_id: modelId });
  }

  async listModels(): Promise<{ models: Array<Record<string, unknown>> }> {
    return this.request("GET", "/developer/v1/profile/llm-models/available");
  }

  async credits(): Promise<{
    credits_balance: number;
    credits_limit: number;
    tier: string;
    documents_count: number;
    storage_limit_mb: number;
    storage_used_mb: number;
  }> {
    return this.request("GET", "/developer/v1/credits");
  }

  // ─── Insights ───

  async listInsights(opts: { include_viewed?: boolean; limit?: number } = {}): Promise<InsightsListResponse> {
    const params = new URLSearchParams();
    if (opts.include_viewed !== undefined) params.set("include_viewed", String(opts.include_viewed));
    if (opts.limit !== undefined) params.set("limit", String(opts.limit));
    const qs = params.toString();
    return this.request<InsightsListResponse>("GET", `/developer/v1/insights${qs ? `?${qs}` : ""}`);
  }

  async insightsUnreadCount(): Promise<{ count: number }> {
    return this.request("GET", "/developer/v1/insights/unread-count");
  }

  async viewInsight(insightId: string): Promise<Record<string, unknown>> {
    return this.request("POST", `/developer/v1/insights/${insightId}/view`, {});
  }

  async insightFeedback(insightId: string, rating: string): Promise<{ ok?: boolean }> {
    return this.request("POST", `/developer/v1/insights/${insightId}/feedback`, { rating });
  }

  async analyzeInsights(): Promise<Record<string, unknown>> {
    return this.request("POST", "/developer/v1/insights/analyze", {});
  }

  async weeklySummary(): Promise<WeeklySummaryResponse> {
    return this.request<WeeklySummaryResponse>("GET", "/developer/v1/insights/weekly");
  }

  async insightsContext(): Promise<Record<string, unknown>> {
    return this.request("GET", "/developer/v1/insights/context");
  }

  // ─── Research ───

  async startResearch(topic: string): Promise<ResearchJobResponse> {
    return this.request<ResearchJobResponse>("POST", "/developer/v1/research", { topic });
  }

  async listResearch(limit = 20): Promise<ResearchJobListResponse> {
    return this.request<ResearchJobListResponse>(
      "GET",
      `/developer/v1/research?limit=${limit}`,
    );
  }

  async getResearch(jobId: string): Promise<ResearchJobResponse> {
    return this.request<ResearchJobResponse>("GET", `/developer/v1/research/${jobId}`);
  }

  // ─── MINDsense ───

  async mindsenseState(): Promise<Record<string, unknown>> {
    return this.request("GET", "/developer/v1/mindsense/state");
  }

  async mindsenseSignals(days = 7, limit = 20): Promise<{ signals: Array<Record<string, unknown>> }> {
    return this.request(
      "GET",
      `/developer/v1/mindsense/signals?days=${days}&limit=${limit}`,
    );
  }

  async mindsenseTimeline(days = 7): Promise<{ timeline: Array<Record<string, unknown>> }> {
    return this.request("GET", `/developer/v1/mindsense/timeline?days=${days}`);
  }

  async mindsenseKgWeights(limit = 20): Promise<{ entities: Array<Record<string, unknown>> }> {
    return this.request("GET", `/developer/v1/mindsense/kg-weights?limit=${limit}`);
  }

  async mindsenseSpikes(days = 7, limit = 20): Promise<{ spikes: Array<Record<string, unknown>> }> {
    return this.request(
      "GET",
      `/developer/v1/mindsense/spikes?days=${days}&limit=${limit}`,
    );
  }

  async mindsenseAcknowledge(signalId: string): Promise<{ ok?: boolean }> {
    return this.request("POST", `/developer/v1/mindsense/acknowledge/${signalId}`, {});
  }

  async mindsenseSummary(days = 7): Promise<{ summary: string }> {
    return this.request("GET", `/developer/v1/mindsense/summary?days=${days}`);
  }

  // ─── Training ───

  async trainingStart(sessionType?: string): Promise<Record<string, unknown>> {
    return this.request(
      "POST",
      "/developer/v1/training/start",
      sessionType ? { session_type: sessionType } : {},
    );
  }

  async trainingChat(message: string): Promise<Record<string, unknown>> {
    return this.request("POST", "/developer/v1/training/chat", { message });
  }

  async trainingStatus(): Promise<Record<string, unknown>> {
    return this.request("GET", "/developer/v1/training/status");
  }

  async trainingSessions(): Promise<{ sessions: Array<Record<string, unknown>> }> {
    return this.request("GET", "/developer/v1/training/sessions");
  }

  async trainingPause(): Promise<{ ok?: boolean }> {
    return this.request("POST", "/developer/v1/training/pause", {});
  }

  async trainingResume(): Promise<Record<string, unknown>> {
    return this.request("POST", "/developer/v1/training/resume", {});
  }

  async saveChatToMind(sessionId: string): Promise<Record<string, unknown>> {
    return this.request("POST", "/developer/v1/chat/sessions/save-to-mind", {
      session_id: sessionId,
    });
  }

  // ─── Social ───

  async socialCreateThought(content: string): Promise<Record<string, unknown>> {
    return this.request("POST", "/developer/v1/social/thoughts", { content });
  }

  async socialGetThought(thoughtId: string): Promise<Record<string, unknown>> {
    return this.request("GET", `/developer/v1/social/thoughts/${thoughtId}`);
  }

  async socialDeleteThought(thoughtId: string): Promise<{ ok?: boolean }> {
    return this.request("DELETE", `/developer/v1/social/thoughts/${thoughtId}`);
  }

  async socialLikeThought(thoughtId: string): Promise<{ ok?: boolean }> {
    return this.request("POST", `/developer/v1/social/thoughts/${thoughtId}/like`, {});
  }

  async socialFeed(page?: number, limit?: number): Promise<{ thoughts: Array<Record<string, unknown>> }> {
    const params = new URLSearchParams();
    if (page) params.set("page", String(page));
    if (limit) params.set("limit", String(limit));
    const qs = params.toString();
    return this.request("GET", `/developer/v1/social/feed${qs ? `?${qs}` : ""}`);
  }

  async socialUserFeed(username: string, page?: number, limit?: number): Promise<{ thoughts: Array<Record<string, unknown>> }> {
    const params = new URLSearchParams();
    if (page) params.set("page", String(page));
    if (limit) params.set("limit", String(limit));
    const qs = params.toString();
    return this.request(
      "GET",
      `/developer/v1/social/users/${encodeURIComponent(username)}/thoughts${qs ? `?${qs}` : ""}`,
    );
  }

  async socialSearchFeed(query: string, page?: number, limit?: number): Promise<{ thoughts: Array<Record<string, unknown>> }> {
    const params = new URLSearchParams({ query });
    if (page) params.set("page", String(page));
    if (limit) params.set("limit", String(limit));
    return this.request("GET", `/developer/v1/social/feed/search?${params}`);
  }

  async socialCreateCommunity(name: string, description?: string): Promise<Record<string, unknown>> {
    return this.request("POST", "/developer/v1/social/communities", { name, description });
  }

  async socialListCommunities(page?: number, limit?: number): Promise<{ communities: Array<Record<string, unknown>> }> {
    const params = new URLSearchParams();
    if (page) params.set("page", String(page));
    if (limit) params.set("limit", String(limit));
    const qs = params.toString();
    return this.request("GET", `/developer/v1/social/communities${qs ? `?${qs}` : ""}`);
  }

  async socialGetCommunity(communityId: string): Promise<Record<string, unknown>> {
    return this.request("GET", `/developer/v1/social/communities/${communityId}`);
  }

  async socialJoinCommunity(communityId: string): Promise<{ ok?: boolean }> {
    return this.request("POST", `/developer/v1/social/communities/${communityId}/join`, {});
  }

  async socialLeaveCommunity(communityId: string): Promise<{ ok?: boolean }> {
    return this.request("POST", `/developer/v1/social/communities/${communityId}/leave`, {});
  }

  async socialCreatePost(communityId: string, content: string): Promise<Record<string, unknown>> {
    return this.request("POST", `/developer/v1/social/communities/${communityId}/posts`, {
      content,
    });
  }

  async socialListPosts(communityId: string, page?: number, limit?: number): Promise<{ posts: Array<Record<string, unknown>> }> {
    const params = new URLSearchParams();
    if (page) params.set("page", String(page));
    if (limit) params.set("limit", String(limit));
    const qs = params.toString();
    return this.request(
      "GET",
      `/developer/v1/social/communities/${communityId}/posts${qs ? `?${qs}` : ""}`,
    );
  }

  // ─── Notifications ───

  async listNotifications(opts: { unread_only?: boolean; limit?: number } = {}): Promise<NotificationsListResponse> {
    const params = new URLSearchParams();
    if (opts.unread_only !== undefined) params.set("unread_only", String(opts.unread_only));
    if (opts.limit !== undefined) params.set("limit", String(opts.limit));
    const qs = params.toString();
    return this.request<NotificationsListResponse>(
      "GET",
      `/developer/v1/notifications${qs ? `?${qs}` : ""}`,
    );
  }

  async markNotificationRead(notificationId: string): Promise<{ ok?: boolean }> {
    return this.request("POST", `/developer/v1/notifications/${notificationId}/read`, {});
  }

  async markAllNotificationsRead(): Promise<{ count: number }> {
    return this.request("POST", "/developer/v1/notifications/read-all", {});
  }

  async notificationStats(): Promise<Record<string, unknown>> {
    return this.request("GET", "/developer/v1/notifications/stats");
  }

  // ─── Automations ───

  async listAutomations(): Promise<AutomationListResponse> {
    return this.request<AutomationListResponse>("GET", "/developer/v1/automations");
  }

  async createAutomation(req: Record<string, unknown>): Promise<AutomationResponse & Record<string, unknown>> {
    return this.request("POST", "/developer/v1/automations", req);
  }

  async updateAutomation(
    automationId: string,
    patch: Record<string, unknown>,
  ): Promise<AutomationResponse & Record<string, unknown>> {
    return this.request("PATCH", `/developer/v1/automations/${automationId}`, patch);
  }

  async deleteAutomation(automationId: string): Promise<{ ok?: boolean }> {
    return this.request("DELETE", `/developer/v1/automations/${automationId}`);
  }

  async runAutomationNow(automationId: string): Promise<Record<string, unknown>> {
    return this.request("POST", `/developer/v1/automations/${automationId}/run`, {});
  }

  async automationHistory(automationId: string): Promise<{ executions: Array<Record<string, unknown>> }> {
    return this.request("GET", `/developer/v1/automations/${automationId}/history`);
  }

  // ─── Front Layer Templates ───

  async listFrontLayerTemplates(): Promise<{
    version: string;
    count: number;
    templates: FrontLayerTemplateSummary[];
    doc: string;
  }> {
    return this.request("GET", "/developer/v1/templates");
  }

  async getFrontLayerTemplate(typeName: string): Promise<FrontLayerTemplateDetail> {
    return this.request(
      "GET",
      `/developer/v1/templates/${encodeURIComponent(typeName)}`,
    );
  }

  async bootstrapFrontLayerTemplates(): Promise<{
    bootstrapped: number;
    total: number;
    results: Array<{ type: string; status: string; doc_id?: string; title?: string; source?: string; error?: string }>;
    doc: string;
  }> {
    return this.request("POST", "/developer/v1/templates/bootstrap", {});
  }

  /**
   * Save a filled-out Front Layer document with the canonical `front-layer-<type>`
   * source tag so retrieval can filter by it later.
   */
  async saveTypedDocument(
    typeName: string,
    title: string,
    content: string,
  ): Promise<MindDocument> {
    const source = `front-layer-${typeName.toLowerCase()}`;
    return this.createDocument({ title, content, source });
  }

  // ─── Multi-MIND Accounts ───

  async listMinds(): Promise<{
    enabled: boolean;
    actor?: string;
    active_username?: string;
    accounts: MindAccount[];
  }> {
    return this.request("GET", "/developer/v1/accounts");
  }

  async createMind(label: string): Promise<{
    username: string;
    workspace_id: string;
    label: string;
    role: string;
  }> {
    return this.request("POST", "/developer/v1/accounts", { label });
  }

  async deleteMind(username: string): Promise<{ status: string; username: string }> {
    return this.request(
      "DELETE",
      `/developer/v1/accounts/${encodeURIComponent(username)}`,
    );
  }

  async listMindMembers(username: string): Promise<{
    mind_username: string;
    members: Array<{ username: string; role: string; is_primary: boolean; grant_id: string | null }>;
    pending_invites: Array<{ invite_id: string; email: string; role: string }>;
  }> {
    return this.request(
      "GET",
      `/developer/v1/accounts/${encodeURIComponent(username)}/members`,
    );
  }

  async grantMindMember(
    username: string,
    granteeUsername: string,
    role: "owner" | "viewer",
  ): Promise<{ grant_id: string; username: string; role: string }> {
    return this.request(
      "POST",
      `/developer/v1/accounts/${encodeURIComponent(username)}/members`,
      { grantee_username: granteeUsername, role },
    );
  }

  async createMindInvite(
    username: string,
    email: string,
    role: "owner" | "viewer",
  ): Promise<{ invite_id: string; email: string; role: string; invite_link: string }> {
    return this.request(
      "POST",
      `/developer/v1/accounts/${encodeURIComponent(username)}/invites`,
      { email, role },
    );
  }

  // ─── Admin: Users ───

  async adminCreateUser(req: {
    username: string;
    email: string;
    password: string;
    source?: string;
    tier?: string;
    generate_api_key?: boolean;
    api_key_name?: string;
  }): Promise<{
    status: string;
    access_token: string;
    token_type: string;
    user: { username: string; email: string; workspace_id: string; tier: string; source?: string };
    api_key?: { id: string; name: string; key: string; prefix: string; scopes: string[] };
  }> {
    return this.request("POST", "/admin/users/create", req);
  }

  async adminListUsers(params: { q?: string; page?: number } = {}): Promise<{
    users: Array<{ username: string; email?: string; tier?: string; doc_count?: number }>;
    total?: number;
  }> {
    const qs = new URLSearchParams();
    if (params.q) qs.set("q", params.q);
    if (params.page) qs.set("page", String(params.page));
    const s = qs.toString();
    return this.request("GET", `/admin/users${s ? `?${s}` : ""}`);
  }

  async adminUpdateUserTier(username: string, tier: string): Promise<{ tier: string }> {
    return this.request("PUT", `/admin/users/${username}/tier`, { tier });
  }

  async adminAdjustCredits(username: string, amount: number): Promise<{ new_balance: number }> {
    return this.request("POST", `/admin/users/${username}/credits`, { amount });
  }

  // ─── Admin: Featured Minds ───

  async adminCreateFeaturedMind(req: {
    username: string;
    title: string;
    subtitle?: string | null;
    description?: string;
    tags?: string[];
    price?: number;
    featured?: boolean;
    display_order?: number;
    is_public?: boolean;
    avatar_url?: string | null;
    banner_url?: string | null;
    // Influencer Factory extensions
    archetype_id?: string | null;
    voice_id?: string | null;
    seed_image_url?: string | null;
    niche_tags?: string[];
    kg_scope_template_id?: string | null;
    agent_posting_enabled?: boolean;
  }): Promise<{ mind_id: string; username: string; title: string; [key: string]: unknown }> {
    return this.request("POST", "/admin/featured-minds", req);
  }

  async adminListFeaturedMinds(): Promise<
    Array<{ mind_id: string; username: string; title: string; featured: boolean; display_order: number; [key: string]: unknown }>
  > {
    return this.request("GET", "/admin/featured-minds");
  }

  async adminUpdateFeaturedMind(
    mindId: string,
    patch: Record<string, unknown>,
  ): Promise<{ mind_id: string; title: string; [key: string]: unknown }> {
    return this.request("PUT", `/admin/featured-minds/${mindId}`, patch);
  }

  async adminDeleteFeaturedMind(mindId: string): Promise<{ status: string }> {
    return this.request("DELETE", `/admin/featured-minds/${mindId}`);
  }

  // Featured Minds Portal — bundled mind + linked owner profile + available models.
  // Powers the /admin/featuredmindsportal side sheet (and any MCP equivalent).
  async adminGetFeaturedMindFull(
    mindId: string,
  ): Promise<{
    featured_mind: { mind_id: string; username: string; title: string; [key: string]: unknown };
    owner_profile: {
      username: string;
      preferred_llm_model?: string | null;
      public_mind_enabled: boolean;
      public_mind_prompt?: string | null;
      public_mind_tagline?: string | null;
      public_mind_greeting?: string | null;
      public_mind_persona?: string | null;
      chat_temperature?: number | null;
      chat_reasoning_effort?: "minimal" | "low" | "medium" | "high" | null;
      avatar_url?: string | null;
      banner_url?: string | null;
      bio?: string | null;
      display_name?: string | null;
    };
    available_models: Array<{ id: string; name: string; provider: string; [key: string]: unknown }>;
  }> {
    return this.request("GET", `/admin/featured-minds/${mindId}/full`);
  }

  // Admin write-through to user_profiles for the user linked to this featured mind.
  // LLM model / public chat prompt / temperature / reasoning_effort / brand fields /
  // avatar / banner — all changes take effect on /m/{username} immediately.
  async adminUpdateFeaturedMindOwnerProfile(
    mindId: string,
    patch: {
      preferred_llm_model?: string | null;
      public_mind_enabled?: boolean;
      public_mind_prompt?: string;
      public_mind_tagline?: string;
      public_mind_greeting?: string;
      public_mind_persona?: string;
      chat_temperature?: number | null;
      chat_reasoning_effort?: "minimal" | "low" | "medium" | "high" | null;
      bio?: string;
      avatar_url?: string;
      banner_url?: string;
    },
  ): Promise<{ username: string; [key: string]: unknown }> {
    return this.request("PUT", `/admin/featured-minds/${mindId}/owner-profile`, patch);
  }

  // Bulk display_order assignment — index in the array becomes the order.
  async adminReorderFeaturedMinds(
    orderedMindIds: string[],
  ): Promise<{ status: string; updated: number; total: number }> {
    return this.request("PUT", "/admin/featured-minds/reorder", {
      ordered_mind_ids: orderedMindIds,
    });
  }

  // ─── Admin: Agent Command Center ───

  async listAgents(params: {
    status?: string;
    host?: string;
    tag?: string;
    kind?: string;
    q?: string;
    include_archived?: boolean;
  } = {}): Promise<{ agents: AgentRecord[]; stats: AgentStats }> {
    const qs = new URLSearchParams();
    if (params.status) qs.set("status", params.status);
    if (params.host) qs.set("host", params.host);
    if (params.tag) qs.set("tag", params.tag);
    if (params.kind) qs.set("kind", params.kind);
    if (params.q) qs.set("q", params.q);
    if (params.include_archived) qs.set("include_archived", "true");
    const s = qs.toString();
    return this.request("GET", `/admin/agents${s ? `?${s}` : ""}`);
  }

  async getAgent(slug: string): Promise<AgentRecord & { recent_activities: AgentActivity[] }> {
    return this.request("GET", `/admin/agents/${encodeURIComponent(slug)}`);
  }

  async createAgent(payload: Record<string, unknown>): Promise<AgentRecord> {
    return this.request("POST", "/admin/agents", payload);
  }

  async updateAgent(slug: string, payload: Record<string, unknown>): Promise<AgentRecord> {
    return this.request("PATCH", `/admin/agents/${encodeURIComponent(slug)}`, payload);
  }

  async deleteAgent(slug: string, hard = false): Promise<{ deleted: string; hard: boolean }> {
    const qs = hard ? "?hard=true" : "";
    return this.request("DELETE", `/admin/agents/${encodeURIComponent(slug)}${qs}`);
  }

  async agentHeartbeat(
    slug: string,
    body: { current_job?: string; metrics?: Record<string, unknown>; source?: string; note?: string } = {},
  ): Promise<AgentRecord> {
    return this.request("POST", `/admin/agents/${encodeURIComponent(slug)}/heartbeat`, body);
  }

  async agentProbe(slug: string): Promise<{
    slug: string;
    probe: {
      ok: boolean;
      probe_kind?: string;
      status_code?: number;
      latency_ms?: number;
      error?: string;
      endpoint?: string;
    };
  }> {
    return this.request("GET", `/admin/agents/${encodeURIComponent(slug)}/probe`);
  }

  async listAgentActivities(slug: string, limit = 50): Promise<{ slug: string; activities: AgentActivity[] }> {
    return this.request(
      "GET",
      `/admin/agents/${encodeURIComponent(slug)}/activities?limit=${limit}`,
    );
  }

  async logAgentActivity(
    slug: string,
    body: { type?: string; payload?: Record<string, unknown>; source?: string } = {},
  ): Promise<AgentActivity> {
    return this.request("POST", `/admin/agents/${encodeURIComponent(slug)}/activities`, body);
  }

  async seedKnownAgents(overwrite = false): Promise<{
    inserted: number;
    updated: number;
    skipped: number;
    total_known: number;
  }> {
    const qs = overwrite ? "?overwrite=true" : "";
    return this.request("POST", `/admin/agents/seed-known${qs}`, {});
  }

  async importAgentsFromMind(): Promise<{
    enriched: number;
    skipped: number;
    matched_slugs: string[];
    error?: string;
  }> {
    return this.request("POST", "/admin/agents/import-from-mind", {});
  }

  async transferAgentOwner(slug: string, ownerUsername: string): Promise<AgentRecord> {
    return this.request(
      "POST",
      `/admin/agents/${encodeURIComponent(slug)}/transfer-owner`,
      { owner_username: ownerUsername },
    );
  }

  async listAgentShares(slug: string): Promise<{ slug: string; owner_username: string; shares: AgentShare[] }> {
    return this.request("GET", `/admin/agents/${encodeURIComponent(slug)}/shares`);
  }

  async shareAgent(
    slug: string,
    granteeUsername: string,
    role: "owner" | "viewer",
  ): Promise<AgentShare> {
    return this.request(
      "POST",
      `/admin/agents/${encodeURIComponent(slug)}/shares`,
      { grantee_username: granteeUsername, role },
    );
  }

  async revokeAgentShare(slug: string, shareId: string): Promise<{ revoked: string; slug: string }> {
    return this.request(
      "DELETE",
      `/admin/agents/${encodeURIComponent(slug)}/shares/${encodeURIComponent(shareId)}`,
    );
  }

  async listAgentInvoices(slug: string): Promise<{ slug: string; invoices: Array<Record<string, unknown>> }> {
    return this.request("GET", `/admin/agents/${encodeURIComponent(slug)}/invoices`);
  }

  async linkAgentInvoice(slug: string, invoiceId: string): Promise<Record<string, unknown>> {
    return this.request(
      "POST",
      `/admin/agents/${encodeURIComponent(slug)}/invoices/${encodeURIComponent(invoiceId)}`,
      {},
    );
  }

  async unlinkAgentInvoice(slug: string, invoiceId: string): Promise<Record<string, unknown>> {
    return this.request(
      "DELETE",
      `/admin/agents/${encodeURIComponent(slug)}/invoices/${encodeURIComponent(invoiceId)}`,
    );
  }

  async createAgentInvoice(slug: string, payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.request("POST", `/admin/agents/${encodeURIComponent(slug)}/invoices`, payload);
  }

  async listAgentWorkflows(slug: string): Promise<{ slug: string; workflows: Array<Record<string, unknown>> }> {
    return this.request("GET", `/admin/agents/${encodeURIComponent(slug)}/workflows`);
  }

  async linkAgentWorkflow(slug: string, workflowSlug: string): Promise<Record<string, unknown>> {
    return this.request(
      "POST",
      `/admin/agents/${encodeURIComponent(slug)}/workflows`,
      { workflow_slug: workflowSlug },
    );
  }

  async unlinkAgentWorkflow(slug: string, workflowSlug: string): Promise<Record<string, unknown>> {
    return this.request(
      "DELETE",
      `/admin/agents/${encodeURIComponent(slug)}/workflows/${encodeURIComponent(workflowSlug)}`,
    );
  }

  async workflowUsedBy(workflowSlug: string): Promise<{ slug: string; name: string; kind: string; agents: Array<Record<string, unknown>> }> {
    return this.request("GET", `/admin/agents/${encodeURIComponent(workflowSlug)}/used-by`);
  }

  // ─── Admin: Agent Tickets ───

  async listAgentTickets(
    slug: string,
    status?: string,
  ): Promise<{ slug: string; tickets: AgentTicket[]; stats: TicketStats }> {
    const qs = status ? `?status=${encodeURIComponent(status)}` : "";
    return this.request("GET", `/admin/agents/${encodeURIComponent(slug)}/tickets${qs}`);
  }

  async getAgentTicket(slug: string, ticketId: string): Promise<AgentTicket> {
    return this.request(
      "GET",
      `/admin/agents/${encodeURIComponent(slug)}/tickets/${encodeURIComponent(ticketId)}`,
    );
  }

  async createAgentTicket(
    slug: string,
    payload: { kind?: TicketKind; title: string; body?: string; priority?: TicketPriority },
  ): Promise<AgentTicket> {
    return this.request(
      "POST",
      `/admin/agents/${encodeURIComponent(slug)}/tickets`,
      payload,
    );
  }

  async updateAgentTicket(
    slug: string,
    ticketId: string,
    patch: { status?: TicketStatus; priority?: TicketPriority; kind?: TicketKind; assignee?: string },
  ): Promise<AgentTicket> {
    return this.request(
      "PATCH",
      `/admin/agents/${encodeURIComponent(slug)}/tickets/${encodeURIComponent(ticketId)}`,
      patch,
    );
  }

  async commentAgentTicket(
    slug: string,
    ticketId: string,
    body: string,
  ): Promise<AgentTicketComment> {
    return this.request(
      "POST",
      `/admin/agents/${encodeURIComponent(slug)}/tickets/${encodeURIComponent(ticketId)}/comments`,
      { body },
    );
  }

  async deleteAgentTicket(slug: string, ticketId: string): Promise<{ deleted: string; slug: string }> {
    return this.request(
      "DELETE",
      `/admin/agents/${encodeURIComponent(slug)}/tickets/${encodeURIComponent(ticketId)}`,
    );
  }

  // ─── Influencer Factory (Phase 1) ───
  // Admin-gated; whole router is dark unless IF_FEATURE_FLAG_ENABLED=true on server.

  async ifHealth(): Promise<Record<string, unknown>> {
    return this.request("GET", "/api/influencerfactory/health");
  }

  async ifCreatePersona(req: {
    username: string;
    display_name: string;
    niche?: string;
    pillars?: string[];
    tone?: string;
    archetype_id?: string;
    kg_scope_template_id?: string;
    niche_tags?: string[];
    daily_credit_ceiling_usd?: number;
  }): Promise<Record<string, unknown>> {
    return this.request("POST", "/api/influencerfactory/personas", req);
  }

  async ifListPersonas(params?: {
    status?: "draft" | "active" | "paused";
    search?: string;
    include_deleted?: boolean;
  }): Promise<Array<Record<string, unknown>>> {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.search) qs.set("search", params.search);
    if (params?.include_deleted) qs.set("include_deleted", "true");
    const q = qs.toString();
    return this.request("GET", `/api/influencerfactory/personas${q ? `?${q}` : ""}`);
  }

  async ifGetPersonaFull(personaMindId: string): Promise<Record<string, unknown>> {
    return this.request(
      "GET",
      `/api/influencerfactory/personas/${encodeURIComponent(personaMindId)}/full`,
    );
  }

  async ifUpdatePersona(
    personaMindId: string,
    patch: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.request(
      "PUT",
      `/api/influencerfactory/personas/${encodeURIComponent(personaMindId)}`,
      patch,
    );
  }

  async ifDeletePersona(personaMindId: string): Promise<Record<string, unknown>> {
    return this.request(
      "DELETE",
      `/api/influencerfactory/personas/${encodeURIComponent(personaMindId)}`,
    );
  }

  async ifAnchorAIGenerate(
    personaMindId: string,
    body: { prompt: string; model?: "nano_banana_pro" | "flux" },
  ): Promise<Record<string, unknown>> {
    return this.request(
      "POST",
      `/api/influencerfactory/personas/${encodeURIComponent(personaMindId)}/face/anchor/ai-generate`,
      body,
    );
  }

  async ifRequestVariants(
    personaMindId: string,
    body: { count: number; prompt_modifier?: string; sync_fallback?: boolean },
  ): Promise<Record<string, unknown>> {
    return this.request(
      "POST",
      `/api/influencerfactory/personas/${encodeURIComponent(personaMindId)}/face/variants`,
      body,
    );
  }

  async ifListVariants(personaMindId: string): Promise<Record<string, unknown>> {
    return this.request(
      "GET",
      `/api/influencerfactory/personas/${encodeURIComponent(personaMindId)}/face/variants`,
    );
  }

  async ifSearchVoiceLibrary(params?: {
    q?: string;
    gender?: string;
    accent?: string;
    age?: string;
    use_case?: string;
    page_size?: number;
  }): Promise<Record<string, unknown>> {
    const qs = new URLSearchParams();
    if (params?.q) qs.set("q", params.q);
    if (params?.gender) qs.set("gender", params.gender);
    if (params?.accent) qs.set("accent", params.accent);
    if (params?.age) qs.set("age", params.age);
    if (params?.use_case) qs.set("use_case", params.use_case);
    if (params?.page_size) qs.set("page_size", String(params.page_size));
    const q = qs.toString();
    return this.request("GET", `/api/influencerfactory/voice-library${q ? `?${q}` : ""}`);
  }

  async ifSetVoiceLibrary(
    personaMindId: string,
    body: { voice_id: string; name?: string },
  ): Promise<Record<string, unknown>> {
    return this.request(
      "POST",
      `/api/influencerfactory/personas/${encodeURIComponent(personaMindId)}/voice/library`,
      { source: "library", ...body },
    );
  }

  async ifVoiceSample(personaMindId: string, text: string): Promise<Record<string, unknown>> {
    return this.request(
      "POST",
      `/api/influencerfactory/personas/${encodeURIComponent(personaMindId)}/voice/sample`,
      { text },
    );
  }

  async ifUpdateBios(
    personaMindId: string,
    body: { bios: Record<string, string>; generate_with_llm?: boolean },
  ): Promise<Record<string, unknown>> {
    return this.request(
      "PUT",
      `/api/influencerfactory/personas/${encodeURIComponent(personaMindId)}/bios`,
      body,
    );
  }

  async ifBlotatoWhoami(): Promise<Record<string, unknown>> {
    return this.request("GET", "/api/influencerfactory/blotato/whoami");
  }

  async ifBlotatoAccounts(): Promise<Record<string, unknown>> {
    return this.request("GET", "/api/influencerfactory/blotato/accounts");
  }

  async ifRegisterBlotato(
    personaMindId: string,
    platform: string,
    body: {
      account_id: string;
      page_id?: string;
      board_id?: string;
      handle?: string;
      media_type?: "story" | "reel";
    },
  ): Promise<Record<string, unknown>> {
    return this.request(
      "POST",
      `/api/influencerfactory/personas/${encodeURIComponent(personaMindId)}/blotato/${encodeURIComponent(platform)}`,
      body,
    );
  }

  async ifUnregisterBlotato(
    personaMindId: string,
    platform: string,
  ): Promise<Record<string, unknown>> {
    return this.request(
      "DELETE",
      `/api/influencerfactory/personas/${encodeURIComponent(personaMindId)}/blotato/${encodeURIComponent(platform)}`,
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
      "User-Agent": "openclaw-mind/0.4.0",
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
