import {
  type Editor,
  type MarkdownFileInfo,
  MarkdownView,
  Notice,
  Plugin,
  TFile,
  normalizePath,
} from "obsidian";

import { describeError, KcApi, KcError } from "./api.ts";
import { t } from "./i18n.ts";
import {
  findYouTubeLink,
  isSingleYouTubeLink,
  nextPollDelay,
  placeFinished,
  placeholderLine,
  safeFileName,
  youtubeVideoId,
} from "./logic.ts";
import { LinkPromptModal, MakeNoteModal, type Choice } from "./modal.ts";
import { DEFAULT_SETTINGS, KcSettingTab, type KcSettings } from "./settings.ts";
import type { PendingJob } from "./types.ts";

// Заметка идёт минутами. Сутки без ответа — это уже не «долго», а «потерялась».
const STALE_MS = 24 * 60 * 60 * 1000;
const TICK_MS = 3_000;

interface PluginData {
  settings?: Partial<KcSettings>;
  jobs?: PendingJob[];
}

export default class KnowledgeClipPlugin extends Plugin {
  settings: KcSettings = { ...DEFAULT_SETTINGS };
  api!: KcApi;
  private jobs: PendingJob[] = [];
  private ticking = false;

  async onload(): Promise<void> {
    await this.loadState();
    this.api = new KcApi(() => this.settings);
    this.addSettingTab(new KcSettingTab(this.app, this));

    this.addCommand({
      id: "note-from-link-under-cursor",
      name: t().cmdUnderCursor,
      editorCallback: (editor: Editor, ctx: MarkdownView | MarkdownFileInfo) => {
        const url = findYouTubeLink(editor.getLine(editor.getCursor().line));
        if (!url) {
          new Notice(t().noLinkUnderCursor);
          return;
        }
        this.openMakeNote(url, editor, ctx.file);
      },
    });

    this.addCommand({
      id: "note-from-link",
      name: t().cmdPrompt,
      callback: () => {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        new LinkPromptModal(this.app, (url) =>
          this.openMakeNote(url, view?.editor ?? null, view?.file ?? null),
        ).open();
      },
    });

    this.registerEvent(
      this.app.workspace.on("editor-paste", (evt, editor, info) => {
        if (!this.settings.interceptPaste || evt.defaultPrevented) return;
        const text = evt.clipboardData?.getData("text/plain") ?? "";
        if (!isSingleYouTubeLink(text)) return;
        // Вставку не перехватываем: ссылка ложится в заметку как обычно, окно
        // открывается следом. Передумал — закрыл окно, ссылка осталась.
        window.setTimeout(() => this.openMakeNote(text.trim(), editor, info.file), 0);
      }),
    );

    // Переименовал файл с заглушкой — заметка должна приехать туда же.
    this.registerEvent(
      this.app.vault.on("rename", (file, oldPath) => {
        let changed = false;
        for (const job of this.jobs) {
          if (job.path === oldPath) {
            job.path = file.path;
            changed = true;
          }
        }
        if (changed) void this.saveState();
      }),
    );

    // Один тикер на все висящие заметки. registerInterval снимет его при
    // выгрузке плагина — таймеров, переживших плагин, не остаётся.
    this.registerInterval(window.setInterval(() => void this.tick(), TICK_MS));
    this.app.workspace.onLayoutReady(() => void this.tick());
  }

  async loadState(): Promise<void> {
    const data = ((await this.loadData()) ?? {}) as PluginData;
    this.settings = { ...DEFAULT_SETTINGS, ...(data.settings ?? {}) };
    this.jobs = Array.isArray(data.jobs) ? data.jobs : [];
  }

  async saveState(): Promise<void> {
    await this.saveData({ settings: this.settings, jobs: this.jobs } satisfies PluginData);
  }

  private openMakeNote(url: string, editor: Editor | null, file: TFile | null): void {
    if (!this.settings.apiKey) {
      new Notice(t().errKey);
      return;
    }
    new MakeNoteModal(this.app, this, url, (choice) => {
      void this.start(url, choice, editor, file);
    }).open();
  }

  private async start(
    url: string,
    choice: Choice,
    editor: Editor | null,
    file: TFile | null,
  ): Promise<void> {
    let noteId: string;
    try {
      noteId = await this.api.createNote(url, choice.detail, choice.model);
    } catch (error) {
      new Notice(describeError(error));
      return;
    }

    const title = choice.title ?? youtubeVideoId(url) ?? "YouTube";
    const line = placeholderLine(noteId, t().placeholder);
    const inline = this.settings.insertMode === "inline" && editor !== null && file !== null;
    let path: string;

    if (inline && editor && file) {
      const cursor = editor.getCursor();
      editor.replaceRange(`\n${line}\n`, {
        line: cursor.line,
        ch: editor.getLine(cursor.line).length,
      });
      path = file.path;
    } else {
      const created = await this.createNoteFile(title, `${line}\n`);
      path = created.path;
      if (editor && file) {
        const cursor = editor.getCursor();
        const link = this.app.fileManager.generateMarkdownLink(created, file.path);
        editor.replaceRange(` → ${link}`, {
          line: cursor.line,
          ch: editor.getLine(cursor.line).length,
        });
      }
    }

    const now = Date.now();
    this.jobs.push({
      noteId,
      path,
      mode: inline ? "inline" : "file",
      title,
      attempt: 0,
      nextAt: now + TICK_MS,
      createdAt: now,
    });
    await this.saveState();
  }

  private async tick(): Promise<void> {
    if (this.ticking || this.jobs.length === 0) return;
    this.ticking = true;
    try {
      const now = Date.now();
      for (const job of [...this.jobs]) {
        if (job.nextAt > now) continue;
        if (now - job.createdAt > STALE_MS) {
          await this.finish(job, null, t().staleJob);
          continue;
        }
        await this.poll(job);
      }
    } finally {
      this.ticking = false;
    }
  }

  private async poll(job: PendingJob): Promise<void> {
    try {
      const note = await this.api.note(job.noteId);
      if (note.status === "done") {
        const markdown = await this.api.exportMarkdown(job.noteId, job.mode === "file");
        await this.finish(job, markdown, null, note.video_title ?? job.title);
      } else if (note.status === "failed") {
        await this.finish(job, null, note.error_message ?? "");
      } else {
        await this.reschedule(job);
      }
    } catch (error) {
      // Заметку удалили в вебе — ждать нечего. Всё остальное (сеть, ключ,
      // перезапуск сервера) может пройти само: пробуем позже.
      if (error instanceof KcError && error.status === 404) {
        await this.finish(job, null, error.message);
      } else {
        await this.reschedule(job);
      }
    }
  }

  private async reschedule(job: PendingJob): Promise<void> {
    job.attempt += 1;
    job.nextAt = Date.now() + nextPollDelay(job.attempt);
    await this.saveState();
  }

  /** Поставить конспект (или ошибку) на место заглушки и забыть задачу. */
  private async finish(
    job: PendingJob,
    markdown: string | null,
    error: string | null,
    title?: string,
  ): Promise<void> {
    this.jobs = this.jobs.filter((other) => other.noteId !== job.noteId);
    await this.saveState();

    const s = t();
    const replacement = markdown ?? s.failedInline(error ?? "");
    let placed = false;
    const file = this.app.vault.getAbstractFileByPath(job.path);
    if (file instanceof TFile) {
      await this.app.vault.process(file, (data) => {
        const next = placeFinished(data, job.noteId, replacement);
        if (next === null) return data;
        placed = true;
        return next;
      });
    }

    if (markdown === null) {
      new Notice(s.noticeFailed(error ?? ""));
      return;
    }
    if (!placed) {
      // Заглушку удалили руками — конспект за потраченные минуты не теряем.
      await this.createNoteFile(title ?? job.title, markdown);
      new Notice(s.noticeMoved);
      return;
    }
    new Notice(s.noticeDone(title ?? job.title));
  }

  private async createNoteFile(title: string, content: string): Promise<TFile> {
    const vault = this.app.vault;
    const raw = this.settings.folder.trim();
    const folder = raw && raw !== "/" ? normalizePath(raw) : "";
    if (folder && !vault.getAbstractFileByPath(folder)) {
      await vault.createFolder(folder);
    }
    const base = safeFileName(title, "KnowledgeClip");
    const prefix = folder ? `${folder}/` : "";
    let path = normalizePath(`${prefix}${base}.md`);
    for (let n = 2; vault.getAbstractFileByPath(path); n += 1) {
      path = normalizePath(`${prefix}${base} (${n}).md`);
    }
    return vault.create(path, content);
  }
}
