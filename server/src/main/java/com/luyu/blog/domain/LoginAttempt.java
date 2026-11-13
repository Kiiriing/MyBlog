package com.luyu.blog.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/**
 * 登录失败记录：按「账号 + IP + 时间窗口」计数，用于阻断密码暴力破解。
 */
@Entity
@Table(name = "login_attempts", indexes = {
		@Index(name = "idx_login_attempts_account_ip", columnList = "account, request_ip, created_at")
})
public class LoginAttempt {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@Column(nullable = false, length = 190)
	private String account;

	@Column(name = "request_ip", length = 64)
	private String ip;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt = Instant.now();

	protected LoginAttempt() {
	}

	public LoginAttempt(String account, String ip) {
		this.account = account;
		this.ip = ip;
		this.createdAt = Instant.now();
	}
}
