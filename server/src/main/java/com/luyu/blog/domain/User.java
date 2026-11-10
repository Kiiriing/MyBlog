package com.luyu.blog.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "users")
public class User {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false, unique = true, length = 190)
	private String email;

	@Column(name = "password_hash", nullable = false, length = 100)
	private String passwordHash;

	@Column(name = "display_name", nullable = false, length = 60)
	private String displayName;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 16)
	private Role role = Role.USER;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt = Instant.now();

	/** 最近一次登录 IP，IP 变化后需要重新登录 */
	@Column(name = "last_login_ip", length = 64)
	private String lastLoginIp;

	@Column(name = "last_login_at")
	private Instant lastLoginAt;

	protected User() {
	}

	public User(String email, String passwordHash, String displayName, Role role) {
		this.email = email;
		this.passwordHash = passwordHash;
		this.displayName = displayName;
		this.role = role;
		this.createdAt = Instant.now();
	}

	public Long getId() {
		return id;
	}

	public String getEmail() {
		return email;
	}

	public String getPasswordHash() {
		return passwordHash;
	}

	public String getDisplayName() {
		return displayName;
	}

	public Role getRole() {
		return role;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}

	public String getLastLoginIp() {
		return lastLoginIp;
	}

	public Instant getLastLoginAt() {
		return lastLoginAt;
	}

	/** 记录本次登录的 IP 与时间，写入后旧 IP 的会话即失效。 */
	public void recordLogin(String ip) {
		this.lastLoginIp = ip;
		this.lastLoginAt = Instant.now();
	}

	public void setPasswordHash(String passwordHash) {
		this.passwordHash = passwordHash;
	}

	public void setDisplayName(String displayName) {
		this.displayName = displayName;
	}

	public void setRole(Role role) {
		this.role = role;
	}
}
