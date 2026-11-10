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
import java.awt.BasicStroke;
import java.awt.Color;
import java.awt.Font;
import java.awt.GradientPaint;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.geom.Path2D;
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

	/**
	 * 去掉易混淆字符：0/O、1/I/L、5/S、2/Z、8/B、U/V，
	 * 保证加了扭曲与噪声之后仍能分辨。
	 */
	private static final char[] ALPHABET = "34679ACDEFGHJKMNPQRTWXY".toCharArray();

	/** 字符随机使用不同字族，增加模板匹配难度 */
	private static final String[] FAMILIES = {Font.SANS_SERIF, Font.SERIF, Font.MONOSPACED};

	/** 字符颜色在同一暖色系内抖动，保证深色底上的可读性 */
	private static final Color[] INK = {
			new Color(0xF2EDE4), new Color(0xFFD9B8), new Color(0xE8D7A8), new Color(0xCFE3F5)
	};

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

	/**
	 * 渲染验证码：字符随机字族 / 字号 / 旋转 / 基线偏移，整层做正弦扭曲，
	 * 再叠加曲线与噪点干扰。按 2 倍尺寸绘制，前端缩放后更清晰。
	 */
	private String render(String code) {
		int width = 264;
		int height = 88;

		BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
		Graphics2D graphics = image.createGraphics();
		try {
			graphics.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
			graphics.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
			graphics.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING,
					RenderingHints.VALUE_TEXT_ANTIALIAS_ON);

			// 背景：深色渐变 + 随机光斑，破坏纯色背景分割
			graphics.setPaint(new GradientPaint(0, 0, new Color(0x16161c), width, height, new Color(0x0b0b10)));
			graphics.fillRect(0, 0, width, height);
			for (int i = 0; i < 5; i++) {
				int size = 40 + RANDOM.nextInt(90);
				graphics.setColor(new Color(120, 120, 160, 14));
				graphics.fillOval(RANDOM.nextInt(width) - size / 2, RANDOM.nextInt(height) - size / 2, size, size);
			}

			// 底层干扰曲线（文字之前）
			drawCurves(graphics, 3, 3.4f, new Color(130, 130, 170, 45), width, height);

			// 文字层：单独绘制后再做扭曲，字符笔画会随波浪变形
			BufferedImage textLayer = drawText(code, width, height);
			drawWarped(graphics, textLayer, width, height);

			// 顶层干扰：细曲线横穿字符
			drawCurves(graphics, 2, 1.5f, new Color(235, 230, 220, 80), width, height);
			drawArcs(graphics, 3, width, height);

			// 噪点与横向切割块
			for (int i = 0; i < 160; i++) {
				graphics.setColor(new Color(170 + RANDOM.nextInt(80), 170 + RANDOM.nextInt(80), 200,
						50 + RANDOM.nextInt(80)));
				int size = 1 + RANDOM.nextInt(3);
				graphics.fillOval(RANDOM.nextInt(width), RANDOM.nextInt(height), size, size);
			}
			for (int i = 0; i < 6; i++) {
				graphics.setColor(new Color(14, 14, 20, 170));
				graphics.fillRect(RANDOM.nextInt(width / 2), RANDOM.nextInt(height),
						24 + RANDOM.nextInt(70), 1 + RANDOM.nextInt(3));
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

	private static BufferedImage drawText(String code, int width, int height) {
		BufferedImage layer = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
		Graphics2D graphics = layer.createGraphics();
		try {
			graphics.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
			graphics.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING,
					RenderingHints.VALUE_TEXT_ANTIALIAS_ON);

			int slot = (width - 36) / code.length();
			for (int i = 0; i < code.length(); i++) {
				int size = 46 + RANDOM.nextInt(14);
				graphics.setFont(new Font(FAMILIES[RANDOM.nextInt(FAMILIES.length)], Font.BOLD, size));

				int x = 18 + i * slot + RANDOM.nextInt(9);
				int baseline = height / 2 + size / 3 + RANDOM.nextInt(11) - 5;
				double angle = Math.toRadians((RANDOM.nextDouble() - 0.5) * 44);

				graphics.rotate(angle, x, baseline);
				// 先描一层暗色投影，保证叠加干扰后笔画边界依然清楚
				graphics.setColor(new Color(6, 6, 9, 170));
				graphics.drawString(String.valueOf(code.charAt(i)), x + 2, baseline + 2);
				graphics.setColor(INK[RANDOM.nextInt(INK.length)]);
				graphics.drawString(String.valueOf(code.charAt(i)), x, baseline);
				graphics.rotate(-angle, x, baseline);
			}
		} finally {
			graphics.dispose();
		}
		return layer;
	}

	/** 逐行水平位移，形成波浪扭曲 */
	private static void drawWarped(Graphics2D graphics, BufferedImage layer, int width, int height) {
		double phase = RANDOM.nextDouble() * Math.PI * 2;
		double amplitude = 3 + RANDOM.nextDouble() * 4;
		for (int y = 0; y < height; y++) {
			int shift = (int) Math.round(Math.sin(y * 3.0 / height * Math.PI + phase) * amplitude);
			graphics.drawImage(layer, shift, y, shift + width, y + 1, 0, y, width, y + 1, null);
		}
	}

	private static void drawCurves(Graphics2D graphics, int count, float strokeWidth, Color color,
			int width, int height) {
		graphics.setStroke(new BasicStroke(strokeWidth, BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND));
		graphics.setColor(color);
		for (int i = 0; i < count; i++) {
			Path2D path = new Path2D.Double();
			path.moveTo(RANDOM.nextInt(width / 3), RANDOM.nextInt(height));
			path.curveTo(RANDOM.nextInt(width), RANDOM.nextInt(height),
					RANDOM.nextInt(width), RANDOM.nextInt(height),
					width - RANDOM.nextInt(width / 3), RANDOM.nextInt(height));
			graphics.draw(path);
		}
	}

	private static void drawArcs(Graphics2D graphics, int count, int width, int height) {
		graphics.setStroke(new BasicStroke(2f, BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND));
		for (int i = 0; i < count; i++) {
			graphics.setColor(new Color(200, 190, 175, 60 + RANDOM.nextInt(50)));
			int size = 50 + RANDOM.nextInt(90);
			graphics.drawArc(RANDOM.nextInt(width) - size / 2, RANDOM.nextInt(height) - size / 2,
					size, size, RANDOM.nextInt(360), 90 + RANDOM.nextInt(180));
		}
	}
}
