import { filter } from 'unist-util-filter';
import {
  App,
  TFile,
  Notice
} from "obsidian";
import { PublishSettings } from "../publish";
import frontMatter from "front-matter";
import { fromMarkdown } from 'mdast-util-from-markdown';
import { toMarkdown } from 'mdast-util-to-markdown';
import { visit } from 'unist-util-visit';
import { u } from 'unist-builder';

const MD_REGEX = /\[(.*?)\]\((.*?)\)/g;
const WIKI_REGEX = /\[\[(.*)\]\]/g;
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

const filter = (tree: any, type: string) => {
  const nodes = [];
  visit(tree, type, (node) => {
    nodes.push(node);
  });
  return nodes;
}

export default class Processor {
    protected app: App;
    protected settings: PublishSettings;
    protected value: string;

    constructor(app: App, settings: PublishSettings) {
      this.app = app;
      this.settings = settings;
    }

    public async process(action: string, params?: DOC): Promise<void> {
        this.value = await this.getActiveFileValue();

        // 删除【## 扩展阅读】 后的内容
        this.removeMoreReading();

        // 替换 Callouts 语法
        this.value = this.value.replaceAll(CALLOUTS_REGEX, "");
    
        const links = this.getLinks(this.value);
        for (const link of links) {
          this.value = this.value.replaceAll(link.source, link.name);
        }
    }

    protected async validate() {
      const value = await this.getActiveFileValue();
      const path  = this.getMetaValue(value, 'path');
      const categories  = this.getMetaValue(value, 'categories');
      const description  = this.getMetaValue(value, 'description');
  
      if(!path || !categories || !description) {
        new Notice("请填写博客元信息：categories、description、path");
        return true;
      }

      return false;
    }

    protected getLinks(value: string): Link[] {
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
  
    protected async getActiveFileValue(): Promise<string> {
      const file = this.getActiveFile();
      return await this.app.vault.adapter.read(file.path);
    }

    protected getValue(): string {
      return this.value;
    }
  
    protected getActiveFile(): TFile {
      return this.app.workspace.getActiveFile() || null;
    }
  
    protected async addOriginInfo() {
      const path = this.getMetaValue(await this.getActiveFileValue(), 'path');
      const tree = fromMarkdown(this.value);
      const headings = filter(tree, 'heading');
      const headingIndex = headings.findIndex(item => item.children[0].value === '写在前面');
      const headingName = headings[headingIndex + 1].children[0].value;
      let insertIndex = 0;
      visit(tree, "heading", (node, index) => {
        if(node.children[0].value == headingName ) {
          insertIndex = index;
        }
      });
      const baseUrl = 'https://blog.songxingguo.com';
      const url = path ? `${baseUrl}/posts/${path}` : `${baseUrl}`;
      const originInfo = u('blockquote', [  
          u('paragraph',[
            u('text', { value: "点击链接查看"}),
            u('link', { title: '原文', url}, [
              u('text', { value: "原文"})
            ]),
            u('text', { value: "，订阅"}),
            u('link', { title: 'SSR', url: "https://blog.songxingguo.com/atom.xml"}, [
              u('text', { value: "SSR"})
            ]),
            u('text', { value: "。"})
          ])
        ]
      )
      tree.children.splice(insertIndex, 0, originInfo);
      this.value = toMarkdown(tree);
    }

    protected removeMetadataInfo() {
      const tree = fromMarkdown(this.value);
      let [start =  0, end = 0] = [];
      start = tree.children.findIndex(item => item.type === 'thematicBreak');
      end = tree.children.findIndex((item, index) => item.type === 'thematicBreak' && index !== start);
      tree.children.splice(start, end - start + 1);
      this.value = toMarkdown(tree);
    }

    protected removeMoreReading() {
      const tree = fromMarkdown(this.value);
      const index = tree.children.findIndex(item => item.type === 'heading' && item.children[0].value == '扩展阅读');
      tree.children.splice(index, tree.children.length);
      this.value = toMarkdown(tree);
    }
  
    protected getMetaValue(value: string, key: string) {
      const metadata = frontMatter(value);
      return key && metadata.attributes[key] || '';
    }

    protected async copy(value: string) {
      navigator.clipboard.writeText(value);
      new Notice("Copied to clipboard");
    }
}