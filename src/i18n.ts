import { moment } from "obsidian";

import type { Detail, ModelTier } from "./types.ts";

// Язык — тот, на котором говорит сам Obsidian. Русский только для «ru»;
// всё остальное — английский.

const en = {
  cmdUnderCursor: "Make note from link under cursor",
  cmdPrompt: "Make note from a YouTube link…",

  modalTitle: "Make a note",
  detail: "Detail",
  model: "Model",
  modelDefault: "Best on my plan",
  details: {
    essence: "Essence",
    brief: "Brief",
    normal: "Normal",
    detailed: "Detailed",
    full: "Full transcript",
  } as Record<Detail, string>,
  models: { fast: "Fast", balanced: "Balanced", best: "Best" } as Record<ModelTier, string>,
  loadingPrice: "Checking the price…",
  quoteOk: (minutes: number, leftHours: string) =>
    `${minutes} min of your hours · ${leftHours} h left after`,
  quoteBestFloor: " · a note on the best model counts at least 10 min",
  quoteNoSubs: (minutes: number) =>
    ` · no subtitles, so it also uses ${minutes} min of transcription`,
  shortMinutes: (minutes: number, left: number) =>
    `This one is ${minutes} min and you have ${left} min left this month.`,
  shortBest: "This month's best-model hours are used up.",
  shortTranscription: (left: number) =>
    `This video has no subtitles, and you have ${left} min of transcription left this month.`,
  downgrade: (model: string) => ` It will be made on ${model}.`,
  create: "Make note",
  cancel: "Cancel",

  placeholder: "⏳ KnowledgeClip is making a note…",
  failedInline: (message: string) => `❌ KnowledgeClip couldn't make this note: ${message}`,
  noticeDone: (title: string) => `Note ready: ${title}`,
  noticeFailed: (message: string) => `KnowledgeClip couldn't make the note: ${message}`,
  noticeMoved: "The placeholder was gone, so the note went into a new file.",
  staleJob: "no answer for a day",

  errKey: "Add a valid API key in the KnowledgeClip plugin options.",
  errLimit: (date: string) => `This month's hours are used up. They come back ${date}.`,
  errDaily: "That's all the notes for today on Free. The counter resets at midnight UTC.",
  errModel: "That model isn't on your plan — pick another one.",
  errBudget: "This month's processing allowance is used up.",
  errUrl: "That doesn't look like a YouTube link.",
  errNetwork: "Can't reach KnowledgeClip. Check your connection.",

  noLinkUnderCursor: "No YouTube link on this line.",
  promptTitle: "YouTube link",
  promptPlaceholder: "https://www.youtube.com/watch?v=…",
  promptSubmit: "Continue",

  setKey: "API key",
  setKeyDesc: "Create one in the web app: Settings → API keys.",
  setUrl: "API address",
  setUrlDesc: "Leave as is unless you run your own server.",
  setFolder: "Folder for new notes",
  setFolderDesc: "Where a note goes when it gets its own file.",
  setMode: "Where to put the note",
  setModeFile: "In a new file, linked from where you pasted",
  setModeInline: "Right here, under the link",
  setDetail: "Default detail",
  setModel: "Default model",
  setPaste: "Ask when I paste a YouTube link",
  setPasteDesc: "Off: use the command instead.",
  setCheck: "Connection",
  setCheckButton: "Check",
  setCheckOk: (hours: string) => `Connected · ${hours} h left this month`,
};

type Strings = typeof en;

const ru: Strings = {
  cmdUnderCursor: "Конспект по ссылке под курсором",
  cmdPrompt: "Конспект по ссылке на YouTube…",

  modalTitle: "Сделать конспект",
  detail: "Подробность",
  model: "Модель",
  modelDefault: "Лучшая на моём тарифе",
  details: {
    essence: "Суть",
    brief: "Коротко",
    normal: "Обычно",
    detailed: "Подробно",
    full: "Полная расшифровка",
  },
  models: { fast: "Быстрая", balanced: "Сбалансированная", best: "Лучшая" },
  loadingPrice: "Считаем цену…",
  quoteOk: (minutes, leftHours) => `${minutes} мин из ваших часов · останется ${leftHours} ч`,
  quoteBestFloor: " · на лучшей модели заметка считается минимум за 10 мин",
  quoteNoSubs: (minutes) => ` · субтитров нет, поэтому уйдёт ещё ${minutes} мин расшифровки`,
  shortMinutes: (minutes, left) =>
    `Этот ролик — ${minutes} мин, а в этом месяце осталось ${left} мин.`,
  shortBest: "Часы лучшей модели в этом месяце закончились.",
  shortTranscription: (left) =>
    `У ролика нет субтитров, а минут расшифровки в этом месяце осталось ${left}.`,
  downgrade: (model) => ` Конспект сделает модель «${model}».`,
  create: "Сделать",
  cancel: "Отмена",

  placeholder: "⏳ KnowledgeClip готовит конспект…",
  failedInline: (message) => `❌ KnowledgeClip не смог сделать конспект: ${message}`,
  noticeDone: (title) => `Конспект готов: ${title}`,
  noticeFailed: (message) => `KnowledgeClip не смог сделать конспект: ${message}`,
  noticeMoved: "Заглушки на месте не оказалось — конспект сохранён в новый файл.",
  staleJob: "сутки без ответа",

  errKey: "Укажите рабочий API-ключ в параметрах плагина KnowledgeClip.",
  errLimit: (date) => `Часы этого месяца закончились. Они вернутся ${date}.`,
  errDaily: "На Free это все заметки на сегодня. Счётчик обнулится в полночь по UTC.",
  errModel: "Этой модели нет на вашем тарифе — выберите другую.",
  errBudget: "Лимит обработки на этот месяц исчерпан.",
  errUrl: "Это не похоже на ссылку на YouTube.",
  errNetwork: "Не получается связаться с KnowledgeClip. Проверьте соединение.",

  noLinkUnderCursor: "В этой строке нет ссылки на YouTube.",
  promptTitle: "Ссылка на YouTube",
  promptPlaceholder: "https://www.youtube.com/watch?v=…",
  promptSubmit: "Дальше",

  setKey: "API-ключ",
  setKeyDesc: "Создаётся в веб-приложении: Настройки → API-ключи.",
  setUrl: "Адрес API",
  setUrlDesc: "Не меняйте, если у вас нет своего сервера.",
  setFolder: "Папка для новых конспектов",
  setFolderDesc: "Куда ложится конспект, когда ему заводится свой файл.",
  setMode: "Куда класть конспект",
  setModeFile: "В новый файл со ссылкой из места вставки",
  setModeInline: "Прямо сюда, под ссылку",
  setDetail: "Подробность по умолчанию",
  setModel: "Модель по умолчанию",
  setPaste: "Спрашивать при вставке ссылки на YouTube",
  setPasteDesc: "Если выключено — пользуйтесь командой.",
  setCheck: "Соединение",
  setCheckButton: "Проверить",
  setCheckOk: (hours) => `Подключено · в этом месяце осталось ${hours} ч`,
};

export function lang(): "en" | "ru" {
  return moment.locale().toLowerCase().startsWith("ru") ? "ru" : "en";
}

export function t(): Strings {
  return lang() === "ru" ? ru : en;
}

/** Дата «17 октября» / «October 17» на языке Obsidian. */
export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(lang(), { day: "numeric", month: "long" });
}
