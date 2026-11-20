# LunaTV cf-D1

基于 [MoonTechLab/LunaTV](https://github.com/MoonTechLab/LunaTV) 的分支版本，版本号 **cf-D1**。

将原版 Next.js 应用改造为可部署到 **Cloudflare Workers + D1** 的版本：无需容器服务器、不休眠、免费额度即可个人使用。

## 主要改动

| 改动 | 说明 |
| --- | --- |
| 存储后端 | 使用 Cloudflare D1 数据库替代 Redis/Upstash，删除 `redis.db.ts` / `upstash.db.ts` |
| 部署方式 | 通过 `@opennextjs/cloudflare` 适配器运行在 Cloudflare Workers 上 |
| 运行时 | 移除 API 路由的 `export const runtime = 'edge'`（由 OpenNext 统一处理） |
| 版本升级 | Next.js 14 → 15.5.29 |
| 订阅功能 | 新增视频源配置订阅（支持 Base58 + Brotli/Gzip/Deflate 压缩格式） |
| Cron Trigger | 通过 Custom Worker 的 `scheduled` 处理器执行定时任务（自动订阅更新、刷新播放记录/收藏） |
| 移动端适配 | 播放器 16:9 自适应、管理页表格隐藏次要列、小屏溢出修复 |

## 目录结构

```
├── migrations/
│   └── 0001_init.sql        # D1 建表脚本（6 张表）
├── src/
│   ├── app/
│   │   ├── api/             # 23 个 API 路由（含 cron、订阅管理）
│   │   └── ...              # 页面（首页/搜索/播放/豆瓣/管理/登录）
│   ├── components/          # UI 组件（含移动端 Header/底部导航）
│   └── lib/
│       ├── d1.db.ts         # D1 存储实现
│       ├── base58.ts        # 订阅内容解码（兼容压缩格式）
│       ├── subscription.ts  # 订阅自动拉取与合并逻辑
│       └── ...
├── wrangler.jsonc           # Cloudflare Workers 配置
├── open-next.config.ts      # OpenNext 适配器配置
└── next.config.mjs
```

## 部署到 Cloudflare

### 方式一：GitHub + Workers Builds（推荐）

1. Fork / 推送本仓库到 GitHub
2. Cloudflare Dashboard → **Workers & Pages** → 创建 Worker，连接 GitHub 仓库
3. 构建配置：
   - Build command：`npx @opennextjs/cloudflare build`
   - Deploy command：`npx @opennextjs/cloudflare deploy`
4. 在 Worker 的 **Settings → Variables & Secrets** 中配置环境变量（见下方）
5. 在 **Settings → Triggers → Cron Triggers** 添加定时任务（如 `0 */2 * * *`），用于自动订阅更新与播放记录刷新

### 方式二：本地 Wrangler 部署

```bash
npm install

# 创建 D1 数据库
wrangler d1 create moontv

# 初始化表结构（本地/远程）
wrangler d1 execute moontv --file=./migrations/0001_init.sql
wrangler d1 execute moontv --remote --file=./migrations/0001_init.sql

# 构建 + 部署
npm run deploy
```

> 首次部署后，需将 `wrangler.jsonc` 中 `d1_databases` 的 `database_id` 改为你自己创建的数据库 ID。

## 环境变量（wrangler.jsonc `vars`）

| 变量 | 说明 | 示例 |
| --- | --- | --- |
| `NEXT_PUBLIC_STORAGE_TYPE` | 存储类型，本版本固定为 `d1` | `d1` |
| `NEXT_PUBLIC_ENABLE_REGISTER` | 是否开放注册 | `false` |
| `NEXT_PUBLIC_SEARCH_MAX_PAGE` | 聚合搜索最大页数 | `5` |
| `NEXT_PUBLIC_IMAGE_PROXY` | 图片代理前缀（解决豆瓣防盗链） | `/api/image-proxy?url=` |
| `SITE_NAME` | 站点名称 | `LunaTV cf-D1` |
| `USERNAME` / `PASSWORD` | 初始站长账号密码 | `moontv` |
| `DOCKER_ENV` | 兼容标记，保持 `false` | `false` |

## 视频源订阅

在 **管理页 → 配置订阅** 中（仅站长可见）：

1. 填写订阅 URL（内容为 Base58 编码的 JSON 配置，兼容纯文本及 Brotli/Gzip/Deflate 压缩格式）
2. 开启「自动更新」后，Cron Trigger 会按 1 小时最小间隔自动拉取并合并视频源
3. 订阅来源的源标记为 `config`，手动添加的源标记为 `custom`，订阅更新不会覆盖自定义源

## 本地开发

```bash
npm run dev       # Next.js 开发服务器（需本地 D1/配置，建议直接用 preview）
npm run preview   # 构建 OpenNext 产物并本地预览 Workers 环境
```

## 定时任务说明

Cron Trigger 触发 Worker 的 `scheduled` 处理器（非 HTTP 请求），执行内容与 `/api/cron` 一致：

- 自动拉取视频源订阅（有 1 小时防抖）
- 刷新所有用户的播放记录与收藏（更新总集数、封面等信息）

## 致谢

- [MoonTV / LunaTV](https://github.com/MoonTechLab/LunaTV) — 原始项目
- [OpenNext Cloudflare](https://opennext.js.org/cloudflare) — Next.js 到 Cloudflare Workers 的适配层
