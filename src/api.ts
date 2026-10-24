import { requestUrl, type RequestUrlResponse } from "obsidian";

import { formatDate, t } from "./i18n.ts";
import type { KcSettings } from "./settings.ts";
import type { Detail, ModelTier, NoteState, Quote, Usage } from "./types.ts";

/** Ошибка API с кодом из тела ответа (`{"error": {"code", "message"}}`). */
export class KcError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "KcError";
  }
}

/**
 * Клиент API. Только `requestUrl`: он работает и на мобильном, и в обход
 * CORS, а `fetch` из Obsidian упёрся бы в политику браузера.
 */
export class KcApi {
  constructor(private readonly settings: () => KcSettings) {}

  private async call(method: string, path: string, body?: unknown): Promise<RequestUrlResponse> {
    const { apiKey, apiUrl } = this.settings();
    let response: RequestUrlResponse;
    try {
      response = await requestUrl({
        url: `${apiUrl.replace(/\/+$/, "")}/v1${path}`,
        method,
        headers: { Authorization: `Bearer ${apiKey.trim()}` },
        contentType: body === undefined ? undefined : "application/json",
        body: body === undefined ? undefined : JSON.stringify(body),
        throw: false,
      });
    } catch {
      throw new KcError("NETWORK", "network error", 0);
    }
    if (response.status >= 400) {
      let error: { code?: string; message?: string; details?: Record<string, unknown> } = {};
      try {
        error = (response.json as { error?: typeof error }).error ?? {};
      } catch {
        // тело не JSON — хватит статуса
      }
      throw new KcError(
        error.code ?? `HTTP_${response.status}`,
        error.message ?? `HTTP ${response.status}`,
        response.status,
        error.details ?? {},
      );
    }
    return response;
  }

  async usage(): Promise<Usage> {
    return (await this.call("GET", "/usage")).json as Usage;
  }

  async quote(url: string, detail: Detail, model: ModelTier | null): Promise<Quote> {
    const params = new URLSearchParams({ youtube_url: url, detail });
    if (model) params.set("model", model);
    return (await this.call("GET", `/notes/quote?${params.toString()}`)).json as Quote;
  }

  async createNote(url: string, detail: Detail, model: ModelTier | null): Promise<string> {
    const response = await this.call("POST", "/notes", { youtube_url: url, detail, model });
    return (response.json as { note_id: string }).note_id;
  }

  async note(noteId: string): Promise<NoteState> {
    return (await this.call("GET", `/notes/${noteId}`)).json as NoteState;
  }

  async exportMarkdown(noteId: string, withFrontmatter: boolean): Promise<string> {
    const flag = withFrontmatter ? "true" : "false";
    return (await this.call("GET", `/notes/${noteId}/export?frontmatter=${flag}`)).text;
  }
}

/** Ошибка человеческими словами — для уведомления или строки в окне. */
export function describeError(error: unknown): string {
  const s = t();
  if (!(error instanceof KcError) || error.code === "NETWORK") return s.errNetwork;
  switch (error.code) {
    case "PLAN_LIMIT_REACHED": {
      const resetAt = error.details.reset_at;
      return s.errLimit(typeof resetAt === "string" ? formatDate(resetAt) : "—");
    }
    case "DAILY_LIMIT_REACHED":
      return s.errDaily;
    case "MODEL_NOT_ALLOWED":
      return s.errModel;
    case "COST_BUDGET_REACHED":
      return s.errBudget;
    case "INVALID_URL":
      return s.errUrl;
  }
  if (error.status === 401) return s.errKey;
  return error.message;
}
