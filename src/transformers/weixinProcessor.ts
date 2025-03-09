import {
  App,
  Notice,
} from "obsidian";
import * as Weixin from '../api/weixin';
import { PublishSettings } from "../publish";
import { ConfirmModal } from "../ui/ui";
import Processor from "./Processor";

interface DOC {
  uuid: string;
}

export const ACTION_CREATE: string = "CREATE";
export const ACTION_PUBLISH: string = "PUBLISH";
export const ACTION_COPY: string = "COPY";

export default class WeixinProcessor extends Processor{

  constructor(app: App, settings: PublishSettings) {
    super(app, settings);
  }

  public async process(action: string, params?: DOC): Promise<void> {
    if(await this.validate()) return;

    await super.process(action, params);
;
    // 添加原文地址
    await this.addOriginInfo();

    // 删除元信息
    this.removeMetadataInfo();

    const value = this.getValue();

    const actionMap = { 
      [ACTION_CREATE]: ():any => {
        this.create(value, params);
      },
      [ACTION_PUBLISH]: ():any => {
        this.publish();
      },
      [ACTION_COPY]: ():any => {
        this.copy(value);
      },
    }
    actionMap[action] ? actionMap[action]() : new Notice("Invalid action!");
  }

  private async create(value: string, params: DOC) {
    const title  = this.getActiveFile().basename;
    const slug = this.getMetaValue(await this.getActiveFileValue(), 'path').split('/')[1];
    if(!slug) {
      new Notice("slug 不能为空，请检查 path");
      return true;
    }
    const doc = await Weixin.hasDoc(this.settings.weixinSetting, title);
    if(!!doc) {
      const onComfirm = async () => {
        await Weixin.updateDoc(this.settings.weixinSetting, title, value, doc.media_id);
        new Notice("Updated successfully");
      };
      new ConfirmModal(this.app, `【${title}】已经存在，确定要更新吗？`, onComfirm).open();
      return;
    }
    await Weixin.addDoc(this.settings.weixinSetting, title, value);
    new Notice("Created successfully");
  }

  private async publish() {
    const title  = this.getActiveFile().basename;
    const doc = await Weixin.hasDoc(this.settings.weixinSetting, title);
    await Weixin.publishDoc(this.settings.weixinSetting, doc.media_id);
    new Notice("Published successfully");
  }
}