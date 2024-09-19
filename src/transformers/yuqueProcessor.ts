import {
  App,
  Notice,
} from "obsidian";
import { PublishSettings } from "../publish";
import * as YuQue from './../api/yuque';
import Processor from "./processor";
import { ConfirmModal } from "../ui/ui";

const PROPERTIES_REGEX = /^---[\s\S]+?---\n/;

interface DOC {
  uuid: string;
}

export const ACTION_PUBLISH: string = "PUBLISH";
export const ACTION_COPY: string = "COPY";

export default class YuqueProcessor extends Processor{

  constructor(app: App, settings: PublishSettings) {
    super(app, settings);
  }

  public async process(action: string, params?: DOC): Promise<void> {
    if(await this.validate()) return;

    super.process(action, params);

    let value = await this.getValue();
    // 删除元信息
    value = value.replace(PROPERTIES_REGEX, "");

    const actionMap = { 
      [ACTION_PUBLISH]: ():any => {
        this.publish(value, params);
      },
      [ACTION_COPY]: ():any => {
        this.copy(value);
      },
    }
    actionMap[action] ? actionMap[action]() : new Notice("Invalid action!");
  }

  private async publish(value: string, params: DOC) {
    const title  = this.getActiveFile().basename;
    const slug = this.getMetaValue(await this.getValue(), 'path').split('/')[1];
    const doc = await YuQue.hasDoc(this.settings.yuqueSetting, slug) 
    if(!!doc) {
      const onComfirm = async () => {
        await YuQue.updateDoc(this.settings.yuqueSetting, title, value, slug);
        new Notice("Update successfully");
      };
      new ConfirmModal(this.app, `【${title}】已经存在，确定要更新吗？`, onComfirm).open();
      return;
    }
    const { data } = await YuQue.addDoc(this.settings.yuqueSetting, title, value, slug);
    await YuQue.updateToc(this.settings.yuqueSetting, params.uuid, data.id);
    new Notice("Published successfully");
  }
}