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
			"COMMENT ON COLUMN users.id IS '主键'",
			"COMMENT ON COLUMN users.email IS '登录邮箱（唯一）'",
			"COMMENT ON COLUMN users.username IS '登录用户名（唯一，注册后不可修改）'",
			"COMMENT ON COLUMN users.password_hash IS 'BCrypt 加密后的密码'",
			"COMMENT ON COLUMN users.display_name IS '展示名称，默认与用户名一致'",
			"COMMENT ON COLUMN users.role IS '角色：USER 普通用户，ADMIN 管理员'",
			"COMMENT ON COLUMN users.created_at IS '注册时间'",
			"COMMENT ON COLUMN users.last_login_ip IS '最近一次登录 IP，IP 变化后需要重新登录'",
			"COMMENT ON COLUMN users.last_login_at IS '最近一次登录时间'",

			"COMMENT ON TABLE notifications IS '站内通知表'",
			"COMMENT ON COLUMN notifications.id IS '主键'",
			"COMMENT ON COLUMN notifications.category IS '分类：SYSTEM 系统通知，FEEDBACK 用户反馈，DIRECT 私信'",
			"COMMENT ON COLUMN notifications.audience IS '可见范围：ALL 全站，ADMIN 管理员，USER 指定用户'",
			"COMMENT ON COLUMN notifications.recipient_id IS '接收用户，仅 audience=USER 时生效'",
			"COMMENT ON COLUMN notifications.sender_id IS '发送人'",
			"COMMENT ON COLUMN notifications.title IS '通知标题'",
			"COMMENT ON COLUMN notifications.body IS '通知正文'",
			"COMMENT ON COLUMN notifications.link IS '点击通知后跳转的站内路径'",
			"COMMENT ON COLUMN notifications.created_at IS '创建时间'",

			"COMMENT ON TABLE notification_states IS '用户对通知的已读 / 置顶 / 删除状态表'",
			"COMMENT ON COLUMN notification_states.id IS '主键'",
			"COMMENT ON COLUMN notification_states.notification_id IS '通知 ID'",
			"COMMENT ON COLUMN notification_states.user_id IS '用户 ID'",
			"COMMENT ON COLUMN notification_states.read_at IS '阅读时间，有值即为已读'",
			"COMMENT ON COLUMN notification_states.pinned_at IS '置顶时间，有值即为置顶'",
			"COMMENT ON COLUMN notification_states.hidden_at IS '从用户列表隐藏（软删除）的时间，记录本身保留'",

			"COMMENT ON TABLE feedback IS '用户反馈表'",
			"COMMENT ON COLUMN feedback.id IS '主键'",
			"COMMENT ON COLUMN feedback.user_id IS '提交反馈的用户 ID'",
			"COMMENT ON COLUMN feedback.content IS '反馈内容'",
			"COMMENT ON COLUMN feedback.created_at IS '提交时间'",
			"COMMENT ON COLUMN feedback.handled IS '是否已处理'",

			"COMMENT ON TABLE verification_codes IS '邮箱验证码表'",
			"COMMENT ON COLUMN verification_codes.id IS '主键'",
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
			"COMMENT ON COLUMN captcha_challenges.created_at IS '生成时间'");

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
		}
	}
}
