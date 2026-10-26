# 学习宝典 Backend（Spring Boot 3）

## 如何查找远程 MySQL 连接信息

远程库不会自动连上本地项目，需要 5 个值写入 `backend/.env`：

| 变量 | 含义 | 常见去哪查 |
|------|------|------------|
| MYSQL_HOST | 主机 | 云数据库「外网地址」或服务器公网 IP |
| MYSQL_PORT | 端口 | 一般 `3306` |
| MYSQL_DATABASE | 库名 | 控制台「数据库管理」或自建库名，建议 `appdemo` |
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
copy .env.example .env   # Windows
# 编辑 .env 填入五元组
```

### Gitee 限流（可选但强烈建议）

匿名调用 Gitee `api/v5` 极易 `403 Rate Limit`。在 `backend/.env` 增加：

```env
GITEE_ACCESS_TOKEN=你的私人令牌
```

令牌申请：https://gitee.com/profile/personal_access_tokens（勾选 projects 读权限）。  
前端 `npm run dev` 时 Vite 代理会自动把 token 加到 Gitee API 请求上（**不会打进前端包**）。改完需**重启** `npm run dev`。  
真机直连可另设 `VITE_GITEE_TOKEN`（会进安装包，仅自用构建时使用）。

执行建表（连上远程后，`.env` 已填好）：
```bash
# PowerShell（推荐）
powershell -File sql/apply-schema.ps1

# 或手动
mysql -h HOST -P PORT -u USER -p DATABASE < sql/schema.sql
```

本机若暂时没有远程库，可用 `local` profile（内存 H2）冒烟；表结构以 `sql/schema.sql` 为准，连上远程后再执行落库。

## 启动

需要 **JDK 17+** 与 Maven（或 IDE 运行）。

```bash
# 有远程 MySQL
mvn spring-boot:run

# 无库时先用内存 H2 冒烟
mvn spring-boot:run -Dspring-boot.run.profiles=local
```

健康检查：`GET http://localhost:8080/api/v1/health`

## 接口摘要

- `POST /api/v1/guest/bootstrap` body `{ "deviceId": "..." }`
- `GET/PUT /api/v1/me/profile` Header `X-Device-Id`
- `GET/PUT /api/v1/me/study/{domainId}` Header `X-Device-Id`
- `GET/PUT/DELETE /api/v1/me/git/repos` · `GET/PUT .../branches/{branch}`（Git 仓分支快照缓存）
