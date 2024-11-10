import {
  App,
  Notice,
} from "obsidian";
import fs from 'fs';
// import { simpleGit } from 'simple-git';
import { PublishSettings } from "../publish";
import Processor from "./processor";

const PROPERTIES_REGEX = /^---[\s\S]+?---\n/;

interface DOC {
  uuid: string;
}

export const ACTION_CREATE: string = "CREATE";
export const ACTION_PUBLISH: string = "PUBLISH";
export const ACTION_COPY: string = "COPY";
export default class BlogProcessor  extends Processor{

  constructor(app: App, settings: PublishSettings) {
    super(app, settings);
  }

  public async process(action: string, params?: DOC): Promise<void> {
    if(await this.validate()) return;

    super.process(action, params);
    
    let value = await this.getValue();
    // 添加博客元信息
    value = this.addBlogMeta(value);
    // 添加目录
    value = this.addBlogTOC(value);

    const actionMap = {
      [ACTION_CREATE]: ():any => {
        this.create(value);
      },
      [ACTION_PUBLISH]: ():any => {
        // this.publish(value);
      },
      [ACTION_COPY]: ():any => {
        this.copy(value);
      },
    }
    actionMap[action] ? actionMap[action]() : new Notice("Invalid action!");
  }

  private create(value: string) {
    const path  = this.getMetaValue(value, 'path');
    const directory = this.settings.blogSetting.directory;
    fs.writeFileSync(`${directory}/${path}.md`, value);
    new Notice("Update successfully");
  }

  // private async publish(value: string) {
  //   const title  = this.getMetaValue(value, 'title');
  //   const directory = this.settings.blogSetting.directory;
  //   simpleGit(directory, {
  //     progress({ method, stage, progress }) {
  //       console.log(`git.${method} ${stage} stage ${progress}% complete`);
  //     },
  //   })
  //   .add('./*')
  //   .commit(`feat: 发布${title}`)
  //   .push(['-u', 'origin', 'main'], () => console.log('done'));;
  //   new Notice("Published successfully");
  // }

  protected addBlogMeta (value: string) {
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
}