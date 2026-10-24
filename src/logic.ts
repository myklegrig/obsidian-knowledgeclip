// Чистая логика плагина: без obsidian API, чтобы её можно было гонять в
// node:test. Всё, что трогает редактор и хранилище, живёт в main.ts.

const PATTERNS = [
  /^https?:\/\/(?:www\.|m\.|music\.)?youtube\.com\/watch\?(?:[^#\s]*&)?v=([\w-]{11})(?:[&#][^\s]*)?$/,
  /^https?:\/\/(?:www\.|m\.)?youtube\.com\/(?:shorts|live|embed)\/([\w-]{11})(?:[?#][^\s]*)?$/,
  /^https?:\/\/youtu\.be\/([\w-]{11})(?:[?#][^\s]*)?$/,
];

/** ID ролика по ссылке или null, если это не ссылка на ролик YouTube. */
export function youtubeVideoId(url: string): string | null {
  const candidate = url.trim();
  for (const pattern of PATTERNS) {
    const match = pattern.exec(candidate);
    if (match) return match[1];
  }
  return null;
}

/**
 * Вставлена ли ровно одна ссылка на ролик — и ничего больше.
 *
 * Окно по вставке абзаца, в котором где-то встретилась ссылка, раздражало
 * бы: человек вставлял текст, а не просил конспект.
 */
export function isSingleYouTubeLink(text: string): boolean {
  const trimmed = text.trim();
  return !/\s/.test(trimmed) && youtubeVideoId(trimmed) !== null;
}

/** Первая ссылка на ролик в строке — голая или внутри markdown-ссылки. */
export function findYouTubeLink(line: string): string | null {
  for (const raw of line.match(/https?:\/\/[^\s<>"']+/g) ?? []) {
    const url = raw.replace(/[)\].,;:!?>]+$/, "");
    if (youtubeVideoId(url)) return url;
  }
  return null;
}

const MARKER = "kc:pending:";

/** Строка-заглушка. Маркер — HTML-комментарий: в режиме чтения его не видно. */
export function placeholderLine(noteId: string, text: string): string {
  return `${text} <!-- ${MARKER}${noteId} -->`;
}

/** Снять YAML-шапку: посреди файла она не шапка, а мусор. */
export function stripFrontmatter(markdown: string): string {
  if (!markdown.startsWith("---\n")) return markdown;
  const end = markdown.indexOf("\n---\n", 4);
  if (end < 0) return markdown;
  return markdown.slice(end + 5).replace(/^\n+/, "");
}

/**
 * Поставить готовый конспект на место заглушки. null — заглушки нет
 * (человек её удалил), и конспект надо сохранить куда-то ещё.
 *
 * Шапку оставляем, только если заглушка — первая непустая строка файла:
 * Obsidian читает frontmatter лишь в самом начале.
 */
export function placeFinished(doc: string, noteId: string, markdown: string): string | null {
  const marker = `<!-- ${MARKER}${noteId} -->`;
  const lines = doc.split("\n");
  const index = lines.findIndex((line) => line.includes(marker));
  if (index < 0) return null;
  const isFirst = lines.slice(0, index).every((line) => line.trim() === "");
  const body = (isFirst ? markdown : stripFrontmatter(markdown)).replace(/\n+$/, "");
  lines.splice(index, 1, body);
  return lines.join("\n");
}

/** Имя файла по заголовку ролика — без символов, которые Obsidian запрещает. */
export function safeFileName(title: string, fallback: string): string {
  const cleaned = title
    .replace(/[\\/:*?"<>|#^[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "")
    .slice(0, 100)
    .trim();
  return cleaned || fallback;
}

/** Пауза перед следующим опросом: 3 с, дальше в полтора раза, не больше 30. */
export function nextPollDelay(attempt: number): number {
  return Math.min(30_000, Math.round(3_000 * 1.5 ** attempt));
}

/** Минуты → часы: «4», «3.9». */
export function formatHours(minutes: number): string {
  const hours = Math.round((Math.max(0, minutes) / 60) * 10) / 10;
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
}
