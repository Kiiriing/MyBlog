package com.luyu.blog.repo;

import com.luyu.blog.domain.CaptchaChallenge;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CaptchaChallengeRepository extends JpaRepository<CaptchaChallenge, String> {

	long deleteByExpiresAtBefore(java.time.Instant before);
}
