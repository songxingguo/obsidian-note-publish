import {
  App,
  Editor,
  TFile,
  FileSystemAdapter,
  MarkdownView,
  Notice,
} from "obsidian";
import path from "path";
import { PublishSettings } from "../publish";
import { log } from "console";

const MD_REGEX = /\[(.*?)\]\((.*?)\)/g;
const WIKI_REGEX = /\[\[(.*)\]\]/g;
const SUFFIX_REGEX = /## 扩展阅读\s*(.*)$/s;
const PROPERTIES_REGEX = /^---[\s\S]+?---\n/;
const CALLOUTS_REGEX = />\s*\[!\w+]\s*(.*)/gm;

interface Link {
  name: string;
  path: string;
  fullPath: string;
  source: string;
}

interface Doc {
  title: string;
  data: string;
}

export const ACTION_PUBLISH: string = "PUBLISH";

export default class Links {
  private app: App;
  private settings: PublishSettings;
  private adapter: FileSystemAdapter;

  constructor(app: App, settings: PublishSettings) {
    this.app = app;
    this.adapter = this.app.vault.adapter as FileSystemAdapter;
    this.settings = settings;
  }

  public async process(action: string): Promise<Doc> {
    let value = this.getValue();
    const links = this.getLinks(value);

    // 删除元信息
    value = value.replace(PROPERTIES_REGEX, "");

    // 删除【扩展阅读】 后的内容
    value = value.replace(SUFFIX_REGEX, "");

    // 替换 Callouts 语法
    value = value.replaceAll(CALLOUTS_REGEX, "");

    for (const link of links) {
      value = value.replaceAll(link.source, link.name);
    }

    return new Promise((resolve) => {
      switch (action) {
        case ACTION_PUBLISH:
          navigator.clipboard.writeText(value);
          new Notice("Copied to clipboard");
          break;
        // more cases
        default:
          throw new Error("invalid action!");
      }
      resolve({ title: this.getActiveFile().basename, data: value });
    });
  }

  private getLinks(value: string): Link[] {
    const links: Link[] = [];
    const wikiMatches = value.matchAll(WIKI_REGEX);
    const mdMatches = value.matchAll(MD_REGEX);
    for (const match of wikiMatches) {
      const name = match[1];
      var path_name = name;
      if (name.endsWith(".excalidraw")) {
        path_name = name + ".png";
      }
      links.push({
        name: name,
        path: this.settings.attachmentLocation + "/" + path_name,
        source: match[0],
        fullPath: "",
      });
    }
    for (const match of mdMatches) {
      if (match[2].startsWith("http://") || match[2].startsWith("https://")) {
        continue;
      }
      const decodedPath = decodeURI(match[2]);
      links.push({
        name: decodedPath,
        path: decodedPath,
        source: match[0],
        fullPath: "",
      });
    }
    return links;
  }

  private getValue(): string {
    const editor = this.getEditor();
    if (editor) {
      return editor.getValue();
    } else {
      return "";
    }
  }

  private getEditor(): Editor {
    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (activeView) {
      return activeView.editor;
    } else {
      return null;
    }
  }

  private getActiveFile(): TFile {
    return this.app.workspace.getActiveFile() || null;
  }
}
