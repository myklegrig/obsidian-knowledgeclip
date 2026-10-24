import { type App, PluginSettingTab, Setting } from "obsidian";

import { describeError } from "./api.ts";
import { t } from "./i18n.ts";
import { formatHours } from "./logic.ts";
import type KnowledgeClipPlugin from "./main.ts";
import { DETAILS, MODELS, type Detail, type ModelTier } from "./types.ts";

export interface KcSettings {
  apiKey: string;
  apiUrl: string;
  folder: string;
  insertMode: "file" | "inline";
  detail: Detail;
  /** "" — лучшая модель, что есть на тарифе. */
  model: ModelTier | "";
  interceptPaste: boolean;
}

export const DEFAULT_SETTINGS: KcSettings = {
  apiKey: "",
  apiUrl: "https://api.knowledgeclip.app",
  folder: "KnowledgeClip",
  insertMode: "file",
  detail: "normal",
  model: "",
  interceptPaste: true,
};

export class KcSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: KnowledgeClipPlugin) {
    super(app, plugin);
  }

  display(): void {
    const s = t();
    const { containerEl } = this;
    containerEl.empty();
    const settings = this.plugin.settings;

    new Setting(containerEl)
      .setName(s.setKey)
      .setDesc(s.setKeyDesc)
      .addText((text) => {
        text.inputEl.type = "password";
        text.setPlaceholder("kc_…").setValue(settings.apiKey).onChange(async (value) => {
          settings.apiKey = value.trim();
          await this.plugin.saveState();
        });
      });

    const check = new Setting(containerEl).setName(s.setCheck);
    check.addButton((button) =>
      button.setButtonText(s.setCheckButton).onClick(async () => {
        check.setDesc("…");
        try {
          const usage = await this.plugin.api.usage();
          const left = usage.quota.minutes.limit - usage.quota.minutes.used;
          check.setDesc(s.setCheckOk(formatHours(left)));
        } catch (error) {
          check.setDesc(describeError(error));
        }
      }),
    );

    new Setting(containerEl)
      .setName(s.setMode)
      .addDropdown((dropdown) =>
        dropdown
          .addOption("file", s.setModeFile)
          .addOption("inline", s.setModeInline)
          .setValue(settings.insertMode)
          .onChange(async (value) => {
            settings.insertMode = value === "inline" ? "inline" : "file";
            await this.plugin.saveState();
          }),
      );

    new Setting(containerEl)
      .setName(s.setFolder)
      .setDesc(s.setFolderDesc)
      .addText((text) =>
        text.setPlaceholder("KnowledgeClip").setValue(settings.folder).onChange(async (value) => {
          settings.folder = value.trim();
          await this.plugin.saveState();
        }),
      );

    new Setting(containerEl).setName(s.setDetail).addDropdown((dropdown) => {
      for (const detail of DETAILS) dropdown.addOption(detail, s.details[detail]);
      dropdown.setValue(settings.detail).onChange(async (value) => {
        settings.detail = value as Detail;
        await this.plugin.saveState();
      });
    });

    new Setting(containerEl).setName(s.setModel).addDropdown((dropdown) => {
      dropdown.addOption("", s.modelDefault);
      for (const model of MODELS) dropdown.addOption(model, s.models[model]);
      dropdown.setValue(settings.model).onChange(async (value) => {
        settings.model = value as ModelTier | "";
        await this.plugin.saveState();
      });
    });

    new Setting(containerEl)
      .setName(s.setPaste)
      .setDesc(s.setPasteDesc)
      .addToggle((toggle) =>
        toggle.setValue(settings.interceptPaste).onChange(async (value) => {
          settings.interceptPaste = value;
          await this.plugin.saveState();
        }),
      );

    new Setting(containerEl)
      .setName(s.setUrl)
      .setDesc(s.setUrlDesc)
      .addText((text) =>
        text.setValue(settings.apiUrl).onChange(async (value) => {
          settings.apiUrl = value.trim() || DEFAULT_SETTINGS.apiUrl;
          await this.plugin.saveState();
        }),
      );
  }
}
