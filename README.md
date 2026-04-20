# Jackywine Prompt Library

把个人常用提示词整理成一个静态前端网页，支持：

- 分类浏览
- 全文搜索
- 查看完整提示词
- 一键复制
- 直接部署到 GitHub Pages

## 内容结构

站点把提示词整理为 6 个维度：

- 提问与思考框架
- 研究与分析
- 写作与表达
- 学习与阅读
- 视觉生成与演示
- AI 系统与工作流

## 本地使用

1. 生成数据文件：

```bash
PROMPT_SOURCE_DIR="/path/to/your/obsidian-vault" python3 scripts/build_data.py
```

2. 启动静态服务：

```bash
python3 -m http.server 8000
```

3. 打开 `http://localhost:8000`

默认情况下，仓库已经包含生成好的 `data/prompts.js`，直接部署即可。如果你要替换成自己的 Markdown 库，再运行上面的命令。

## 开源说明

仓库默认适合直接发布为公开仓库。如果后续你想继续维护，建议把新增提示词先补到原始 Markdown，再重新运行一次数据生成脚本。
