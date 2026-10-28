# AGENTS.md

和用户交互时优先使用 `ask_user_question`。

## 项目梗概

这是《咒术回战》同人向人生抽选器：数十轮因果轮盘实时改写后续权重，支持动态轮次、事件战、宿傩二番战、终局档案导出，以及用户自填 OpenAI 兼容 API 生成故事。

- 技术栈：pnpm、Vite、原生 TypeScript、直接 DOM 渲染、Vitest、ESLint、Prettier、vite-plugin-pwa。
- 当前玩法版本：`v6.0`。迁移构建工具不等于升级玩法版本。
- 纯静态前端，无后端；生产产物是 `dist/`，可部署到 GitHub Pages 项目子目录。
- 仓库变更遵循 `.agents/skills/agent-workflow/SKILL.md`：独立 worktree、需求与 checklist 确认、按模块提交、完整检查后 PR，用户验收通过才 squash 合并。

## 目录与职责

| 路径                           | 职责                                                                       |
| ------------------------------ | -------------------------------------------------------------------------- |
| `index.html`                   | 页面语义结构与 Vite 入口；保留现有 DOM id                                  |
| `src/main.ts`                  | 组合样式、应用和 Service Worker 注册                                       |
| `src/app.ts`                   | 轮盘配置、因果规则、动态流程、战斗、渲染、导出和 API；当前核心业务集中于此 |
| `src/types.ts`                 | 轮次、选项、记录、战斗、状态等类型                                         |
| `src/random.ts`                | `mulberry32` 与 `seedOf`，保证相同输入的确定性                             |
| `src/styles.css`               | 浅色 / 深色主题、响应式布局、动效及 reduced-motion 适配                    |
| `public/`                      | PWA 图标和旧地址兼容跳转页，不存放业务逻辑                                 |
| `tests/`                       | Vitest 单元、DOM 回归与生产产物校验测试                                    |
| `scripts/verify-dist.mjs`      | 校验 Manifest、Service Worker、图标、预缓存与旧地址跳转                    |
| `vite.config.ts`               | 相对部署路径、Vitest、Manifest 与 Workbox 配置                             |
| `.github/workflows/ci.yml`     | PR、main 推送与手动触发的完整检查                                          |
| `.github/workflows/deploy.yml` | `v*` 标签推送或手动触发时检查、构建并发布 GitHub Pages                     |

## 常用命令

```sh
pnpm install
pnpm dev
pnpm test
pnpm typecheck
pnpm lint
pnpm format
pnpm build
pnpm verify:dist
pnpm preview
pnpm check
```

提交前必须运行 `pnpm check`，它依次执行格式检查、类型检查、lint、测试、生产构建和产物校验。不要使用旧的 `sync.sh` 直推 main 来代替分支与 PR 工作流。

## 修改约束

1. **保持玩法兼容**：除非用户明确要求，不改变界面、概率、规则顺序、动态插轮、战斗结算、导出结构或 API 行为。
2. **严格类型**：不得用 `ts-nocheck`、`ts-ignore` 或 `any` 规避迁移与修复；优先补全类型模型和运行时收窄。
3. **测试先行**：变更业务规则前先增加能验证行为的测试。修改 DOM 初始化、跳过、重开等交互时保留现有回归场景。
4. **直接 DOM 约定**：`src/app.ts` 依赖 `index.html` 中既有 id 与结构；重命名或删除元素时同步更新查询和测试。不要擅自引入 UI 框架。
5. **版本一致**：玩法变更时同步 `VERSION` / `VERSION_DATE` / `VERSION_NOTE`、页面展示与导出信息；纯工程迁移保留 `v6.0`。
6. **旧地址只兼容**：`public/jujutsu-life-wheel.html` 必须保持轻量跳转，不能把旧单文件业务代码加回来。
7. **相对部署路径**：保持 `base: './'` 和 Manifest 的相对 `start_url` / `scope`，避免破坏 GitHub Pages 子目录部署。
8. **PWA 缓存边界**：只预缓存同源静态资源，不缓存或代理模型 API。新增本地资源后检查 `dist/manifest.webmanifest`、`dist/sw.js`、图标和预缓存清单，避免重复 URL。
9. **PWA 更新策略**：保持自动更新；修改注册或 Workbox 配置后，使用 production preview 验证首次联网加载、离线重开和更新行为，不能只看 dev 模式。
10. **隐私与秘密**：API 配置继续使用本机 `localStorage` 的 `jjkwheel` 项，不提交真实 API Key，不新增收集密钥的服务。
11. **生成物不入库**：不要提交 `node_modules/`、`dist/`、`dev-dist/` 或 `coverage/`。

## 验收与交付

- 所有模块完成后运行 `pnpm check`，并审查最终差异。
- PWA 或部署相关变更还需验证生产构建中的 Manifest、Service Worker、普通 / maskable 图标、旧地址跳转与离线能力。
- 功能分支只推送到 `origin`。PR 只创建到 origin 仓库 `FanetheDivine/jujutsu-kaisen-life-wheel`，不要向 `upstream` 仓库 `Solar-CV/jujutsu-kaisen-life-wheel` 创建 PR，除非用户明确要求变更目标。
- `gh` 在同时存在 fork 与 upstream 时可能自动选错仓库。`pr create` / `checks` / `view` / `merge` / `close` 都必须显式添加 `--repo FanetheDivine/jujutsu-kaisen-life-wheel`，不要依赖默认仓库解析。
- 确认 PR 检查通过后把链接交给用户验收；若没有远端检查，应确认 PR 可合并且如实说明，不得虚构检查记录。
- 用户验收通过后才 squash 合并；若验收不通过，回到需求或 checklist，而不是直接合并。遇到 `MergePullRequest` 权限错误时先核对目标是否为 origin，不擅自改投 upstream 或绕过权限。
- 合并后在主工作区执行 `git pull --ff-only origin main`，再删除功能 worktree、origin 远程分支与本地分支。
