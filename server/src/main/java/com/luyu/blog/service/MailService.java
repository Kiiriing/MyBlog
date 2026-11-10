package com.luyu.blog.service;

import com.luyu.blog.web.ApiException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

/**
 * 通过 163 SMTP 发送验证码邮件。
 */
@Service
public class MailService {

	private static final Logger log = LoggerFactory.getLogger(MailService.class);

	private final JavaMailSender sender;
	private final String from;
	private final String fromName;

	public MailService(JavaMailSender sender,
			@Value("${spring.mail.username:}") String from,
			@Value("${app.mail.from-name:LU YU Blog}") String fromName) {
		this.sender = sender;
		this.from = from;
		this.fromName = fromName;
	}

	public void sendCode(String to, String code, String sceneLabel, long ttlMinutes) {
		if (from == null || from.isBlank()) {
			throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "邮箱服务尚未配置，请联系站长");
		}

		try {
			MimeMessage message = sender.createMimeMessage();
			MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
			helper.setFrom(from, fromName);
			helper.setTo(to);
			helper.setSubject("【LU YU】" + sceneLabel + "验证码：" + code);
			helper.setText(body(code, sceneLabel, ttlMinutes), false);
			sender.send(message);
			log.info("验证码邮件已发送：to={} scene={}", to, sceneLabel);
		} catch (Exception exception) {
			log.warn("验证码邮件发送失败：to={} 原因={}", to, exception.getMessage());
			throw new ApiException(HttpStatus.BAD_GATEWAY, "验证码邮件发送失败，请稍后再试");
		}
	}

	private static String body(String code, String sceneLabel, long ttlMinutes) {
		return """
				你好：

				你正在进行「%s」，验证码是：%s

				验证码 %d 分钟内有效，请勿转发给他人。
				如果这不是你本人的操作，忽略这封邮件即可。
				""".formatted(sceneLabel, code, ttlMinutes);
	}
}
