# Gemini 前端改造执行文档

> 目标：用 `docs/api.md` 的接口替换本地 mock 数据，实现生活日记 + 系统管理的完整前端逻辑。

## 0. 环境与约定
- 基于现有 Next.js 16 App Router。所有修改位于 `akira-app`。
- 在提交前必须通过 `pnpm lint` 与 `pnpm run build`。
- 仍使用 `SessionProvider`（localStorage）存 session；API 写操作需要将 `authorId`、`reviewerId`、`actorRole` 等字段放在请求体中。
- 每个 API 请求只调用 `/api/...`，无需额外 Base URL。

## 1. 数据访问封装
1. 新建 `src/lib/api.ts`（或 `hooks/useApi.ts`），封装以下函数：
   - 卡片：`fetchCards()`、`createCard(payload)`、`updateCard(cardId, payload)`、`deleteCard(cardId)`。
   - 日记：`fetchJournal({ limit, cursor })`、`createJournal(payload)`、`updateJournal(id, payload)`、`deleteJournal(id, payload)`。
   - 点赞：`likeJournal(postId, userId)`、`unlikeJournal(postId, userId)`。
   - 评论：`fetchComments(postId)`、`createComment(postId, payload)`、`deleteComment(postId, commentId, payload)`。
   - 审核：`fetchApprovals({ status, limit })`、`reviewApproval(id, payload)`。
2. 所有函数：
   - 使用 `fetch`，默认 `Content-Type: application/json`。
   - `response.ok` 为 false 时抛出 `Error`（message 来自返回 body 的 `error` 或默认提示）。
   - 返回 `{ data, error }` 或直接返回解析后的 `data`（保持统一）。

## 2. 首页卡片与导航（`AkiraShell`）
1. **加载卡片**：
   - 移除 `portalCards/navSections/cardInsights` 的 mock 数据，在 `AkiraShell` 中 `useEffect` 调用 `fetchCards()`。
   - 按 `orderIndex` 排序，并根据 `sessionUser.role` 过滤 `isAdminOnly`。
   - 导航分组可继续沿用 mock 的结构，但卡片数据来自接口（例如 slug 为 `life-journal` 的卡片归类到“常驻模块”）。
2. **系统设置卡片**：
   - 仅管理员可见，点击后打开 Drawer/Sheet：
     - 列出所有卡片，允许编辑 `title/description/orderIndex/isAdminOnly`、背景等字段。
     - 保存调用 `updateCard`，新增调用 `createCard`，删除调用 `deleteCard`。
   - 修改成功后刷新卡片数据。
3. **注册审核卡片**：
   - 点击后展示待审列表（详见第 4 节），右上角红点依据 pending 数量控制。

## 3. 生活日记模块
1. **列表加载**：
   - 新建 `JournalFeed`（或在现有卡片中内嵌）。State：`posts[]`、`nextCursor`、`loading`、`error`。
   - 初始 `useEffect` 调 `fetchJournal({ limit: 10 })`。
   - 无限滚动：当 `nextCursor` 存在且页面靠近底部时，再调用 `fetchJournal({ limit: 10, cursor })`，把结果追加。
2. **发布/编辑/删除**：
   - 发布：调用 `createJournal({ authorId, title?, content, mediaUrls?, visibility? })`，成功后插入列表头部。
   - 编辑：弹出编辑表单 -> `updateJournal(postId, { authorId, ...fields })` -> 更新对应 item。
   - 删除：`deleteJournal(postId, { authorId })` -> 将该帖从列表中移除。
3. **点赞**：
   - 判断当前用户是否点赞：`post.likes.users` 中是否包含 `sessionUser.id`。
   - 点赞/取消：调用 `likeJournal` 或 `unlikeJournal`，并更新 `likes.total` 与 `likes.users`。
4. **评论**：
   - 打开评论区时调用 `fetchComments(postId)`，用接口返回的 `CommentNode[]` 渲染两级结构。
   - 发表：`createComment(postId, { authorId, content, parentCommentId?, targetUserId? })`；前端需限制 100 词。
   - 删除：`deleteComment(postId, commentId, { actorId, actorRole })`，允许作者或管理员调用。

## 4. 注册审核流程
1. 管理员卡片进入审核面板：
   - 调用 `fetchApprovals({ status: "pending" })`，以表格或列表形式呈现。
   - 每条记录显示 `username`、`display_name`、提交时间等，附“同意/拒绝”按钮。
2. 审核操作：
   - 同意：`reviewApproval(id, { action: "approve", reviewerId })`。
   - 拒绝：`reviewApproval(id, { action: "reject", reviewerId, rejectionReason })`。
   - 操作成功后从列表移除，并刷新 pending 数量用于红点提示。

## 5. 状态与交互细则
- 登录/退出：`AuthSheet` 登录成功后需刷新卡片+日记列表，确保角色变更生效。
- Loading/错误：
  - 每个主要视图（卡片、日记列表、评论）在加载时显示 skeleton 或 spinner。
  - 请求失败通过同一 toast 组件提示；表单按钮在提交中保持 disabled。
- 模块化：可将各 API + 状态逻辑拆分为 hooks（如 `useCards`, `useJournalFeed`）。

## 6. 验收步骤
1. 使用种子数据中管理员（akira）登录：
   - 确认卡片来自 Supabase，调整顺序/新增/删除后刷新页面仍然正确。
   - 进入注册审核面板，执行同意/拒绝操作，并检查用户表/红点同步更新。
2. 使用普通用户（guest）登录：
   - 测试生活日记的新增、编辑、删除、点赞、评论；验证权限（普通用户不可访问管理员功能）。
3. `pnpm lint`、`pnpm run build`。

完成以上步骤并确认无误后再提交变更。如遇接口不满足需求，请更新 `docs/api.md` 或联系后端补充。
