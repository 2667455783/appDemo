-- 增量：仅新建 git 相关表（已有库可单独执行）
CREATE TABLE IF NOT EXISTS `git_repo` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '逻辑外键 → app_user.id',
  `provider` VARCHAR(16) NOT NULL COMMENT 'github/gitee/gitlab',
  `owner` VARCHAR(128) NOT NULL COMMENT '仓库 owner',
  `repo` VARCHAR(128) NOT NULL COMMENT '仓库名',
  `subpath` VARCHAR(255) NOT NULL DEFAULT '' COMMENT '前端子目录，空串表示根',
  `source_url` VARCHAR(512) NOT NULL DEFAULT '' COMMENT '原始输入地址',
  `title` VARCHAR(255) NOT NULL DEFAULT '' COMMENT '展示标题',
  `default_branch` VARCHAR(128) NOT NULL DEFAULT 'main' COMMENT '默认分支',
  `current_branch` VARCHAR(128) NOT NULL DEFAULT 'main' COMMENT '当前检出分支',
  `asset_base` VARCHAR(512) NULL COMMENT '静态资源 raw 基址',
  `detected_root` VARCHAR(255) NULL COMMENT '自动定位的前端子目录',
  `open_file` VARCHAR(512) NULL COMMENT '默认打开文件',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_git_repo_user_coord` (`user_id`, `provider`, `owner`, `repo`, `subpath`),
  KEY `idx_git_repo_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户缓存的远程 Git 仓';

CREATE TABLE IF NOT EXISTS `git_branch_snapshot` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  `repo_id` BIGINT UNSIGNED NOT NULL COMMENT '逻辑外键 → git_repo.id',
  `branch_name` VARCHAR(128) NOT NULL COMMENT '分支名',
  `files_json` LONGTEXT NOT NULL COMMENT 'path→content JSON',
  `open_file` VARCHAR(512) NULL COMMENT '该分支默认打开文件',
  `fetched_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '最近拉取/写入时间',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_git_branch_repo_name` (`repo_id`, `branch_name`),
  KEY `idx_git_branch_repo_id` (`repo_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='按分支缓存的文件快照';
