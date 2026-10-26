-- 学习宝典 appDemo · MySQL 8
-- 字符集 utf8mb4 / InnoDB；逻辑外键 + 索引，无物理 FOREIGN KEY
-- 执行前请先 CREATE DATABASE IF NOT EXISTS appdemo DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE appdemo;

CREATE TABLE IF NOT EXISTS `app_user` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  `device_id` VARCHAR(64) NOT NULL COMMENT '设备游客 ID',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_app_user_device_id` (`device_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='设备游客用户';

CREATE TABLE IF NOT EXISTS `user_profile` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '逻辑外键 → app_user.id',
  `onboarded` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '0=未完成引导,1=已完成',
  `name` VARCHAR(64) NOT NULL DEFAULT '学习者' COMMENT '昵称',
  `birthday` DATE NULL COMMENT '生日',
  `motto` VARCHAR(255) NOT NULL DEFAULT '' COMMENT '座右铭',
  `level` VARCHAR(32) NOT NULL DEFAULT 'cet4' COMMENT '英语等级兼容字段 cet4/cet6',
  `target_score` INT UNSIGNED NOT NULL DEFAULT 425 COMMENT '目标分',
  `exam_date` DATE NULL COMMENT '考试日',
  `streak` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '连续学习天数',
  `last_study_date` DATE NULL COMMENT '最近学习日',
  `active_domain` VARCHAR(32) NOT NULL DEFAULT 'english' COMMENT '当前学科',
  `domain_levels` JSON NULL COMMENT '各学科学级 JSON',
  `official_score` JSON NULL COMMENT '官方成绩快照 JSON',
  `exam_memory` JSON NULL COMMENT '考试回忆 JSON',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_profile_user_id` (`user_id`),
  KEY `idx_user_profile_active_domain` (`active_domain`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户档案（1:1 app_user）';

CREATE TABLE IF NOT EXISTS `study_snapshot` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '逻辑外键 → app_user.id',
  `domain_id` VARCHAR(32) NOT NULL COMMENT '学科 english/programming 等',
  `payload` JSON NOT NULL COMMENT '学习快照（对齐前端 study store）',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_study_snapshot_user_domain` (`user_id`, `domain_id`),
  KEY `idx_study_snapshot_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='分学科学习快照';

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
