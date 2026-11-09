# AGENTS.md

和用户交互时优先使用 `ask_user_question`。

## 项目梗概

这是《咒术回战》同人向人生抽选器：数十轮因果轮盘实时改写后续权重，支持动态轮次、事件战、宿傩二番战，明暗主题自动跟随系统。

- 技术栈：pnpm、Vite、React 19、严格 TypeScript、Tailwind CSS v4、Zustand、Vitest、ESLint、Prettier、vite-plugin-pwa。
- 当前玩法版本：`v6.0`。迁移构建工具不等于升级玩法版本。
- 纯静态前端，无后端；生产产物是 `dist/`，可部署到 GitHub Pages 项目子目录。
- 仓库变更遵循 `.agents/skills/agent-workflow/SKILL.md`：独立 worktree、需求与 checklist 确认、按模块提交、完整检查后 PR，用户验收通过才 squash 合并。

## 目录与职责

| 路径                           | 职责                                                              |
| ------------------------------ | ----------------------------------------------------------------- |
| `index.html`                   | 文档元信息、PWA 图标与 React `#root` 挂载点                       |
| `src/main.tsx`                 | React 挂载、初始流程、样式和 Service Worker 注册                  |
| `src/App.tsx`                  | 页面布局与组件组合                                                |
| `src/components/`              | React 组件、基础 UI 与组件专属 CSS Modules                        |
| `src/game/`                    | 轮盘配置、因果规则、动态流程与战斗；不得依赖 React                |
| `src/store/`                   | Zustand vanilla store 与 React 绑定；界面状态的唯一来源           |
| `src/lib/`                     | 类名合并等辅助函数                                                |
| `src/index.css`                | Tailwind 令牌、明暗主题变量、断点；不新增自定义 `@layer`          |
| `src/random.ts`                | `mulberry32` 与 `seedOf`，保证相同输入的确定性                    |
| `public/`                      | PWA 图标和旧地址兼容跳转页，不存放业务逻辑                        |
| `tests/`                       | Vitest 纯逻辑单元测试与生产产物校验测试，不渲染组件或读取页面 DOM |
| `scripts/verify-dist.mjs`      | 校验 Manifest、Service Worker、图标、预缓存与旧地址跳转           |
| `vite.config.ts`               | 相对部署路径、Vitest、Manifest 与 Workbox 配置                    |
| `.github/workflows/ci.yml`     | PR、main 推送与手动触发的完整检查                                 |
| `.github/workflows/deploy.yml` | `v*` 标签推送或手动触发时检查、构建并发布 GitHub Pages            |

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

1. **保持玩法兼容**：除非用户明确要求，不改变界面、概率、规则顺序、动态插轮或战斗结算。
2. **严格类型**：不得用 `ts-nocheck`、`ts-ignore` 或 `any` 规避迁移与修复；优先补全类型模型和运行时收窄。
3. **测试先行**：变更业务规则前先增加能验证行为的纯逻辑测试。测试不得依赖 React 渲染、`index.html` 或页面 DOM。
4. **React 与状态约定**：业务状态统一放在 Zustand；组件不得恢复命令式 DOM 模板或在渲染期写 store。可复用样式写成组件并使用 Tailwind，组件专属效果使用同名 CSS Module，不新增自定义 `@layer`。
5. **版本一致**：玩法变更时同步 `VERSION` / `VERSION_DATE` / `VERSION_NOTE` 与页面展示；纯工程迁移保留 `v6.0`。
6. **旧地址只兼容**：`public/jujutsu-life-wheel.html` 必须保持轻量跳转，不能把旧单文件业务代码加回来。
7. **相对部署路径**：保持 `base: './'` 和 Manifest 的相对 `start_url` / `scope`，避免破坏 GitHub Pages 子目录部署。
8. **PWA 缓存边界**：只预缓存同源静态资源，不缓存或代理外部请求。新增本地资源后检查 `dist/manifest.webmanifest`、`dist/sw.js`、图标和预缓存清单，避免重复 URL。
9. **PWA 更新策略**：保持自动更新；修改注册或 Workbox 配置后，使用 production preview 验证首次联网加载、离线重开和更新行为，不能只看 dev 模式。
10. **隐私与秘密**：不收集、不上传密钥或个人信息，不新增外发请求。
11. **生成物不入库**：不要提交 `node_modules/`、`dist/`、`dev-dist/` 或 `coverage/`。

## 验收与交付

- 所有模块完成后运行 `pnpm check`，并审查最终差异。
- PWA 或部署相关变更还需验证生产构建中的 Manifest、Service Worker、普通 / maskable 图标、旧地址跳转与离线能力。
- 功能分支只推送到 `origin`。PR 只创建到 origin 仓库 `FanetheDivine/jujutsu-kaisen-life-wheel`，不要向 `upstream` 仓库 `Solar-CV/jujutsu-kaisen-life-wheel` 创建 PR，除非用户明确要求变更目标。
- `gh` 在同时存在 fork 与 upstream 时可能自动选错仓库。`pr create` / `checks` / `view` / `merge` / `close` 都必须显式添加 `--repo FanetheDivine/jujutsu-kaisen-life-wheel`，不要依赖默认仓库解析。
- 确认 PR 检查通过后把链接交给用户验收；若没有远端检查，应确认 PR 可合并且如实说明，不得虚构检查记录。
- 用户验收通过后才 squash 合并；若验收不通过，回到需求或 checklist，而不是直接合并。遇到 `MergePullRequest` 权限错误时先核对目标是否为 origin，不擅自改投 upstream 或绕过权限。
- 合并后在主工作区执行 `git pull --ff-only origin main`，再删除功能 worktree、origin 远程分支与本地分支。

## 发布（Release）

发布 = 在 `main` 上创建 `vX.Y.Z` 标签并推送，由 `.github/workflows/deploy.yml` 自动检查、构建并发布到 GitHub Pages（https://fanethedivine.github.io/jujutsu-kaisen-life-wheel/）。`main` 的普通推送只跑 CI，**不会**部署；标签才是部署触发器。

### 两套版本号

| 版本     | 位置                                                                 | 何时改                     |
| -------- | -------------------------------------------------------------------- | -------------------------- |
| 应用版本 | `package.json` 的 `version` + git 标签 `vX.Y.Z`                      | 每次发布                   |
| 玩法版本 | `src/game/version.ts` 的 `VERSION` / `VERSION_DATE` / `VERSION_NOTE` | 仅玩法变更（见修改约束 5） |

页面标题旁显示的是玩法版本，不是应用版本，两者不必一致。应用版本按语义化版本升位：新增功能 `minor`、修复 `patch`、破坏性玩法变更 `major`。

### 标准流程

```sh
# 1. 确认起点：main 干净、与 origin/main 一致、最新 CI 通过
git status --porcelain                                  # 应无输出
git fetch origin --prune
git rev-list --left-right --count origin/main...HEAD    # 应为 0  0

# 2. 升版本：自动改 package.json、生成提交 "X.Y.Z"、打附注标签 vX.Y.Z
pnpm version patch                                      # 或 minor / major

# 3. 推送提交与标签（标签触发部署）
git push origin main --follow-tags

# 4. 观察部署
gh run list --repo FanetheDivine/jujutsu-kaisen-life-wheel --limit 5
gh run watch <run-id> --repo FanetheDivine/jujutsu-kaisen-life-wheel --exit-status
```

- 发布前先确认所有功能 PR 已合并到 `main` 且 CI 通过，因为 Deploy 构建的就是标签指向的那个提交。
- 必须用 `--follow-tags`（或 `git push origin main vX.Y.Z`）显式推标签；只推 `main` 不会部署。
- `pnpm version` 自己会提交并打标签，不要再手动补提交或补标签。
- Deploy 工作流内部会跑完整 `pnpm check`，不通过就不会发布。

### 部署后验证

```sh
base=https://fanethedivine.github.io/jujutsu-kaisen-life-wheel
curl -sSI "$base/" | head -1                                    # 200
curl -sS "$base/" | grep -oE 'assets/index-[^"]+\.js'           # 资源名应与本次构建一致
curl -sS -o /dev/null -w '%{http_code}\n' "$base/manifest.webmanifest"
curl -sS -o /dev/null -w '%{http_code}\n' "$base/sw.js"
curl -sS -o /dev/null -w '%{http_code}\n' "$base/jujutsu-life-wheel.html"   # 旧地址跳转页
```

- 用 `gh api repos/FanetheDivine/jujutsu-kaisen-life-wheel/actions/runs/<run-id> --jq .head_sha` 核对部署的正是本次提交。
- Pages 首次启用需在 Settings → Pages 把 Source 设为 GitHub Actions；当前仓库已是 `build_type: workflow`。

### 重发与回滚

- 只重发当前 `main`（不动版本号）：`gh workflow run deploy.yml --repo FanetheDivine/jujutsu-kaisen-life-wheel`。
- 标签已存在时无法在同一提交重复创建；需要重发用 `workflow_dispatch`，或先删远程标签再重建：`git push origin --delete vX.Y.Z`。
- 回滚线上：从目标提交重新打标签并强制推送标签（`git tag -f vX.Y.Z <sha>` + `git push origin -f vX.Y.Z`），不要改写 `main` 历史。
- 发布只走「标签 → Deploy 工作流」；不要用 `sync.sh` 直推 `main` 代替发布。
