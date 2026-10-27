-- 增量：个人项目表（已有库可单独执行）
CREATE TABLE IF NOT EXISTS `user_project` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '逻辑外键 → app_user.id',
  `title` VARCHAR(255) NOT NULL DEFAULT '' COMMENT '项目展示名',
  `source_type` VARCHAR(16) NOT NULL DEFAULT 'upload' COMMENT 'upload/zip',
  `open_file` VARCHAR(512) NULL COMMENT '默认打开文件',
  `file_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '文件数',
  `files_json` LONGTEXT NOT NULL COMMENT 'path→content JSON',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_project_user_updated` (`user_id`, `updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户个人上传项目';
