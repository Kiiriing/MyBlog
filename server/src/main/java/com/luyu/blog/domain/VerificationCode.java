package com.luyu.blog.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

/**
 * 邮箱验证码：注册等场景的一次性校验码。
 */
@Entity
@Table(name = "verification_codes")
public class VerificationCode {

	public static final String PURPOSE_REGISTER = "REGISTER";
	public static final String PURPOSE_RESET_PASSWORD = "RESET_PASSWORD";

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false, length = 190)
	private String email;

	@Column(nullable = false, length = 8)
	private String code;

	@Column(nullable = false, length = 24)
	private String purpose;

	@Column(name = "request_ip", length = 64)
	private String requestIp;

	@Column(name = "expires_at", nullable = false)
	private Instant expiresAt;

	@Column(nullable = false)
	private int attempts;

	@Column(nullable = false)
	private boolean used;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt = Instant.now();

	protected VerificationCode() {
	}

	public VerificationCode(String email, String code, String purpose, String requestIp, Instant expiresAt) {
		this.email = email;
		this.code = code;
		this.purpose = purpose;
		this.requestIp = requestIp;
		this.expiresAt = expiresAt;
		this.createdAt = Instant.now();
	}

	public Long getId() {
		return id;
	}

	public String getEmail() {
		return email;
	}

	public String getCode() {
		return code;
	}

	public String getPurpose() {
		return purpose;
	}

	public String getRequestIp() {
		return requestIp;
	}

	public Instant getExpiresAt() {
		return expiresAt;
	}

	public int getAttempts() {
		return attempts;
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

	public void recordFailedAttempt() {
		this.attempts++;
	}

	public void markUsed() {
		this.used = true;
	}
}
