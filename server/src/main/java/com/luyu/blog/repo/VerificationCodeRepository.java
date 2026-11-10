package com.luyu.blog.repo;

import com.luyu.blog.domain.VerificationCode;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface VerificationCodeRepository extends JpaRepository<VerificationCode, UUID> {

	Optional<VerificationCode> findTopByEmailAndPurposeOrderByCreatedAtDesc(String email, String purpose);

	Optional<VerificationCode> findTopByEmailAndPurposeAndUsedFalseOrderByCreatedAtDesc(String email, String purpose);

	long countByEmailAndPurposeAndCreatedAtAfter(String email, String purpose, Instant after);

	long countByRequestIpAndCreatedAtAfter(String ip, Instant after);
}
