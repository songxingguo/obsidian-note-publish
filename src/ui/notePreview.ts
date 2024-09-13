import { ItemView, Workspace, WorkspaceLeaf } from 'obsidian';
import { PublishSettings } from '../publish';
import YuqueProcessor, {ACTION_PUBLISH, ACTION_COPY} from "./../transformers/yuqueProcessor";
import BlogProcessor, { ACTION_CREATE } from "./../transformers/blogProcessor";
import * as YuQue from './../api/yuque';

export const VIEW_TYPE_NOTE_PREVIEW = 'note-preview';
export class NotePreview extends ItemView {
    workspace: Workspace;
    settings: PublishSettings;
    mainDiv: HTMLDivElement;
    toolbar: HTMLDivElement;
    styleEl: HTMLElement;
    container: Element;
    title: string;
    currentUuid: string;
    yuqueProcessor: YuqueProcessor;
    blogProcessor: BlogProcessor;
    constructor(leaf: WorkspaceLeaf,  settings: PublishSettings, yuqueProcessor:YuqueProcessor, blogProcessor:BlogProcessor) {
        super(leaf);
        this.workspace = this.app.workspace;
        this.settings = settings;
        this.yuqueProcessor = yuqueProcessor;
        this.blogProcessor = blogProcessor;
    }

    getViewType() {
        return VIEW_TYPE_NOTE_PREVIEW;
    }

    getIcon() {
        return 'clipboard-paste';
    }

    getDisplayText() {
        return '笔记预览';
    }

    async onOpen() {
        this.buildUI();
    }

    async onClose() {
    }

   async postArticle () {
      await this.yuqueProcessor.process(ACTION_PUBLISH, {uuid: this.currentUuid});
    }

    async copyArticle () {
      await this.yuqueProcessor.process(ACTION_COPY, {uuid: this.currentUuid});
    }

    async copyBlogArticle () {
      await this.blogProcessor.process(ACTION_COPY, {uuid: this.currentUuid});
    }

    addSection (el:any, options:Array<any>, value?: any) {
        for (let s of options) {
          const op = el.createEl('option');
          op.value = s.uuid;
          op.text = s.title;
          op.selected = s.value == value;
      }
    }

    async postArticleToBlog () {
      await this.blogProcessor.process(ACTION_PUBLISH);
    }

    async ceatedBlogArticle () {
      await this.blogProcessor.process(ACTION_CREATE);
    }

    async buildToolbar(parent: HTMLDivElement) {
        this.toolbar = parent.createDiv({ cls: 'preview-toolbar' });

        let lineDiv = this.toolbar.createDiv({ cls: 'toolbar-line' });

        lineDiv.createDiv({ cls: 'style-label' }).innerText = '知识库目录（默认第一个）:';
        const tocSelect = lineDiv.createEl('select', { cls: 'style-select' })
        tocSelect.setAttr('style', 'width: 200px');
        tocSelect.onchange = async () => {
            this.currentUuid = tocSelect.value;
        }
        const res = await YuQue.getToc(this.settings.yuqueSetting);
        const data = res.data.filter((item: any) => item.level == 0);
        this.addSection(tocSelect, data, data[0].uuid);
    
        // 复制，刷新，带图片复制，发草稿箱
        lineDiv = this.toolbar.createDiv({ cls: 'toolbar-line' });
        const copyBtn = lineDiv.createEl('button', { cls: 'copy-button' }, async (button) => {
            button.setText('复制');
        })

        copyBtn.onclick = async() => {
            await this.copyArticle();
        }

        const postBtn = lineDiv.createEl('button', { cls: 'copy-button' }, async (button) => {
            button.setText('发布到语雀');
        })

        postBtn. onclick= async() => {
            await this.postArticle();
        }

        this.toolbar = parent.createDiv({ cls: 'preview-toolbar' });

        let blogLineDiv = this.toolbar.createDiv({ cls: 'toolbar-line' });

        const blogCopyBtn = blogLineDiv.createEl('button', { cls: 'copy-button' }, async (button) => {
          button.setText('复制');
        })

        blogCopyBtn.onclick = async() => {
          await this.copyBlogArticle();
        }

        const createBlogBtn = blogLineDiv.createEl('button', { cls: 'copy-button' }, async (button) => {
          button.setText('创建/更新博客');
        })

        createBlogBtn.onclick= async() => {
          await this.ceatedBlogArticle();
        }

        const postBtnToBlog = blogLineDiv.createEl('button', { cls: 'copy-button' }, async (button) => {
          button.setText('发布到博客');
        })

        postBtnToBlog.onclick= async() => {
          await this.postArticleToBlog();
        }
    }

    async buildUI() {
        this.container = this.containerEl.children[1];
        this.container.empty();

        this.mainDiv = this.container.createDiv({ cls: 'note-preview' });

        this.buildToolbar(this.mainDiv);
    }

}