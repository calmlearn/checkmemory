# 记忆知识点网站 - 项目规范

> 本项目面向非技术用户，所有注释、沟通均使用中文。

---

## 📁 项目文件结构

```
checkmemory/
├── CLAUDE.md              # 本文件 - 项目规范和指引
├── docs/                  # 项目文档
│   ├── requirements.md    # 需求文档
│   └── architecture.md    # 架构设计文档
├── dev-logs/              # 开发日志（按日期记录）
│   └── YYYY-MM-DD.md
│
├── src/                   # 源代码
│   ├── app/               # Next.js App Router 页面
│   │   ├── page.tsx       # 首页
│   │   ├── layout.tsx     # 全局布局
│   │   ├── quiz/page.tsx  # 测验页
│   │   ├── statistics/page.tsx  # 统计页
│   │   └── api/extract/route.ts # AI提取API
│   ├── components/        # UI 组件
│   │   ├── ui/            # shadcn/ui 组件
│   │   ├── FileUpload.tsx
│   │   ├── QuestionCard.tsx
│   │   ├── QuizMode.tsx
│   │   └── Navbar.tsx
│   ├── lib/               # 工具函数
│   │   ├── db.ts          # IndexedDB 操作
│   │   ├── file-parser.ts # 文件解析
│   │   └── ai-extract.ts  # Claude API 调用
│   └── types/index.ts     # 类型定义
```

---

## 📋 开发规范

### 开发流程
1. 每次开发前先读取 `docs/` 下的相关文档了解需求
2. 在 `dev-logs/` 中记录当天的开发日志
3. 每完成一个阶段更新 `dev-logs` 的进度
4. 在 `docs/` 文件末尾添加备注（如需更新需求或架构）

### 开发日志格式 (`dev-logs/YYYY-MM-DD.md`)
```markdown
# YYYY-MM-DD 开发日志

## 今日目标
- [ ] 目标1
- [ ] 目标2

## 完成内容
- xxx

## 遇到的问题
- xxx

## 下一步
- xxx
```

### 代码规范
- 使用 TypeScript 严格模式
- 组件使用箭头函数 + export default
- 样式使用 Tailwind CSS
- 代码注释使用中文
- 用户可见的文本全部使用中文

### 工作说明
- **存档**: 每次有重大进展时，在 `dev-logs/` 记录存档点
- **需求变更**: 先在 `docs/requirements.md` 更新需求，再在 `docs/architecture.md` 更新架构
- **测试**: 每次修改后运行 `npm run dev` 本地验证
- **部署**: 部署到 Vercel，环境变量在 Vercel 项目设置中配置

---

## 🔧 技术栈

| 用途 | 技术 |
|------|------|
| 框架 | Next.js (App Router) |
| 语言 | TypeScript |
| 样式 | Tailwind CSS |
| UI 组件 | shadcn/ui |
| 本地存储 | Dexie.js (IndexedDB) |
| 文件解析 | pdf.js / mammoth / pptx-parser |
| AI API | Claude API (Anthropic) |
| 部署 | Vercel |

---

## 🚀 开发阶段

详见 `docs/requirements.md` 和项目根目录的 plan 文件。
