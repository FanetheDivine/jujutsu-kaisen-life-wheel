---
name: agent-workflow
description: 当用户希望对仓库内容做变更，包括需求、缺陷、重构、测试、文档、配置等，都遵循此工作流。
---

# agent-workflow

为完成用户对仓库的变更要求，你应当按以下步骤严格串行

## 1. 创建 worktree

- 先拉取最新的 `origin/main`
- 基于 `origin/main` 创建分支与对应的 新的worktree，分支名用 <feat,fix,etc.>/<kebab-case>
- 原工作区保持干净；后续的探索、确认、编码全部在 worktree 内进行
- 在 worktree 内安装依赖

## 2. 需求分析

- 探索代码库与依赖：阅读文档、相关模块源码、测试用例，必要时用 web 搜索补充
- 与用户充分沟通，明确意图，对齐信息，消除歧义，做可行性分析，不把「不确定」「待确认」留到后续步骤
- 在以上步骤完成后，产出需求
- 需求由三部分组成：背景，目标，预期实现
- 以**文本形式**输出完整需求，由用户确认；每次需求变更都输出完整需求文本而不是diff
- 用户确认后的完整需求文本，是后续的唯一真相

## 3. checklist

- 构造两级 checklist：
  - 一级 **模块**：相对独立的需求单位；
  - 二级 **功能点**：模块内可并行执行的最小单位，
- 遵循“模块按顺序严格串行”，“模块内功能点允许并行”的原则
- 测试先行，变更业务代码时，确保测试代码可以进行验证
- 以**文本形式**输出完整checklist，由用户确认实现细节；每次checklist变更都要输出完整文本而不是diff

## 4. 执行

- 每个功能点执行结束后，简单汇报情况
- 每个模块执行结束后，根据整体需求和模块自身的复杂度，选择性地用subagent复核，并简单汇报情况
- 在一个模块执行结束后，commit

## 5. 验收

全部模块完成且自测通过（测试 / format / lint）后，在本地运行完整检查：

```sh
pnpm check   # typecheck + lint + test + build，必须全部通过
```

通过才能 push 功能分支并创建 PR：

```sh
git push -u origin <分支名>
gh pr create --repo FanetheDivine/jujutsu-kaisen-life-wheel --base main --head <分支名> --fill
```

- 本项目的 PR 只创建到 **origin** 仓库 `FanetheDivine/jujutsu-kaisen-life-wheel`，不要向 **upstream** 仓库 `Solar-CV/jujutsu-kaisen-life-wheel` 创建 PR，除非用户明确要求变更目标。
- 同时存在 fork 与 upstream 时，`gh` 可能自动选错仓库。`pr create` / `checks` / `view` / `merge` / `close` 都必须显式使用 `--repo FanetheDivine/jujutsu-kaisen-life-wheel`，不要依赖默认仓库解析。
- 确保 PR 的所有检查通过；如果没有远端检查，确认 PR 可合并且如实说明，不虚构检查记录。如果与 main 冲突，将 main merge 到新分支并解决冲突；将输出链接让用户验收。
- 遇到 `MergePullRequest` 等权限错误，先核对目标是否为 origin；不要擅自改投 upstream 或绕过权限，无法继续时告知用户。

用户验收通过后，以**压缩（squash）**方式将 PR 合并到 origin 主分支，并在主工作区拉取最新代码：

```sh
gh pr merge <PR编号> --repo FanetheDivine/jujutsu-kaisen-life-wheel --squash
git pull --ff-only origin main   # 在主工作区执行
```

- 若用户验收不通过，按情况回到 `需求分析`或`checklist`
- 如果用户放弃此功能，关闭 origin PR：

```sh
gh pr close <PR编号> --repo FanetheDivine/jujutsu-kaisen-life-wheel
```

## 6. 清理

无论第 5 步是合并 PR 还是放弃功能，都需要执行清理。确认 worktree 路径无误后，完全删除 worktree、origin 远程分支和本地分支：

```sh
git worktree remove <worktree路径>   # 在主工作区执行
git push origin --delete <分支名>
git branch -D <分支名>               # squash 合并后本地分支通常无法被 -d 识别
git worktree prune
```
