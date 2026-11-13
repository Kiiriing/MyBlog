package com.luyu.blog.security;

import com.luyu.blog.domain.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.UUID;

@Service
public class JwtService {

	/** 仅为本地开发准备的示例值，出现在任何非本地环境都视为配置泄漏 */
	private static final String DEV_ONLY_SECRET = "luyu-dev-only-secret-key-please-replace-0123456789";

	private final SecretKey key;
	private final long ttlHours;

	public JwtService(@Value("${app.jwt.secret}") String secret,
			@Value("${app.jwt.ttl-hours:72}") long ttlHours) {
		if (secret == null || secret.isBlank()) {
			throw new IllegalStateException("app.jwt.secret 未配置：请通过 JWT_SECRET 环境变量提供至少 32 字节的随机密钥");
		}
		if (DEV_ONLY_SECRET.equals(secret.trim())) {
			throw new IllegalStateException("app.jwt.secret 仍在使用仓库内的示例密钥：请通过 JWT_SECRET 环境变量替换");
		}
		byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
		if (bytes.length < 32) {
			throw new IllegalStateException("app.jwt.secret 至少需要 32 字节");
		}
		this.key = Keys.hmacShaKeyFor(bytes);
		this.ttlHours = ttlHours;
	}

	public String issue(User user) {
		Instant now = Instant.now();
		return Jwts.builder()
				.subject(user.getId().toString())
				.claim("email", user.getEmail())
				.claim("name", user.getDisplayName())
				.claim("role", user.getRole().name())
				.claim("ver", user.getTokenVersion())
				.issuedAt(Date.from(now))
				.expiration(Date.from(now.plus(ttlHours, ChronoUnit.HOURS)))
				.signWith(key)
				.compact();
	}

	public ParsedToken parse(String token) {
		Claims claims = claims(token);
		Object version = claims.get("ver");
		long tokenVersion = version instanceof Number number ? number.longValue() : 0L;
		return new ParsedToken(UUID.fromString(claims.getSubject()), tokenVersion);
	}

	public UUID parseUserId(String token) {
		return UUID.fromString(claims(token).getSubject());
	}

	private Claims claims(String token) {
		return Jwts.parser()
				.verifyWith(key)
				.build()
				.parseSignedClaims(token)
				.getPayload();
	}

	public record ParsedToken(UUID userId, long tokenVersion) {
	}
}
