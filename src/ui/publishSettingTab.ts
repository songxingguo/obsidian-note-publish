import { App, PluginSettingTab, Setting } from "obsidian";
import ImageStore from "../imageStore";
import ObsidianPublish from "../publish";
import { RegionList } from "../uploader/oss/common";

export default class PublishSettingTab extends PluginSettingTab {
  private plugin: ObsidianPublish;
  private imageStoreDiv: HTMLDivElement;

  constructor(app: App, plugin: ObsidianPublish) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): any {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h1", { text: "Upload Settings" });

    const imageStoreTypeDiv = containerEl.createDiv();
    this.imageStoreDiv = containerEl.createDiv();

    // Attachment location
    new Setting(imageStoreTypeDiv)
      .setName("Attachment location")
      .setDesc("The location storing images which will upload images from.")
      .addText((text) =>
        text
          .setPlaceholder("Enter folder name")
          .setValue(this.plugin.settings.attachmentLocation)
          .onChange(async (value) => {
            // if ((await this.app.vault.getAbstractFileByPath(value)) == null) {
            //   new Notice(`Attachment location "${value}" not exist!`);
            //   return;
            // }
            this.plugin.settings.attachmentLocation = value;
          })
      );

    new Setting(imageStoreTypeDiv)
      .setName("Use image name as Alt Text")
      .setDesc(
        "Whether to use image name as Alt Text with '-' and '_' replaced with space."
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.imageAltText)
          .onChange((value) => (this.plugin.settings.imageAltText = value))
      );

    new Setting(imageStoreTypeDiv)
      .setName("Update original document")
      .setDesc("Whether to replace internal link with store link.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.replaceOriginalDoc)
          .onChange(
            (value) => (this.plugin.settings.replaceOriginalDoc = value)
          )
      );

    new Setting(imageStoreTypeDiv)
      .setName("Delete local attachments")
      .setDesc(
        "Whether to Delete local attachments after uploading is completed."
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.deleteAttachments)
          .onChange((value) => (this.plugin.settings.deleteAttachments = value))
      );

    new Setting(imageStoreTypeDiv)
      .setName("Ignore note properties")
      .setDesc(
        "Where to ignore note properties when copying to clipboard. This won't affect original note."
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.ignoreProperties)
          .onChange((value) => (this.plugin.settings.ignoreProperties = value))
      );

    new Setting(imageStoreTypeDiv).setName("Yuque").setHeading();

    new Setting(imageStoreTypeDiv).setName("Token").addText((text) =>
      text
        .setPlaceholder("Enter your Yuque Token")
        .setValue(this.plugin.settings.yuqueSetting.token)
        .onChange((value) => (this.plugin.settings.yuqueSetting.token = value))
    );

    new Setting(imageStoreTypeDiv).setName("BookSlug").addText((text) =>
      text
        .setPlaceholder("Enter your Yuque BookSlug")
        .setValue(this.plugin.settings.yuqueSetting.bookSlug)
        .onChange((value) => (this.plugin.settings.yuqueSetting.bookSlug  = value))
    );

    new Setting(imageStoreTypeDiv)
      .setName("Public Note")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.yuqueSetting.public)
          .onChange(
            (value) => (this.plugin.settings.yuqueSetting.public = value)
          )
      );
    
    new Setting(imageStoreTypeDiv).setName("Juejin").setHeading();

    new Setting(imageStoreTypeDiv).setName("Token").addText((text) =>
      text
        .setPlaceholder("Enter your Juejin Token")
        .setValue(this.plugin.settings.juejinSetting.token)
        .onChange((value) => (this.plugin.settings.juejinSetting.token = value))
    );
  
    new Setting(imageStoreTypeDiv).setName("Blog").setHeading();

    new Setting(imageStoreTypeDiv).setName("Directory").addText((text) =>
      text
        .setPlaceholder("Enter your Project Directory")
        .setValue(this.plugin.settings.blogSetting.directory)
        .onChange((value) => (this.plugin.settings.blogSetting.directory = value))
    );
    
    new Setting(imageStoreTypeDiv).setName("Image Store").setHeading();

    // Image Store
    new Setting(imageStoreTypeDiv)
      .setName("Image store")
      .setDesc("Remote image store for upload images to.")
      .addDropdown((dd) => {
        ImageStore.lists.forEach((s) => {
          dd.addOption(s.id, s.description);
        });
        dd.setValue(this.plugin.settings.imageStore);
        dd.onChange(async (v) => {
          this.plugin.settings.imageStore = v;
          this.plugin.setupImageUploader();
          await this.drawImageStoreSettings(this.imageStoreDiv);
        });
      });

    this.drawImageStoreSettings(this.imageStoreDiv)
      .then(() => {})
      .finally(() => {});
  }

  async hide(): Promise<any> {
    await this.plugin.saveSettings();
    this.plugin.setupImageUploader();
  }

  private async drawImageStoreSettings(partentEL: HTMLDivElement) {
    partentEL.empty();
    switch (this.plugin.settings.imageStore) {
      case ImageStore.IMGUR.id:
        this.drawImgurSetting(partentEL);
        break;
      case ImageStore.ALIYUN_OSS.id:
        this.drawOSSSetting(partentEL);
        break;
      case ImageStore.ImageKit.id:
        this.drawImageKitSetting(partentEL);
        break;
      default:
        throw new Error("Should not reach here!");
    }
  }

  // Imgur Setting
  private drawImgurSetting(partentEL: HTMLDivElement) {
    new Setting(partentEL)
      .setName("Client ID")
      .setDesc(PublishSettingTab.clientIdSettingDescription())
      .addText((text) =>
        text
          .setPlaceholder("Enter client_id")
          .setValue(this.plugin.settings.imgurAnonymousSetting.clientId)
          .onChange(
            (value) =>
              (this.plugin.settings.imgurAnonymousSetting.clientId = value)
          )
      );
  }

  private static clientIdSettingDescription() {
    const fragment = document.createDocumentFragment();
    const a = document.createElement("a");
    const url = "https://api.imgur.com/oauth2/addclient";
    a.textContent = url;
    a.setAttribute("href", url);
    fragment.append("Generate your own Client ID at ");
    fragment.append(a);
    return fragment;
  }

  // Aliyun OSS Setting
  private drawOSSSetting(parentEL: HTMLDivElement) {
    new Setting(parentEL)
      .setName("Region")
      .setDesc("OSS data center region.")
      .addDropdown((dropdown) =>
        dropdown
          .addOptions(RegionList)
          .setValue(this.plugin.settings.ossSetting.region)
          .onChange((value) => {
            this.plugin.settings.ossSetting.region = value;
            this.plugin.settings.ossSetting.endpoint = `https://${value}.aliyuncs.com/`;
          })
      );
    new Setting(parentEL)
      .setName("Access Key Id")
      .setDesc("The access key id of AliYun RAM.")
      .addText((text) =>
        text
          .setPlaceholder("Enter access key id")
          .setValue(this.plugin.settings.ossSetting.accessKeyId)
          .onChange(
            (value) => (this.plugin.settings.ossSetting.accessKeyId = value)
          )
      );
    new Setting(parentEL)
      .setName("Access Key Secret")
      .setDesc("The access key secret of AliYun RAM.")
      .addText((text) =>
        text
          .setPlaceholder("Enter access key secret")
          .setValue(this.plugin.settings.ossSetting.accessKeySecret)
          .onChange(
            (value) => (this.plugin.settings.ossSetting.accessKeySecret = value)
          )
      );
    new Setting(parentEL)
      .setName("Access Bucket Name")
      .setDesc("The name of bucket to store images.")
      .addText((text) =>
        text
          .setPlaceholder("Enter bucket name")
          .setValue(this.plugin.settings.ossSetting.bucket)
          .onChange((value) => (this.plugin.settings.ossSetting.bucket = value))
      );

    new Setting(parentEL)
      .setName("Target Path")
      .setDesc(
        "The path to store image.\nSupport {year} {mon} {day} {random} {filename} vars. For example, /{year}/{mon}/{day}/{filename} with uploading pic.jpg, it will store as /2023/06/08/pic.jpg."
      )
      .addText((text) =>
        text
          .setPlaceholder("Enter path")
          .setValue(this.plugin.settings.ossSetting.path)
          .onChange((value) => (this.plugin.settings.ossSetting.path = value))
      );

    //custom domain
    new Setting(parentEL)
      .setName("Custom Domain Name")
      .setDesc(
        "If the custom domain name is example.com, you can use https://example.com/pic.jpg to access pic.img."
      )
      .addText((text) =>
        text
          .setPlaceholder("Enter path")
          .setValue(this.plugin.settings.ossSetting.customDomainName)
          .onChange(
            (value) =>
              (this.plugin.settings.ossSetting.customDomainName = value)
          )
      );
  }

  private drawImageKitSetting(parentEL: HTMLDivElement) {
    new Setting(parentEL)
      .setName("Imagekit ID")
      .setDesc(PublishSettingTab.imagekitSettingDescription())
      .addText((text) =>
        text
          .setPlaceholder("Enter your ImagekitID")
          .setValue(this.plugin.settings.imagekitSetting.imagekitID)
          .onChange((value) => {
            this.plugin.settings.imagekitSetting.imagekitID = value;
            this.plugin.settings.imagekitSetting.endpoint = `https://ik.imagekit.io/${value}/`;
          })
      );

    new Setting(parentEL)
      .setName("Folder name")
      .setDesc("Please enter the directory name, otherwise leave it blank")
      .addText((text) =>
        text
          .setPlaceholder("Enter the folder name")
          .setValue(this.plugin.settings.imagekitSetting.folder)
          .onChange(
            (value) => (this.plugin.settings.imagekitSetting.folder = value)
          )
      );

    new Setting(parentEL).setName("Public Key").addText((text) =>
      text
        .setPlaceholder("Enter your Public Key")
        .setValue(this.plugin.settings.imagekitSetting.publicKey)
        .onChange(
          (value) => (this.plugin.settings.imagekitSetting.publicKey = value)
        )
    );

    new Setting(parentEL).setName("Private Key").addText((text) =>
      text
        .setPlaceholder("Enter your Private Key")
        .setValue(this.plugin.settings.imagekitSetting.privateKey)
        .onChange(
          (value) => (this.plugin.settings.imagekitSetting.privateKey = value)
        )
    );
  }

  private static imagekitSettingDescription() {
    const fragment = document.createDocumentFragment();
    const a = document.createElement("a");
    const url = "https://imagekit.io/dashboard/developer/api-keys";
    a.textContent = url;
    a.setAttribute("href", url);
    fragment.append("Obtain id and keys from ");
    fragment.append(a);
    return fragment;
  }
}
