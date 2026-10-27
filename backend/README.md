# 学习宝典 Backend（Spring Boot 3）

## 环境：dev / prod

| 环境 | Profile | 加载的配置文件 | MySQL |
|------|--------|----------------|-------|
| 本地开发 | `dev`（默认） | `backend/.env.dev` | 本机 `127.0.0.1` |
| 线上生产 | `prod` | `backend/.env.prod` 或服务器环境变量 | 云主机外网 IP |

启动前 `DotenvLoader` 按 `SPRING_PROFILES_ACTIVE`（缺省 `dev`）加载对应 `.env.{profile}`；若无则回退 `backend/.env`。已有系统环境变量不会被覆盖。

```bash
# 本地（自动 dev）
cd backend
mvn spring-boot:run

# 线上服务器（已部署为 systemd：appdemo-backend）
# 工作目录 /opt/appdemo-backend，profile=prod，仅监听 127.0.0.1:8080
# 对外 HTTPS：https://tjb666.space/api/...（nginx 反代）
# 更新 jar 后：
#   scp target/appdemo-backend-0.1.0.jar root@HOST:/opt/appdemo-backend/appdemo-backend.jar
#   systemctl restart appdemo-backend
```

无 MySQL 时可用内存 H2 冒烟：

```bash
mvn spring-boot:run -Dspring-boot.run.profiles=local
```

健康检查：`GET http://localhost:8080/api/v1/health`

## 如何查找远程 MySQL 连接信息

远程库不会自动连上本地项目，需要 5 个值写入 `backend/.env.prod`：

| 变量 | 含义 | 常见去哪查 |
|------|------|------------|
| MYSQL_HOST | 主机 | 云数据库「外网地址」或服务器公网 IP |
| MYSQL_PORT | 端口 | 一般 `3306` |
| MYSQL_DATABASE | 库名 | 控制台「数据库管理」或自建库名 |
| MYSQL_USER | 账号 | 账号管理 / 宝塔数据库用户 |
| MYSQL_PASSWORD | 密码 | 创建时设置；忘了就在控制台重置 |

### A. 腾讯云 / 阿里云「云数据库 MySQL」
1. 控制台打开 MySQL 实例详情。
2. 本机开发用 **外网地址**（先开启外网），并把你的公网 IP 加入白名单/安全组。
3. 库名、账号在「数据库管理」「账号管理」。

### B. 云服务器 + 宝塔自建 MySQL
1. HOST = 服务器公网 IP。
2. 宝塔 → 数据库：可见库名、用户、端口；改密在用户菜单。
3. 云安全组放行 3306；MySQL 用户 host 允许 `%` 或你的 IP。

### C. 本机验证
```bash
mysql -h HOST -P PORT -u USER -p DATABASE
```

## 配置

```bash
cd backend
copy .env.dev.example .env.dev
copy .env.prod.example .env.prod
# 编辑并填写 MYSQL_* 五元组（勿提交）
```

### Gitee 限流（可选但强烈建议）

匿名调用 Gitee `api/v5` 极易 `403 Rate Limit`。在 `.env.dev` / `.env.prod` 增加：

```env
GITEE_ACCESS_TOKEN=你的私人令牌
```

令牌申请：https://gitee.com/profile/personal_access_tokens（勾选 projects 读权限）。  
前端 `npm run dev` 时 Vite 代理会自动把 token 加到 Gitee API 请求上（**不会打进前端包**）。改完需**重启** `npm run dev`。  
真机直连可另设 `VITE_GITEE_TOKEN`（会进安装包，仅自用构建时使用）。

## 建表 / 同步本地库到线上

仅建表（对应当前 profile 的 `.env` 或传入的 env 文件）：

```powershell
# 默认读 backend/.env（兼容）；建议先保证 .env.dev 已填好
powershell -File sql/apply-schema.ps1
```

把**本机库结构+数据**完整拷到线上（读 `.env.dev` → `.env.prod`，会覆盖线上同名表）：

```powershell
powershell -File sql/sync-local-to-prod.ps1
```

## 接口摘要

- `POST /api/v1/guest/bootstrap` body `{ "deviceId": "..." }`
- `GET/PUT /api/v1/me/profile` Header `X-Device-Id`
- `GET/PUT /api/v1/me/study/{domainId}` Header `X-Device-Id`
- `GET/PUT/DELETE /api/v1/me/git/repos` · `GET/PUT .../branches/{branch}`（Git 仓分支快照缓存）
- `GET/PUT/DELETE /api/v1/me/projects` · `POST /api/v1/me/projects/zip`（个人项目）
