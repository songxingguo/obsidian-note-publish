import { requestUrl } from "obsidian";
export interface YuQueSetting {
  token: string;
  bookSlug: string;
  public: boolean;
}


/**
 * 添加一个新的文档到语雀知识库
 *
 * @param setting - 包含语雀设置的对象，如 bookId 和 token
 * @param title - 文档的标题
 * @param data - 文档的内容
 * @returns 如果操作成功，返回响应数据；否则返回错误信息
 */
export async function addDoc(
  setting: YuQueSetting,
  title: string,
  content: string,
  slug: string
) {
  try {
    const url = `https://www.yuque.com/api/v2/repos/${setting.bookSlug}/docs`;
    const body = {
      title,
      public: setting.public ? 1 : 0,
      format: "markdown",
      body: content,
      slug,
    };
    const res = await requestUrl({
      url,
      method: "POST",
      throw: false,
      contentType: "application/json",
      headers: {
        "X-Auth-Token": setting.token,
      },
      body: JSON.stringify(body),
    });
    return res.json;
  } catch (error) {
    console.error(error);
  }
}

/**
 * 检查给定的标题在语雀目录中是否存在
 * @param setting - 包含必要信息的配置对象
 * @param title - 要检查是否存在的文档标题
 * @returns 如果找到具有给定标题的文档，则返回 true，否则返回 false
 */
export async function hasDoc(setting: YuQueSetting, slug: string) {
  const { data } = await getToc(setting);
  const doc = data.find((item: any) => item.slug === slug);
  return doc;
}

export async function updateDoc(setting: YuQueSetting,  title: string, content: string, slug:string) {
  try {
    const url = `https://www.yuque.com/api/v2/repos/${setting.bookSlug}/docs/${slug}`;
    const body = {
      title,
      public: setting.public ? 1 : 0,
      format: "markdown",
      body: content,
    };
    const res = await requestUrl({
      url,
      method: "PUT",
      throw: false,
      contentType: "application/json",
      headers: {
        "X-Auth-Token": setting.token,
      },
      body: JSON.stringify(body),
    });
    return res.json;
  } catch (error) {
    console.error(error);
  }
}


export async function getToc(
  setting: YuQueSetting,
) {
  const url = `https://www.yuque.com/api/v2/repos/${setting.bookSlug}/toc`;
  try {
    const res = await requestUrl({
      url,
      method: "GET",
      throw: false,
      contentType: "application/json",
      headers: {
        "X-Auth-Token": setting.token,
      },
    });
    return res.json;
  } catch (error) {
    console.error(error);
  }
}


export async function updateToc(  setting: YuQueSetting, uuid: string, docId: number) {
  const url = `https://www.yuque.com/api/v2/repos/${setting.bookSlug}/toc`;
  const body = {
    action: "appendNode",
    action_mode: "child",
    target_uuid:uuid,
    doc_ids: [docId],
  };
  try {
    const res = await requestUrl({
      url,
      method: "PUT",
      throw: false,
      contentType: "application/json",
      headers: {
        "X-Auth-Token": setting.token,
      },
      body: JSON.stringify(body),
    });
    return res;
  } catch (error) {
    console.error(error);
  }
}