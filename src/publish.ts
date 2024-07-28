import { Notice, WorkspaceLeaf, Plugin } from "obsidian";

import ImageTagProcessor, {
  ACTION_PUBLISH,
} from "./uploader/imageTagProcessor";
import YuqueProcessor from "./transformers/yuqueProcessor";
import ImageUploader from "./uploader/imageUploader";
import { ImgurAnonymousSetting } from "./uploader/imgur/imgurAnonymousUploader";
import { IMGUR_PLUGIN_CLIENT_ID } from "./uploader/imgur/constants";
import ImageStore from "./imageStore";
import buildUploader from "./uploader/imageUploaderBuilder";
import PublishSettingTab from "./ui/publishSettingTab";
import { OssSetting } from "./uploader/oss/ossUploader";
import { ImagekitSetting } from "./uploader/imagekit/imagekitUploader";
import * as YuQue from "./api/yuque";
import { NotePreview, VIEW_TYPE_NOTE_PREVIEW } from './ui/notepreview';
export interface PublishSettings {
  imageAltText: boolean;
  replaceOriginalDoc: boolean;
  deleteAttachments: boolean;
  ignoreProperties: boolean;
  attachmentLocation: string;
  imageStore: string;
  //Imgur Anonymous setting
  imgurAnonymousSetting: ImgurAnonymousSetting;
  ossSetting: OssSetting;
  imagekitSetting: ImagekitSetting;
  yuqueSetting: YuQue.YuQueSetting;
}

const DEFAULT_SETTINGS: PublishSettings = {
  imageAltText: true,
  replaceOriginalDoc: false,
  deleteAttachments: true,
  ignoreProperties: true,
  attachmentLocation: ".",
  imageStore: ImageStore.IMGUR.id,
  imgurAnonymousSetting: { clientId: IMGUR_PLUGIN_CLIENT_ID },
  ossSetting: {
    region: "oss-cn-hangzhou",
    accessKeyId: "",
    accessKeySecret: "",
    bucket: "",
    endpoint: "https://oss-cn-hangzhou.aliyuncs.com/",
    path: "",
    customDomainName: "",
  },
  imagekitSetting: {
    endpoint: "",
    imagekitID: "",
    privateKey: "",
    publicKey: "",
    folder: "",
  },
  yuqueSetting: {
    token: "",
    bookSlug: "",
    public: true,
  },
};
export default class ObsidianPublish extends Plugin {
  settings: PublishSettings;
  imageTagProcessor: ImageTagProcessor;
  imageUploader: ImageUploader;
  yuqueProcessor: YuqueProcessor;

  async onload() {
    await this.loadSettings();
    this.setupImageUploader();
    this.setupTransformer();
    this.addStatusBarItem().setText("Status Bar Text");
    this.registerView(
			VIEW_TYPE_NOTE_PREVIEW,
			(leaf) => new NotePreview(leaf, this.settings,  this.yuqueProcessor)
		);
    
    const ribbonIconEl = this.addRibbonIcon('clipboard-paste', '笔记预览', (evt: MouseEvent) => {
			this.activateView();
		});
    ribbonIconEl.addClass('note-to-mp-plugin-ribbon-class');
    
    this.addCommand({
      id: "upload-image",
      name: "Upload Image",
      checkCallback: (checking: boolean) => {
        if (!checking) {
          this.publish();
        }
        return true;
      },
    });
    this.addSettingTab(new PublishSettingTab(this.app, this));
  }

  onunload() {
    // console.log("unloading plugin");
  }

  async loadSettings() {
    this.settings = Object.assign(
      {},
      DEFAULT_SETTINGS,
      (await this.loadData()) as PublishSettings
    );
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  private async publish(): Promise<void> {
    if (!this.imageUploader) {
      new Notice("Image uploader setup failed, please check setting.");
    } else {
      await this.imageTagProcessor.process(ACTION_PUBLISH).then(() => {});
    }
  }

  setupImageUploader(): void {
    try {
      this.imageUploader = buildUploader(this.settings);
      this.imageTagProcessor = new ImageTagProcessor(
        this.app,
        this.settings,
        this.imageUploader
      );
    } catch (e) {
      console.log(`Failed to setup image uploader: ${e}`);
    }
  }

  setupTransformer(): void {
    try {
      this.yuqueProcessor = new YuqueProcessor(this.app, this.settings);
    } catch (e) {
      console.log(`Failed to setup image uploader: ${e}`);
    }
  }

	async activateView() {
		const { workspace } = this.app;
	
		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_NOTE_PREVIEW);
	
		if (leaves.length > 0) {
			leaf = leaves[0];
		} else {
		  	leaf = workspace.getRightLeaf(false);
		  	await leaf?.setViewState({ type: VIEW_TYPE_NOTE_PREVIEW, active: true });
		}
	
		if (leaf) workspace.revealLeaf(leaf);
	}
}
