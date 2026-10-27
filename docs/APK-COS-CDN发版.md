# APK 改走 COS / CDN（加速下载）

## 会不会更快？

**会，而且通常快很多。**

| 方式 | 典型速度 | 原因 |
|------|----------|------|
| 现在：CVM Nginx 直出 | ~200–400 KB/s | 公网出网常只有 1–5 Mbps |
| COS + CDN | 数 MB/s～几十 MB/s | 就近节点、独立带宽，不占云服务器配额 |

`update.json` 仍可放在 `tjb666.space`（几 KB）；只有 **APK 大文件**走 CDN。

---

## 一次性准备（控制台）

### 1. 创建 COS 桶
1. 腾讯云 → 对象存储 COS → 创建桶  
2. 地域建议与 CVM 同城：`ap-guangzhou`  
3. 权限：公有读私有写（或私有写 + CDN 回源鉴权）  
4. 记下：`BucketName-AppId`（如 `english-study-1234567890`）、地域

### 2. 开通 CDN（推荐）
1. 腾讯云 → CDN → 域名管理 → 添加域名，例如 `apk.tjb666.space`  
2. 源站：选 COS 桶  
3. DNS：给 `apk.tjb666.space` 做 CNAME 到 CDN 分配的域名  
4. HTTPS：CDN 控制台一键申请证书  

不配 CDN 也能用 COS 默认域名，但国内直链 COS 有时不如 CDN 稳。

### 3. API 密钥
访问管理 CAM → 密钥 → 新建 `SecretId` / `SecretKey`（建议子账号只授该桶读写）。

本机二选一：

```powershell
# A. 环境变量（当前终端）
$env:COS_SECRET_ID = "AKIDxxxx"
$env:COS_SECRET_KEY = "xxxx"

# B. 本地文件（已 gitignore）
copy scripts\release.cos.example.json scripts\release.cos.json
# 编辑填入 SecretId / SecretKey
```

### 4. 改 `scripts/release.config.json`

```json
{
  "publicBase": "https://tjb666.space/englishStudy",
  "apiBase": "https://tjb666.space",
  "cos": {
    "enabled": true,
    "bucket": "english-study-1234567890",
    "region": "ap-guangzhou",
    "prefix": "englishStudy/",
    "cdnBase": "https://apk.tjb666.space"
  }
}
```

- `cdnBase`：填 CDN 域名；若暂时没有，可留空，脚本会用 COS 默认域名  
- `prefix`：对象键前缀，与现在路径 `englishStudy/` 对齐  

---

## 发版怎么变

命令不变：

```powershell
npm run release:apk -- --notes "本次更新"
```

开启 `cos.enabled` 后脚本会：

1. 照常打 APK  
2. **APK** → 上传 COS（`学习宝典.apk` + `latest.apk`）  
3. `update.json` 里的 `apkUrl` → 指向 **CDN/COS**  
4. **update.json** 仍 SCP 到云服务器（检查更新走原站，下载走 CDN）  

关闭 `cos.enabled` 或去掉整段 `cos`，行为与以前完全一样（APK 也 SCP 到 CVM）。

---

## 验收

1. 打开 `https://tjb666.space/englishStudy/update.json`，看 `apkUrl` 是否已是 `https://apk.tjb666.space/...`  
2. 浏览器直接打开该 `apkUrl`，看下载速度是否明显高于以前  
3. App「检查更新」应仍能提示并下载  

---

## 费用与注意

- COS 存储 + 流量、CDN 流量按量计费；相对「升 CVM 带宽」通常更划算  
- CDN 有缓存：发新包后若仍下到旧包，在 CDN 控制台对 `/englishStudy/学习宝典.apk` 做刷新  
- 密钥勿提交 Git（`release.cos.json` 已在 ignore 列表）
