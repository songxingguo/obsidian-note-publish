import { requestUrl } from "obsidian";

export interface WeixinSetting {
  appId: string;
  secret: string;
}

export async function getToken(
  setting: WeixinSetting,
) {
  try {
    const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${setting.appId}&secret=${setting.secret}`;
    const res = await requestUrl({
      url,
      method: "GET",
      throw: false,
      contentType: "application/json",
    });
    return res.json;
  } catch (error) {
    console.error(error);
  }
}

export async function addDoc(
  setting: WeixinSetting,
  title: string,
  content: string,
) {
  const { access_token } = await getToken(setting);
  try {
    const url = `https://api.weixin.qq.com/cgi-bin/draft/add?access_token=${access_token}`;
    const body = {
      articles: [
        {
          article_type: "news",
          title,
          content,
          thumb_media_id: "UPYHEGU9fjmaVEeTsJg2ZEKKpP2n5ogPpaicCc77IHFNL3HjNyWptHn_jpOHKIzu"
        },
      ]
    };
    const res = await requestUrl({
      url,
      method: "POST",
      throw: false,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
    return res.json;
  } catch (error) {
    console.error(error);
  }
}

export async function getDocs(setting: WeixinSetting) {
  const { access_token }= await getToken(setting);
  const body = {
    offset: 0,
    count: 10,
  };
  try {
    const url = `https://api.weixin.qq.com/cgi-bin/draft/batchget?access_token=${access_token}`;
    const res = await requestUrl({
      url,
      method: "POST",
      throw: false,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
    return res.json;
  } catch (error) {
    console.error(error);
  }
}

export async function hasDoc(setting: WeixinSetting, title: string) {
  const { item: data } = await getDocs(setting);
  const doc = data.find((item: any) => item.content.news_item[0].title === title)
  return doc;
}

export async function updateDoc(setting: WeixinSetting, title: string, content: string, id: string,) {
  try {
    const { access_token }= await getToken(setting);
    const url = `https://api.weixin.qq.com/cgi-bin/draft/update?access_token=${access_token}`;
    const body = {
      media_id: id,
      index: 1,
      articles: [
        {
          article_type: 'news',
          title,
          content,
          thumb_media_id: 'UPYHEGU9fjmaVEeTsJg2ZEKKpP2n5ogPpaicCc77IHFNL3HjNyWptHn_jpOHKIzu'
        }
      ]
    };
    const res = await requestUrl({
      url,
      method: "POST",
      throw: false,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
    return res.json;
  } catch (error) {
    console.error(error);
  }
}

export async function publishDoc(setting: WeixinSetting, id: string) {
  try {
    const { access_token }= await getToken(setting);
    const url = `https://api.weixin.qq.com/cgi-bin/freepublish/submit?access_token=${access_token}`;
    const body = {media_id: id};
    const res = await requestUrl({
      url,  
      method: "POST",
      throw: false,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
    return res.json;
  } catch (error) {
    console.error(error);
  }
}