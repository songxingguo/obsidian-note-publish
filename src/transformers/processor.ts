import frontMatter from "front-matter";
import { fromMarkdown } from 'mdast-util-from-markdown';
import { frontmatterFromMarkdown, frontmatterToMarkdown } from 'mdast-util-frontmatter';
import { toMarkdown } from 'mdast-util-to-markdown';
import { frontmatter } from 'micromark-extension-frontmatter';
import { gfm } from 'micromark-extension-gfm';
import {
  App,
  Notice,
  TFile
} from "obsidian";
import { u } from 'unist-builder';
import { visit } from 'unist-util-visit';
import { PublishSettings } from "../publish";

const MD_REGEX = /\[(.*?)\]\((.*?)\)/g;
const WIKI_REGEX = /\[\[(.*)\]\]/g;
const CALLOUTS_REGEX = />\s*\[!\w+]\s*(.*)/gm;

const toMarkdownWithOptions = (tree) => {
  return toMarkdown(tree, {
    bullet: "-",
    rule: '-',
    extensions: [frontmatterToMarkdown(['yaml', 'toml'])]
  });
}

const fromMarkdownWithOptions = (value) => {
  return fromMarkdown(value, {
    extensions: [gfm(), frontmatter(['yaml', 'toml'])],
    mdastExtensions: [frontmatterFromMarkdown(['yaml', 'toml'])]
  })
}

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

function validateFileName(fileName) {
  // 限定以小写字母开头，并且中间只包括小写字母和-，以小写字母结尾
  const pattern = /^[a-z]{1}[a-z-]*?[a-z]$/;;
  return pattern.test(fileName);
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

      console.log('path.split("/")[1]', path.split("/")[1]);
      if(!validateFileName(path.split("/")[1])) {
        new Notice("路径格式不正确，请以中横线分割：example-path");
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

    protected addBlogMeta () {
      const tree = fromMarkdownWithOptions(this.value);
      const yaml = tree.children.find((item) => item.type === 'yaml');
      const title  = this.getActiveFile().basename; 
      const path = this.getActiveFile().path;
      const obsidianUrl = `obsidian://open?vault=content&file=${encodeURIComponent(path)}`
      yaml.value = [yaml.value,`title: ${title}`,`Obsidian地址: ${obsidianUrl}`].join('\n')
      this.value = toMarkdownWithOptions(tree)
    }

    protected async addBlogTOC () {
      const tree = fromMarkdownWithOptions(this.value);
      const toc = u('heading',{depth: 2},[
        u('text', { value: "目录"}),
      ])
      tree.children.splice(1, 0, toc);
      this.value = toMarkdownWithOptions(tree)
    }
  
    protected async addOriginInfo() {
      const path = this.getMetaValue(await this.getActiveFileValue(), 'path');
      const tree = fromMarkdownWithOptions(this.value);
      const headingIndex = tree.children.findIndex((item) => item.type === 'heading');
      if(headingIndex < 0) return
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
      tree.children.splice(headingIndex, 0, originInfo);
      this.value = toMarkdownWithOptions(tree)
    }

    protected removeMetadataInfo() {
      const tree = fromMarkdownWithOptions(this.value);
      tree.children.splice(0, 1);
      this.value = toMarkdownWithOptions(tree)
    }

    protected removeMoreReading() {
      const tree = fromMarkdownWithOptions(this.value);
      const index = tree.children.findIndex(item => item.type === 'heading' && item.children[0].value == '扩展阅读');
      tree.children.splice(index, tree.children.length);
      this.value = toMarkdownWithOptions(tree)
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