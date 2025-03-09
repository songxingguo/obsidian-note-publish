import mdnice from '@mdnice/wechat';

const markdown = `# 标题\n\`\`\`javascript\nconsole.log("Hello")\n\`\`\``;
const options = { theme: 'wechat' }; // 主题可选 'wechat'、'zhihu' 等

// 转换并获取 HTML
mdnice.transform(markdown, options).then(html => {
  console.log(html); // 直接复制到微信编辑器
});