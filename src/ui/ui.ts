import {
  App,
  Modal, 
  Setting
} from "obsidian";

export class ConfirmModal extends Modal {
  title: string;
  onConfirm: () => void;
  onCancel: () => void;

  constructor(app: App, title:string, onConfirm: () => void, onCancel?: () => void) {
    super(app);
    this.title = title;
    this.onConfirm = onConfirm;
    this.onCancel = onCancel;
  }

  onOpen() {
    const { contentEl } = this;

    contentEl.createEl("h1", { text: this.title });

    new Setting(contentEl)
    .addButton((btn) =>
      btn
        .setButtonText("取消")
        .onClick(() => {
          this.close();
          this.onCancel();
        }))
    .addButton((btn) =>
      btn
        .setButtonText("确定")
        .onClick(() => {
          this.close();
          this.onConfirm();
        }));
  }

  onClose() {
    let { contentEl } = this;
    contentEl.empty();
  }
}