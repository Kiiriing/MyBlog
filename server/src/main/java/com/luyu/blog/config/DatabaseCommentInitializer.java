package com.luyu.blog.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * 应用启动后为表和字段补写中文注释（幂等，可重复执行）。
 * 表结构由 Hibernate 自动维护，注释统一在这里维护。
 */
@Component
public class DatabaseCommentInitializer implements ApplicationRunner {

	private static final Logger log = LoggerFactory.getLogger(DatabaseCommentInitializer.class);

	private static final List<String> STATEMENTS = List.of(
			"COMMENT ON TABLE users IS '用户账号表'",
			"COMMENT ON COLUMN users.id IS '主键（UUID）'",
			"COMMENT ON COLUMN users.email IS '登录邮箱（唯一）'",
			"COMMENT ON COLUMN users.username IS '登录用户名（唯一，注册后不可修改）'",
			"COMMENT ON COLUMN users.password_hash IS 'BCrypt 加密后的密码'",
			"COMMENT ON COLUMN users.display_name IS '展示名称，默认与用户名一致'",
			"COMMENT ON COLUMN users.role IS '角色：USER 普通用户，ADMIN 管理员'",
			"COMMENT ON COLUMN users.created_at IS '注册时间'",
			"COMMENT ON COLUMN users.last_login_ip IS '最近一次登录 IP，IP 变化后需要重新登录'",
			"COMMENT ON COLUMN users.last_login_at IS '最近一次登录时间'",

			"COMMENT ON TABLE notifications IS '站内通知表'",
			"COMMENT ON COLUMN notifications.id IS '主键（UUID）'",
			"COMMENT ON COLUMN notifications.category IS '分类：SYSTEM 系统通知，FEEDBACK 用户反馈，DIRECT 私信'",
			"COMMENT ON COLUMN notifications.audience IS '可见范围：ALL 全站，ADMIN 管理员，USER 指定用户'",
			"COMMENT ON COLUMN notifications.recipient_id IS '接收用户，仅 audience=USER 时生效'",
			"COMMENT ON COLUMN notifications.sender_id IS '发送人'",
			"COMMENT ON COLUMN notifications.title IS '通知标题'",
			"COMMENT ON COLUMN notifications.body IS '通知正文'",
			"COMMENT ON COLUMN notifications.link IS '点击通知后跳转的站内路径'",
			"COMMENT ON COLUMN notifications.created_at IS '创建时间'",

			"COMMENT ON TABLE notification_states IS '用户对通知的已读 / 置顶 / 删除状态表'",
			"COMMENT ON COLUMN notification_states.id IS '主键（UUID）'",
			"COMMENT ON COLUMN notification_states.notification_id IS '通知 ID'",
			"COMMENT ON COLUMN notification_states.user_id IS '用户 ID'",
			"COMMENT ON COLUMN notification_states.read_at IS '阅读时间，有值即为已读'",
			"COMMENT ON COLUMN notification_states.pinned_at IS '置顶时间，有值即为置顶'",
			"COMMENT ON COLUMN notification_states.hidden_at IS '从用户列表隐藏（软删除）的时间，记录本身保留'",

			"COMMENT ON TABLE feedback IS '用户反馈表'",
			"COMMENT ON COLUMN feedback.id IS '主键（UUID）'",
			"COMMENT ON COLUMN feedback.user_id IS '提交反馈的用户 ID'",
			"COMMENT ON COLUMN feedback.content IS '反馈内容'",
			"COMMENT ON COLUMN feedback.created_at IS '提交时间'",
			"COMMENT ON COLUMN feedback.handled IS '是否已处理'",

			"COMMENT ON TABLE verification_codes IS '邮箱验证码表'",
			"COMMENT ON COLUMN verification_codes.id IS '主键（UUID）'",
			"COMMENT ON COLUMN verification_codes.email IS '接收验证码的邮箱'",
			"COMMENT ON COLUMN verification_codes.code IS '6 位数字验证码'",
			"COMMENT ON COLUMN verification_codes.purpose IS '用途：REGISTER 注册，RESET_PASSWORD 重置密码'",
			"COMMENT ON COLUMN verification_codes.request_ip IS '请求发送验证码的客户端 IP'",
			"COMMENT ON COLUMN verification_codes.expires_at IS '过期时间'",
			"COMMENT ON COLUMN verification_codes.attempts IS '已校验失败次数'",
			"COMMENT ON COLUMN verification_codes.used IS '是否已使用或已作废'",
			"COMMENT ON COLUMN verification_codes.created_at IS '发送时间'",

			"COMMENT ON TABLE captcha_challenges IS '图片人机验证码表（发送邮件验证码前的校验）'",
			"COMMENT ON COLUMN captcha_challenges.id IS '主键（UUID）'",
			"COMMENT ON COLUMN captcha_challenges.answer IS '图片中的正确字符'",
			"COMMENT ON COLUMN captcha_challenges.expires_at IS '过期时间'",
			"COMMENT ON COLUMN captcha_challenges.used IS '是否已使用（一次性，校验后即作废）'",
			"COMMENT ON COLUMN captcha_challenges.created_at IS '生成时间'",

			"COMMENT ON TABLE post_comments IS '文章评论表（支持一层楼中楼回复）'",
			"COMMENT ON COLUMN post_comments.id IS '主键（UUID）'",
			"COMMENT ON COLUMN post_comments.post_slug IS '所属文章 slug，对应前端 posts 数据'",
			"COMMENT ON COLUMN post_comments.user_id IS '评论用户 ID'",
			"COMMENT ON COLUMN post_comments.parent_id IS '父评论 ID：顶层评论为空，回复指向顶层评论'",
			"COMMENT ON COLUMN post_comments.content IS '评论正文（删除后改写为占位文案）'",
			"COMMENT ON COLUMN post_comments.created_at IS '评论时间'",
			"COMMENT ON COLUMN post_comments.deleted IS '是否已软删除，记录保留用于占位'",

			"COMMENT ON TABLE post_stats IS '文章统计表：阅读量、点赞数、收藏数'",
			"COMMENT ON COLUMN post_stats.post_slug IS '主键，文章 slug'",
			"COMMENT ON COLUMN post_stats.views IS '累计阅读次数'",
			"COMMENT ON COLUMN post_stats.likes IS '当前点赞数（取消点赞会扣减）'",
			"COMMENT ON COLUMN post_stats.favorites IS '当前收藏数（取消收藏会扣减）'",

			"COMMENT ON TABLE changelog_entries IS '更新页版本记录表'",
			"COMMENT ON COLUMN changelog_entries.id IS '主键（UUID）'",
			"COMMENT ON COLUMN changelog_entries.version IS '版本号，同时作为页面锚点（唯一）'",
			"COMMENT ON COLUMN changelog_entries.date_label IS '展示用时间，可写时间区间'",
			"COMMENT ON COLUMN changelog_entries.occurred_at IS '发生时间，用于倒序排列'",
			"COMMENT ON COLUMN changelog_entries.title IS '该版本的标题'",

			"COMMENT ON TABLE changelog_items IS '更新页版本下的改动条目'",
			"COMMENT ON COLUMN changelog_items.entry_id IS '所属版本记录 ID'",
			"COMMENT ON COLUMN changelog_items.position IS '条目顺序，从 0 开始'",
			"COMMENT ON COLUMN changelog_items.item IS '条目正文，支持用反引号标记行内代码'",

			"COMMENT ON TABLE post_reactions IS '文章点赞 / 收藏明细表，一个用户对一篇文章的同一种操作只有一条'",
			"COMMENT ON COLUMN post_reactions.id IS '主键（UUID）'",
			"COMMENT ON COLUMN post_reactions.post_slug IS '文章 slug'",
			"COMMENT ON COLUMN post_reactions.user_id IS '操作用户 ID'",
			"COMMENT ON COLUMN post_reactions.kind IS '操作类型：LIKE 点赞，FAVORITE 收藏'",
			"COMMENT ON COLUMN post_reactions.created_at IS '操作时间'");

	private final JdbcTemplate jdbc;

	public DatabaseCommentInitializer(JdbcTemplate jdbc) {
		this.jdbc = jdbc;
	}

	@Override
	public void run(ApplicationArguments args) {
		int failed = 0;
		for (String statement : STATEMENTS) {
			try {
				jdbc.execute(statement);
			} catch (RuntimeException exception) {
				failed++;
				log.warn("写入数据库注释失败：{}（{}）", statement, exception.getMessage());
			}
		}
		if (failed > 0) {
			log.warn("数据库注释有 {} 条未写入", failed);
		} else {
			log.info("数据库表 / 字段中文注释已同步，共 {} 条", STATEMENTS.size());
		}
	}
}
