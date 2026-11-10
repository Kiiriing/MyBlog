package com.luyu.blog.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/**
 * 图片验证码：发送邮件验证码前的人机校验，一次性使用。
 */
@Entity
@Table(name = "captcha_challenges")
public class CaptchaChallenge {

	@Id
	@Column(length = 36)
	private String id = UUID.randomUUID().toString();

	@Column(nullable = false, length = 8)
	private String answer;

	@Column(name = "expires_at", nullable = false)
	private Instant expiresAt;

	@Column(nullable = false)
	private boolean used;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt = Instant.now();

	protected CaptchaChallenge() {
	}

	public CaptchaChallenge(String answer, Instant expiresAt) {
		this.answer = answer;
		this.expiresAt = expiresAt;
		this.createdAt = Instant.now();
	}

	public String getId() {
		return id;
	}

	public String getAnswer() {
		return answer;
	}

	public Instant getExpiresAt() {
		return expiresAt;
	}

	public boolean isUsed() {
		return used;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}

	public boolean isExpired(Instant now) {
		return now.isAfter(expiresAt);
	}

	public void markUsed() {
		this.used = true;
	}
}
