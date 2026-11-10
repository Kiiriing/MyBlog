package com.luyu.blog.service;

import com.luyu.blog.web.ApiException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;

/**
 * 通过 163 SMTP 发送验证码邮件（深色 HTML 模板 + 纯文本兜底）。
 */
@Service
public class MailService {

	private static final Logger log = LoggerFactory.getLogger(MailService.class);

	/** 邮件顶部品牌图，随包发布，避免外链图片被邮件客户端拦截 */
	private static final String LOGO_PATH = "static/brand/logo.png";

	private final JavaMailSender sender;
	private final String from;
	private final String fromName;
	private final String siteUrl;
	private final byte[] logo;

	public MailService(JavaMailSender sender,
			@Value("${spring.mail.username:}") String from,
			@Value("${app.mail.from-name:LU YU Blog}") String fromName,
			@Value("${app.site-url:}") String siteUrl) {
		this.sender = sender;
		this.from = from;
		this.fromName = fromName;
		this.siteUrl = siteUrl == null ? "" : siteUrl.trim();
		this.logo = loadLogo();
	}

	public void sendCode(String to, String code, String sceneLabel, long ttlMinutes) {
		if (from == null || from.isBlank()) {
			throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "邮箱服务尚未配置，请联系站长");
		}

		try {
			MimeMessage message = sender.createMimeMessage();
			// 纯文本 + HTML 两种正文需要 multipart 模式
			MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
			helper.setFrom(from, fromName);
			helper.setTo(to);
			helper.setSubject("【LU YU】" + sceneLabel + "验证码：" + code);
			helper.setText(plainBody(code, sceneLabel, ttlMinutes), htmlBody(code, sceneLabel, ttlMinutes));
			if (logo.length > 0) {
				// 用 CID 内嵌，邮件客户端不加载外链也能看到 logo
				helper.addInline("brandLogo", new ByteArrayResource(logo), "image/png");
			}
			sender.send(message);
			log.info("验证码邮件已发送：to={} scene={}", to, sceneLabel);
		} catch (Exception exception) {
			log.warn("验证码邮件发送失败：to={} 原因={}", to, exception.getMessage());
			throw new ApiException(HttpStatus.BAD_GATEWAY, "验证码邮件发送失败，请稍后再试");
		}
	}

	private static byte[] loadLogo() {
		try (InputStream input = new ClassPathResource(LOGO_PATH).getInputStream()) {
			return input.readAllBytes();
		} catch (IOException exception) {
			log.warn("邮件 logo 读取失败，将使用文字徽标：{}", exception.getMessage());
			return new byte[0];
		}
	}

	private static String plainBody(String code, String sceneLabel, long ttlMinutes) {
		return """
				你好：

				你正在进行「%s」，验证码是：%s

				验证码 %d 分钟内有效，请勿转发给他人。
				如果这不是你本人的操作，忽略这封邮件即可。

				LU YU 团队
				""".formatted(sceneLabel, code, ttlMinutes);
	}

	private String htmlBody(String code, String sceneLabel, long ttlMinutes) {
		String entry = siteUrl.isEmpty()
				? "前往 LU YU 博客，在登录页输入验证码即可完成操作。"
				: "前往 <a href=\"" + siteUrl + "\" style=\"color:#7ea6ff;text-decoration:underline;\">LU YU 博客</a>，"
						+ "在登录页输入验证码即可完成操作。";

		// 有 logo 时用 CID 内嵌图片，读取失败则退回文字徽标
		String badge = logo.length > 0
				? """
						<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 30px auto;">
							<tr>
								<td align="center">
									<img src="cid:brandLogo" width="132" alt="LU YU"
										style="display:block;width:132px;max-width:132px;height:auto;border:0;">
								</td>
							</tr>
						</table>"""
				: """
						<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 34px auto;">
							<tr>
								<td align="center" width="60" height="60"
									style="width:60px;height:60px;background-color:#ff5a2f;border-radius:50%;color:#ffffff;font-size:19px;font-weight:700;letter-spacing:1px;line-height:60px;text-align:center;">
									LU
								</td>
							</tr>
						</table>""";

		return """
				<!DOCTYPE html>
				<html lang="zh-CN">
				<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1">
				<title>LU YU 验证码</title>
				</head>
				<body style="margin:0;padding:0;background-color:#08080b;">
				<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0"
					style="background-color:#08080b;">
					<tr>
						<td align="center" style="padding:48px 20px;">
							<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0"
								style="max-width:520px;background-color:#111117;border:1px solid #1e1e28;border-radius:20px;">
								<tr>
									<td style="padding:44px 40px 40px 40px;font-family:-apple-system,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;">

										<!-- 品牌徽标 -->
										%s

										<!-- 标题 -->
										<p style="margin:0 0 8px 0;color:#8b8b9c;font-size:13px;letter-spacing:2px;text-transform:uppercase;">
											SECURITY CODE
										</p>
										<h1 style="margin:0 0 28px 0;color:#f4f4f7;font-size:25px;line-height:1.4;font-weight:700;letter-spacing:0.4px;">
											您的 LU YU 安全代码：
										</h1>

										<!-- 验证码 -->
										<div style="background-color:#191922;border:1px solid #262634;border-radius:14px;padding:26px 20px;text-align:center;">
											<span style="color:#ffffff;font-size:44px;font-weight:700;letter-spacing:10px;font-family:'SF Mono',Consolas,'Courier New',monospace;line-height:1.1;">%s</span>
										</div>
										<p style="margin:14px 0 32px 0;color:#6f6f80;font-size:13px;line-height:1.6;">
											该代码用于「%s」，%d 分钟内有效。
										</p>

										<!-- 说明 -->
										<p style="margin:0 0 14px 0;color:#b9b9c8;font-size:15px;line-height:1.9;">
											%s
										</p>
										<p style="margin:0 0 14px 0;color:#b9b9c8;font-size:15px;line-height:1.9;">
											请不要把这段代码转发给任何人，LU YU 团队不会以任何理由向你索取它。
										</p>
										<p style="margin:0 0 36px 0;color:#b9b9c8;font-size:15px;line-height:1.9;">
											如果这不是你本人的操作，忽略这封邮件即可，你的账号不会有任何变化。
										</p>

										<!-- 落款 -->
										<div style="border-top:1px solid #232331;padding-top:24px;">
											<p style="margin:0;color:#f4f4f7;font-size:15px;font-weight:600;">LU YU 团队</p>
											<p style="margin:6px 0 0 0;color:#6f6f80;font-size:13px;line-height:1.7;">
												此邮件由系统自动发出，请勿直接回复。
											</p>
										</div>

									</td>
								</tr>
							</table>
							<p style="margin:24px 0 0 0;color:#4a4a58;font-size:12px;font-family:-apple-system,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;">
								LU YU — 个人博客 &amp; 手记
							</p>
						</td>
					</tr>
				</table>
				</body>
				</html>
				""".formatted(badge, code, sceneLabel, ttlMinutes, entry);
	}
}
