import { requestUrl } from "obsidian";

export interface JueJinSetting {
  token: string;
}

export async function addDoc(
  setting: JueJinSetting,
  title: string,
  content: string,
) {
  try {
    const url = `https://api.juejin.cn/content_api/v1/article_draft/create`;
    const body = {
      title,
      edit_type: 10,
      category_id: "0",
      tag_ids: [],
      mark_content: content
    };
    const res = await requestUrl({
      url,
      method: "POST",
      throw: false,
      contentType: "application/json",
      headers: {
        'cookie': setting.token, 
      },
      body: JSON.stringify(body),
    });
    return res.json;
  } catch (error) {
    console.error(error);
  }
}

export async function getDocs(setting: JueJinSetting) {
  try {
    const url = `https://api.juejin.cn/content_api/v1/article_draft/query_list`;
    const res = await requestUrl({
      url,
      method: "POST",
      throw: false,
      headers: {
        'cookie': setting.token,
      },
    });
    return res.json;
  } catch (error) {
    console.error(error);
  }
}

export async function hasDoc(setting: JueJinSetting, title: string) {
  const { data } = await getDocs(setting);
  const doc = data.find((item: any) => item.title === title);
  return doc;
}

export async function updateDoc(setting: JueJinSetting, title: string, content: string, id: string,) {
  try {
    const url = `https://api.juejin.cn/content_api/v1/article_draft/update`;
    const body = {
      id,
      title,
      edit_type: 10,
      category_id: "0",
      tag_ids: [],
      mark_content: content
    };
    const res = await requestUrl({
      url,
      method: "POST",
      throw: false,
      contentType: "application/json",
      headers: {
        'cookie': setting.token, 
      },
      body: JSON.stringify(body),
    });
    return res.json;
  } catch (error) {
    console.error(error);
  }
}

export async function publishDoc(setting: JueJinSetting, id: string) {
  try {
    const url = `https://api.juejin.cn/content_api/v1/article/publish`;
    const body = {
      draft_id: id,
    };
    const res = await requestUrl({
      url,  
      method: "POST",
      throw: false,
      contentType: "application/json",
      headers: {
        'cookie': setting.token, 
      },
      body: JSON.stringify(body),
    });
    return res.json;
  } catch (error) {
    console.error(error);
  }
}