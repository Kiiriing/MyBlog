package com.luyu.blog.repo;

import com.luyu.blog.domain.LoginAttempt;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.UUID;

public interface LoginAttemptRepository extends JpaRepository<LoginAttempt, UUID> {

	long countByAccountAndIpAndCreatedAtAfter(String account, String ip, Instant after);

	long deleteByAccountAndIp(String account, String ip);

	long deleteByCreatedAtBefore(Instant cutoff);
}
