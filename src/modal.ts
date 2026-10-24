import { type App, type ButtonComponent, Modal, Setting } from "obsidian";

import { describeError, KcError } from "./api.ts";
import { t } from "./i18n.ts";
import { formatHours, youtubeVideoId } from "./logic.ts";
import type KnowledgeClipPlugin from "./main.ts";
import { DETAILS, MODELS, type Detail, type ModelTier, type Quote } from "./types.ts";

export interface Choice {
  detail: Detail;
  model: ModelTier | null;
  title: string | null;
}

/** Цена словами — как на кнопке в вебе. */
function describeQuote(quote: Quote): string {
  const s = t();
  if (quote.affordable) {
    let text = s.quoteOk(
      quote.charge.minutes,
      formatHours(quote.left.minutes - quote.charge.minutes),
    );
    if (quote.model_tier === "best" && quote.charge.minutes > Math.ceil(quote.billed_minutes)) {
      text += s.quoteBestFloor;
    }
    if (quote.charge.transcription_minutes > 0) {
      text += s.quoteNoSubs(quote.charge.transcription_minutes);
    }
    return text;
  }
  let text =
    quote.short_of === "best_minutes"
      ? s.shortBest
      : quote.short_of === "transcription_minutes"
        ? s.shortTranscription(quote.left.transcription_minutes)
        : s.shortMinutes(quote.charge.minutes, quote.left.minutes);
  if (quote.downgrade_to) text += s.downgrade(s.models[quote.downgrade_to]);
  return text;
}

/**
 * Окно «сделать конспект»: подробность, модель и цена до клика.
 *
 * Цена пересчитывается на каждое изменение выбора; ответ, пришедший на
 * устаревший выбор, отбрасывается по номеру запроса.
 */
export class MakeNoteModal extends Modal {
  private detail: Detail;
  private model: ModelTier | null;
  private title: string | null = null;
  private request = 0;
  private videoEl!: HTMLElement;
  private priceEl!: HTMLElement;
  private createButton: ButtonComponent | null = null;

  constructor(
    app: App,
    private readonly plugin: KnowledgeClipPlugin,
    private readonly url: string,
    private readonly onChoose: (choice: Choice) => void,
  ) {
    super(app);
    this.detail = plugin.settings.detail;
    this.model = plugin.settings.model || null;
  }

  onOpen(): void {
    const s = t();
    this.modalEl.addClass("kc-modal");
    this.titleEl.setText(s.modalTitle);
    const { contentEl } = this;

    this.videoEl = contentEl.createDiv({ cls: "kc-video", text: this.url });

    new Setting(contentEl).setName(s.detail).addDropdown((dropdown) => {
      for (const detail of DETAILS) dropdown.addOption(detail, s.details[detail]);
      dropdown.setValue(this.detail).onChange((value) => {
        this.detail = value as Detail;
        void this.refresh();
      });
    });

    new Setting(contentEl).setName(s.model).addDropdown((dropdown) => {
      dropdown.addOption("", s.modelDefault);
      for (const model of MODELS) dropdown.addOption(model, s.models[model]);
      dropdown.setValue(this.model ?? "").onChange((value) => {
        this.model = value ? (value as ModelTier) : null;
        void this.refresh();
      });
    });

    this.priceEl = contentEl.createDiv({ cls: "kc-price" });

    new Setting(contentEl)
      .addButton((button) => button.setButtonText(s.cancel).onClick(() => this.close()))
      .addButton((button) => {
        this.createButton = button;
        button
          .setButtonText(s.create)
          .setCta()
          .onClick(() => {
            this.onChoose({ detail: this.detail, model: this.model, title: this.title });
            this.close();
          });
      });

    void this.refresh();
  }

  private async refresh(): Promise<void> {
    const request = ++this.request;
    this.priceEl.setText(t().loadingPrice);
    this.priceEl.removeClass("kc-price-short");
    this.createButton?.setDisabled(true);
    try {
      const quote = await this.plugin.api.quote(this.url, this.detail, this.model);
      if (request !== this.request) return;
      this.title = quote.video_title;
      this.videoEl.setText(quote.video_title ?? this.url);
      this.priceEl.setText(describeQuote(quote));
      this.priceEl.toggleClass("kc-price-short", !quote.affordable);
      // Не хватает Лучшей — воркер сам понизит модель, так что можно.
      this.createButton?.setDisabled(!quote.affordable && !quote.downgrade_to);
    } catch (error) {
      if (request !== this.request) return;
      this.priceEl.setText(describeError(error));
      this.priceEl.addClass("kc-price-short");
      // Сеть или сбой разведки — пусть решает сервер. Ключ, лимит, модель,
      // ссылка — повторять незачем, ответ будет тот же.
      const hopeless =
        error instanceof KcError && error.status >= 400 && error.status < 500;
      this.createButton?.setDisabled(hopeless);
    }
  }

  onClose(): void {
    this.request += 1;
    this.contentEl.empty();
  }
}

/** Ввод ссылки для команды «Конспект по ссылке…». */
export class LinkPromptModal extends Modal {
  private value = "";

  constructor(app: App, private readonly onSubmit: (url: string) => void) {
    super(app);
  }

  onOpen(): void {
    const s = t();
    this.modalEl.addClass("kc-modal");
    this.titleEl.setText(s.promptTitle);
    const error = this.contentEl.createDiv({ cls: "kc-price kc-price-short" });

    const submit = () => {
      const url = this.value.trim();
      if (!youtubeVideoId(url)) {
        error.setText(s.errUrl);
        return;
      }
      this.close();
      this.onSubmit(url);
    };

    new Setting(this.contentEl).addText((text) => {
      text.setPlaceholder(s.promptPlaceholder).onChange((value) => {
        this.value = value;
      });
      text.inputEl.addClass("kc-wide");
      text.inputEl.addEventListener("keydown", (event) => {
        if (event.key === "Enter") submit();
      });
      window.setTimeout(() => text.inputEl.focus(), 0);
    });

    new Setting(this.contentEl).addButton((button) =>
      button.setButtonText(s.promptSubmit).setCta().onClick(submit),
    );
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
