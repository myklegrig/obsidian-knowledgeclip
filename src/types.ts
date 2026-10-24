// Типы ответа API — ровно те поля, что плагин читает. Своя копия, а не
// `packages/shared`: плагин уйдёт в отдельный публичный репозиторий, и
// тянуть туда монорепо незачем.

export type Detail = "essence" | "brief" | "normal" | "detailed" | "full";
export type ModelTier = "fast" | "balanced" | "best";
export type QuotaPool = "minutes" | "best_minutes" | "transcription_minutes";

export const DETAILS: Detail[] = ["essence", "brief", "normal", "detailed", "full"];
export const MODELS: ModelTier[] = ["fast", "balanced", "best"];

/** `GET /v1/notes/quote` — цена заметки до клика (миграция 014). */
export interface Quote {
  video_title: string | null;
  billed_minutes: number;
  needs_transcription: boolean;
  model_tier: ModelTier;
  charge: Record<QuotaPool, number>;
  left: Record<QuotaPool, number>;
  affordable: boolean;
  short_of: QuotaPool | null;
  downgrade_to: ModelTier | null;
}

/** `GET /v1/notes/{id}` — то, что нужно для опроса. */
export interface NoteState {
  id: string;
  status: "pending" | "processing" | "done" | "failed";
  video_title: string | null;
  error_message: string | null;
}

/** `GET /v1/usage` — для проверки ключа в настройках. */
export interface Usage {
  quota: Record<QuotaPool, { used: number; limit: number }>;
  next_reset_at: string;
}

/** Заметка, которую ждём. Живёт в данных плагина и переживает перезапуск. */
export interface PendingJob {
  noteId: string;
  /** Файл с заглушкой. Переименование файла отслеживается. */
  path: string;
  /** "file" — конспект в своём файле; "inline" — прямо под ссылкой. */
  mode: "file" | "inline";
  title: string;
  attempt: number;
  nextAt: number;
  createdAt: number;
}
