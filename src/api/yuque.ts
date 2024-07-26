import { requestUrl } from "obsidian";
export interface YuQueSetting {
  token: string;
  bookId: string;
  public: boolean;
}

export async function addDoc(
  setting: YuQueSetting,
  title: string,
  data: string
) {
  const url = `https://www.yuque.com/api/v2/repos/${setting.bookId}/docs`;
  const body = {
    title,
    public: setting.public ? 1 : 0,
    format: "markdown",
    body: data,
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
  return res;
}
