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

	private final SecretKey key;
	private final long ttlHours;

	public JwtService(@Value("${app.jwt.secret}") String secret,
			@Value("${app.jwt.ttl-hours:72}") long ttlHours) {
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
				.issuedAt(Date.from(now))
				.expiration(Date.from(now.plus(ttlHours, ChronoUnit.HOURS)))
				.signWith(key)
				.compact();
	}

	public UUID parseUserId(String token) {
		Claims claims = Jwts.parser()
				.verifyWith(key)
				.build()
				.parseSignedClaims(token)
				.getPayload();
		return UUID.fromString(claims.getSubject());
	}
}
