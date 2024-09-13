import {
  App,
  TFile,
  FileSystemAdapter,
  Notice,
  Modal, 
  Setting
} from "obsidian";
import fs from 'fs';
import { simpleGit } from 'simple-git';
import frontMatter from "front-matter";
import { PublishSettings } from "../publish";

const MD_REGEX = /\[(.*?)\]\((.*?)\)/g;
const WIKI_REGEX = /\[\[(.*)\]\]/g;
const PREFIX_REGEX = /## 写在前面\s*(.*)$/s;
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

export const ACTION_CREATE: string = "CREATE";
export const ACTION_PUBLISH: string = "PUBLISH";
export const ACTION_COPY: string = "COPY";
export default class BlogProcessor {
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
    const path  = this.getMetaValue(value, 'path');
    const categories  = this.getMetaValue(value, 'categories');
    const description  = this.getMetaValue(value, 'description');

    if(!path || !categories || !description) {
     new Notice("请填写博客元信息：categories、description、path");
     return
    }

    // 添加博客元信息
    value = this.addBlogMeta(value);

    // 添加目录
    value = this.addBlogTOC(value);

    // 添加原文地址
    value = this.addOriginInfo(value, path)

    // 删除【## 扩展阅读】 后的内容
    value = value.replace(SUFFIX_REGEX, "");

    // 替换 Callouts 语法
    value = value.replaceAll(CALLOUTS_REGEX, "");

    for (const link of links) {
      value = value.replaceAll(link.source, link.name);
    }

    const directory = this.settings.blogSetting.directory;

    switch (action) {
      case ACTION_CREATE:
        fs.writeFileSync(`${directory}/${path}.md`, value);
        new Notice("Update successfully");
        break;
      case ACTION_PUBLISH:
        const title  = this.getMetaValue(value, 'title');
        simpleGit(directory, {
          progress({ method, stage, progress }) {
            console.log(`git.${method} ${stage} stage ${progress}% complete`);
          },
        })
        .add('./*')
        .commit(`feat: 发布${title}`)
        .push(['-u', 'origin', 'main'], () => console.log('done'));;
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
  private addBlogMeta (value: string) {
    const title  = this.getActiveFile().basename; 
    const path = this.getActiveFile().path;
    const obsidianUrl = `obsidian://open?vault=content&file=${encodeURIComponent(path)}`
    const blogMetaTpl = `title: ${title}
Obsidian地址: ${obsidianUrl}
`;
    const match = value.match(PROPERTIES_REGEX);
    let blogMeta = match[0].trim().replaceAll('---\n', '').replaceAll('---', '');
    blogMeta = `---\n${blogMeta}${blogMetaTpl}---\n`
    return value.replace(PROPERTIES_REGEX, blogMeta);
  }

  private addBlogTOC (value: string) {
    const match = value.match(PROPERTIES_REGEX);
    const toc = `${match[0]}## 目录\n`
    return value.replace(PROPERTIES_REGEX, toc);
  }

  private addOriginInfo(value:any, path: string) {
    const match = value.match(PREFIX_REGEX);
    const origin = `${match[0]}\n> 点击链接查看[原文](https://blog.songxingguo.com/posts/${path}/) ， 订阅 [SSR](https://blog.songxingguo.com/atom.xml) 获得最新动态。\n`
    return value.replace(PROPERTIES_REGEX, origin);
  }

  getMetaValue(value:any, key: string) {
    const metadata = frontMatter(value);
    return key && metadata.attributes[key] || '';
  }
}

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