package com.luyu.blog.service;

import com.luyu.blog.repo.CaptchaChallengeRepository;
import com.luyu.blog.domain.CaptchaChallenge;
import com.luyu.blog.web.ApiException;
import com.luyu.blog.web.dto.AuthDtos.CaptchaResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Font;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;

/**
 * 自建图片验证码：生成 4 位字符图片，一次性校验，不依赖第三方。
 */
@Service
public class CaptchaService {

	/** 去掉 0/O、1/I/L 等易混淆字符 */
	private static final char[] ALPHABET = "23456789ABCDEFGHJKMNPQRTUVWXYZ".toCharArray();

	private static final SecureRandom RANDOM = new SecureRandom();

	private final CaptchaChallengeRepository challenges;
	private final long ttlSeconds;

	public CaptchaService(CaptchaChallengeRepository challenges,
			@Value("${app.auth.captcha-ttl-seconds:120}") long ttlSeconds) {
		this.challenges = challenges;
		this.ttlSeconds = ttlSeconds;
	}

	@Transactional
	public CaptchaResponse create() {
		Instant now = Instant.now();
		// 顺手清理一天前的过期记录，避免表无限增长
		challenges.deleteByExpiresAtBefore(now.minus(1, ChronoUnit.DAYS));

		String answer = randomCode(4);
		CaptchaChallenge challenge = challenges.save(new CaptchaChallenge(answer, now.plusSeconds(ttlSeconds)));
		return new CaptchaResponse(challenge.getId(), "data:image/png;base64," + render(answer), ttlSeconds);
	}

	/** 校验并消费人机验证码；无论对错都作废，防止暴力尝试。 */
	@Transactional
	public void verify(String id, String input) {
		CaptchaChallenge challenge = id == null ? null : challenges.findById(id).orElse(null);
		if (challenge == null || challenge.isUsed() || challenge.isExpired(Instant.now())) {
			throw new ApiException(HttpStatus.BAD_REQUEST, "人机验证已失效，请刷新后重试");
		}

		challenge.markUsed();
		if (input == null || !challenge.getAnswer().equalsIgnoreCase(input.trim())) {
			throw new ApiException(HttpStatus.BAD_REQUEST, "人机验证码不正确");
		}
	}

	private static String randomCode(int length) {
		StringBuilder builder = new StringBuilder(length);
		for (int i = 0; i < length; i++) {
			builder.append(ALPHABET[RANDOM.nextInt(ALPHABET.length)]);
		}
		return builder.toString();
	}

	private String render(String code) {
		int width = 132;
		int height = 44;
		BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
		Graphics2D graphics = image.createGraphics();
		try {
			graphics.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
			graphics.setColor(new Color(0x15151a));
			graphics.fillRect(0, 0, width, height);

			// 干扰线
			for (int i = 0; i < 6; i++) {
				graphics.setColor(new Color(90, 90, 110, 90));
				graphics.drawLine(RANDOM.nextInt(width), RANDOM.nextInt(height),
						RANDOM.nextInt(width), RANDOM.nextInt(height));
			}

			// 噪点
			for (int i = 0; i < 70; i++) {
				graphics.setColor(new Color(200, 200, 210, 70));
				graphics.fillRect(RANDOM.nextInt(width), RANDOM.nextInt(height), 1, 1);
			}

			graphics.setFont(new Font("Consolas", Font.BOLD, 26));
			for (int i = 0; i < code.length(); i++) {
				double angle = Math.toRadians(RANDOM.nextInt(35) - 17);
				int x = 12 + i * 28;
				int y = 31;
				graphics.rotate(angle, x, y);
				graphics.setColor(i % 2 == 0 ? new Color(0xe6e1d7) : new Color(0xd8b892));
				graphics.drawString(String.valueOf(code.charAt(i)), x, y);
				graphics.rotate(-angle, x, y);
			}
		} finally {
			graphics.dispose();
		}

		try (ByteArrayOutputStream output = new ByteArrayOutputStream()) {
			ImageIO.write(image, "png", output);
			return Base64.getEncoder().encodeToString(output.toByteArray());
		} catch (IOException exception) {
			throw new IllegalStateException("验证码图片生成失败", exception);
		}
	}
}
