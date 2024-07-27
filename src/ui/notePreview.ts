import { EventRef, ItemView, Workspace, WorkspaceLeaf, Notice, sanitizeHTMLToDom } from 'obsidian';
import { PublishSettings } from '../publish';
import YuqueProcessor, {ACTION_PUBLISH, ACTION_COPY} from "./../transformers/yuqueProcessor";
import * as YuQue from './../api/yuque';

export const VIEW_TYPE_NOTE_PREVIEW = 'note-preview';

export class NotePreview extends ItemView {
    workspace: Workspace;
    settings: PublishSettings;
    mainDiv: HTMLDivElement;
    toolbar: HTMLDivElement;
    renderDiv: HTMLDivElement;
    articleDiv: HTMLDivElement;
    styleEl: HTMLElement;
    coverEl: HTMLInputElement;
    useDefaultCover: HTMLInputElement;
    useLocalCover: HTMLInputElement;
    msgView: HTMLDivElement;
    listeners: EventRef[];
    container: Element;
    articleHTML: string;
    title: string;
    currentTheme: string;
    currentHighlight: string;
    currentUuid: string;
    yuqueProcessor: YuqueProcessor;
    constructor(leaf: WorkspaceLeaf,  settings: PublishSettings, yuqueProcessor:YuqueProcessor) {
        super(leaf);
        this.workspace = this.app.workspace;
        this.settings = settings;
        this.yuqueProcessor = yuqueProcessor;
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
        // this.listeners.forEach(listener => this.workspace.offref(listener));
    }


    getArticleSection() {
        return this.articleDiv.querySelector('#article-section') as HTMLElement;
    }

    getArticleContent() {
        const content = this.articleDiv.innerHTML;
        return content;
    }

    buildMsgView(parent: HTMLDivElement) {
        this.msgView = parent.createDiv({ cls: 'msg-view' });
        const title = this.msgView.createDiv({ cls: 'msg-title' });
        title.id = 'msg-title';
        title.innerText = '加载中...';
        const okBtn = this.msgView.createEl('button', { cls: 'msg-ok-btn' }, async (button) => {
            
        });
        okBtn.id = 'msg-ok-btn';
        okBtn.innerText = '确定';
        okBtn.onclick = async () => {
            this.msgView.setAttr('style', 'display: none;');
        }
    }

    showLoading(msg: string) {
        const title = this.msgView.querySelector('#msg-title') as HTMLElement;
        title!.innerText = msg;
        const btn = this.msgView.querySelector('#msg-ok-btn') as HTMLElement;
        btn.setAttr('style', 'display: none;');
        this.msgView.setAttr('style', 'display: flex;');
    }

    showMsg(msg: string) {
        const title = this.msgView.querySelector('#msg-title') as HTMLElement;
        title!.innerText = msg;
        const btn = this.msgView.querySelector('#msg-ok-btn') as HTMLElement;
        btn.setAttr('style', 'display: block;');
        this.msgView.setAttr('style', 'display: flex;');
    }

   async postArticle () {
      await this.yuqueProcessor.process(ACTION_PUBLISH, {uuid: this.currentUuid});
    }

    async copyArticle () {
      await this.yuqueProcessor.process(ACTION_COPY, {uuid: this.currentUuid});
    }

    addSection (el:any, options:Array<any>, value?: any) {
        for (let s of options) {
          const op = el.createEl('option');
          op.value = s.uuid;
          op.text = s.title;
          op.selected = s.value == value;
      }
    }

    async buildToolbar(parent: HTMLDivElement) {
        this.toolbar = parent.createDiv({ cls: 'preview-toolbar' });

        let lineDiv = this.toolbar.createDiv({ cls: 'toolbar-line' });

        // 公众号
        lineDiv.createDiv({ cls: 'style-label' }).innerText = '目录:';
        const tocSelect = lineDiv.createEl('select', { cls: 'style-select' })
        tocSelect.setAttr('style', 'width: 200px');
        tocSelect.onchange = async () => {
            this.currentUuid = tocSelect.value;
        }

        const res  = await YuQue.getToc(this.settings.yuqueSetting)

        this.addSection(tocSelect, res.data)
    
        // 复制，刷新，带图片复制，发草稿箱
        lineDiv = this.toolbar.createDiv({ cls: 'toolbar-line' });
        const copyBtn = lineDiv.createEl('button', { cls: 'copy-button' }, async (button) => {
            button.setText('复制');
        })

        copyBtn.onclick = async() => {
            await this.copyArticle();
        }

        const postBtn = lineDiv.createEl('button', { cls: 'copy-button' }, async (button) => {
            button.setText('发草稿');
        })

        postBtn. onclick= async() => {
            await this.postArticle();
        }

        // 封面
        lineDiv = this.toolbar.createDiv({ cls: 'toolbar-line' }); 

        const coverTitle = lineDiv.createDiv({ cls: 'style-label' });
        coverTitle.innerText = '封面:';

        this.useDefaultCover = lineDiv.createEl('input', { cls: 'input-style' });
        this.useDefaultCover.setAttr('type', 'radio');
        this.useDefaultCover.setAttr('name', 'cover');
        this.useDefaultCover.setAttr('value', 'default');
        this.useDefaultCover.setAttr('checked', true);
        this.useDefaultCover.id = 'default-cover';
        this.useDefaultCover.onchange = async () => {
            if (this.useDefaultCover.checked) {
                this.coverEl.setAttr('style', 'visibility:hidden;width:0px;');
            }
            else {
                this.coverEl.setAttr('style', 'visibility:visible;width:180px;');
            }
        }
        const defaultLable = lineDiv.createEl('label');
        defaultLable.innerText = '默认';
        defaultLable.setAttr('for', 'default-cover');

        this.useLocalCover = lineDiv.createEl('input', { cls: 'input-style' });
        this.useLocalCover.setAttr('type', 'radio');
        this.useLocalCover.setAttr('name', 'cover');
        this.useLocalCover.setAttr('value', 'local');
        this.useLocalCover.id = 'local-cover';
        this.useLocalCover.setAttr('style', 'margin-left:20px;');
        this.useLocalCover.onchange = async () => {
            if (this.useLocalCover.checked) {
                this.coverEl.setAttr('style', 'visibility:visible;width:180px;');
            }
            else {
                this.coverEl.setAttr('style', 'visibility:hidden;width:0px;');
            }
        }

        const localLabel = lineDiv.createEl('label');
        localLabel.setAttr('for', 'local-cover');
        localLabel.innerText = '上传';

        this.coverEl = lineDiv.createEl('input', { cls: 'upload-input' });
        this.coverEl.setAttr('type', 'file');
        this.coverEl.setAttr('placeholder', '封面图片');
        this.coverEl.setAttr('accept', '.png, .jpg, .jpeg');
        this.coverEl.setAttr('name', 'cover');
        this.coverEl.id = 'cover-input';

        this.buildMsgView(this.toolbar);
    }

    async buildUI() {
        this.container = this.containerEl.children[1];
        this.container.empty();

        this.mainDiv = this.container.createDiv({ cls: 'note-preview' });

        this.buildToolbar(this.mainDiv);
    }
}