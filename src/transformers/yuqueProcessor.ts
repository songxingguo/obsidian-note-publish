import {
  App,
  Editor,
  TFile,
  FileSystemAdapter,
  MarkdownView,
  Notice,
} from "obsidian";
import { PublishSettings } from "../publish";
import * as YuQue from './../api/yuque';

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

interface DOC {
  uuid: string;
}

export const ACTION_PUBLISH: string = "PUBLISH";
export const ACTION_COPY: string = "COPY";

export default class Links {
  private app: App;
  private settings: PublishSettings;
  private adapter: FileSystemAdapter;

  constructor(app: App, settings: PublishSettings) {
    this.app = app;
    this.adapter = this.app.vault.adapter as FileSystemAdapter;
    this.settings = settings;
  }

  public async process(action: string, params?: DOC): Promise<void> {
    let value = await this.getValue();
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

    const title  = this.getActiveFile().basename;

    switch (action) {
      case ACTION_PUBLISH:
        const { data } = await YuQue.addDoc(this.settings.yuqueSetting, title, value);
        await YuQue.updateToc(this.settings.yuqueSetting, params.uuid, data.id);
        new Notice("Published successfully");
        break;
      case ACTION_COPY:
        navigator.clipboard.writeText(value);
        new Notice("Copied to clipboard");
        break;
      default:
        throw new Error("invalid action!");
    }
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

  private async getValue(): Promise<string> {
    const file = this.getActiveFile();
    return await this.app.vault.adapter.read(file.path);
  }

  private getActiveFile(): TFile {
    return this.app.workspace.getActiveFile() || null;
  }
}
