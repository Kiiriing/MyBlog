package com.luyu.blog.service;

import com.luyu.blog.domain.VerificationCode;
import com.luyu.blog.repo.UserRepository;
import com.luyu.blog.repo.VerificationCodeRepository;
import com.luyu.blog.web.ApiException;
import com.luyu.blog.web.dto.AuthDtos.CodeResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Locale;

/**
 * 邮箱验证码：按用途（注册 / 重置密码）发送邮件，并做发送频率限制、有效期、错误次数限制。
 */
@Service
public class VerificationCodeService {

	private static final SecureRandom RANDOM = new SecureRandom();

	private final VerificationCodeRepository codes;
	private final UserRepository users;
	private final MailService mailService;
	private final long ttlMinutes;
	private final long resendSeconds;
	private final long maxPerHour;
	private final long maxAttempts;
	private final long maxPerIpHour;
	private final TransactionTemplate requiresNew;

	public VerificationCodeService(VerificationCodeRepository codes, UserRepository users, MailService mailService,
			PlatformTransactionManager transactionManager,
			@Value("${app.auth.code-ttl-minutes:10}") long ttlMinutes,
			@Value("${app.auth.code-resend-seconds:60}") long resendSeconds,
			@Value("${app.auth.code-max-per-hour:5}") long maxPerHour,
			@Value("${app.auth.code-max-attempts:5}") long maxAttempts,
			@Value("${app.auth.code-max-per-ip-hour:20}") long maxPerIpHour) {
		this.codes = codes;
		this.users = users;
		this.mailService = mailService;
		this.ttlMinutes = ttlMinutes;
		this.resendSeconds = resendSeconds;
		this.maxPerHour = maxPerHour;
		this.maxAttempts = maxAttempts;
		this.maxPerIpHour = maxPerIpHour;
		this.requiresNew = new TransactionTemplate(transactionManager);
		this.requiresNew.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
	}

	/**
	 * 生成验证码并通过 163 SMTP 发送。
	 * 先发信后落库：发信失败时不占用发送频率，用户可立即重试。
	 */
	public CodeResponse send(String rawEmail, String scene, String ip) {
		String email = normalize(rawEmail);
		boolean register = VerificationCode.PURPOSE_REGISTER.equals(scene);
		if (register && users.existsByEmail(email)) {
			throw new ApiException(HttpStatus.CONFLICT, "该邮箱已经注册过了，可以直接登录");
		}
		if (!register && !users.existsByEmail(email)) {
			throw new ApiException(HttpStatus.NOT_FOUND, "该邮箱还没有注册，请先注册账号");
		}

		Instant now = Instant.now();
		codes.findTopByEmailAndPurposeOrderByCreatedAtDesc(email, scene).ifPresent(last -> {
			Instant availableAt = last.getCreatedAt().plusSeconds(resendSeconds);
			if (availableAt.isAfter(now)) {
				long wait = Math.max(1, Duration.between(now, availableAt).toSeconds());
				throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "验证码发送得太频繁，请 " + wait + " 秒后再试");
			}
		});

		Instant oneHourAgo = now.minus(1, ChronoUnit.HOURS);
		if (codes.countByEmailAndPurposeAndCreatedAtAfter(email, scene, oneHourAgo) >= maxPerHour) {
			throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "该邮箱一小时内获取验证码次数过多，请稍后再试");
		}
		if (ip != null && !ip.isBlank() && codes.countByRequestIpAndCreatedAtAfter(ip, oneHourAgo) >= maxPerIpHour) {
			throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "当前网络获取验证码次数过多，请稍后再试");
		}

		String code = String.format("%06d", RANDOM.nextInt(1_000_000));
		mailService.sendCode(email, code, register ? "注册账号" : "重置密码", ttlMinutes);
		codes.save(new VerificationCode(email, code, scene, ip, now.plusSeconds(ttlMinutes * 60)));

		return new CodeResponse(ttlMinutes * 60, resendSeconds, mask(email));
	}

	/** 邮箱脱敏：abc***@163.com */
	private static String mask(String email) {
		int at = email.indexOf('@');
		if (at <= 0) {
			return email;
		}
		String local = email.substring(0, at);
		String domain = email.substring(at);
		if (local.length() <= 2) {
			return local.charAt(0) + "***" + domain;
		}
		return local.substring(0, 2) + "***" + domain;
	}

	/** 校验并消费验证码；失败计数在独立事务中提交，避免随业务事务回滚一起回滚。 */
	public void verify(String rawEmail, String scene, String code) {
		check(rawEmail, scene, code, true);
	}

	/** 仅校验不消费：6 位输完的即时提示用，错误次数照常累计 */
	public void peek(String rawEmail, String scene, String code) {
		check(rawEmail, scene, code, false);
	}

	private void check(String rawEmail, String scene, String code, boolean consume) {
		CodeFailure failure = requiresNew.execute(status -> inspect(rawEmail, scene, code, consume));
		if (failure != null) {
			throw new ApiException(failure.status(), failure.message());
		}
	}

	private CodeFailure inspect(String rawEmail, String scene, String code, boolean consume) {
		String email = normalize(rawEmail);
		VerificationCode record = codes
				.findTopByEmailAndPurposeAndUsedFalseOrderByCreatedAtDesc(email, scene)
				.orElse(null);

		if (record == null) {
			return new CodeFailure(HttpStatus.BAD_REQUEST, "请先获取邮箱验证码");
		}
		if (record.isExpired(Instant.now())) {
			return new CodeFailure(HttpStatus.BAD_REQUEST, "验证码已过期，请重新获取");
		}

		if (!record.getCode().equals(code)) {
			record.recordFailedAttempt();
			if (record.getAttempts() >= maxAttempts) {
				record.markUsed();
				return new CodeFailure(HttpStatus.TOO_MANY_REQUESTS, "验证码错误次数过多，请重新获取");
			}
			return new CodeFailure(HttpStatus.BAD_REQUEST,
					"验证码不正确，还可以再试 " + (maxAttempts - record.getAttempts()) + " 次");
		}

		if (consume) {
			record.markUsed();
		}
		return null;
	}

	private record CodeFailure(HttpStatus status, String message) {
	}

	private static String normalize(String email) {
		return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
	}
}
