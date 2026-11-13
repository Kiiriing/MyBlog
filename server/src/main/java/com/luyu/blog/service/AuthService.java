package com.luyu.blog.service;

import com.luyu.blog.domain.LoginAttempt;
import com.luyu.blog.domain.Role;
import com.luyu.blog.domain.User;
import com.luyu.blog.domain.VerificationCode;
import com.luyu.blog.repo.LoginAttemptRepository;
import com.luyu.blog.repo.UserRepository;
import com.luyu.blog.security.JwtService;
import com.luyu.blog.security.UserPrincipal;
import com.luyu.blog.web.ApiException;
import com.luyu.blog.web.dto.AuthDtos.AuthResponse;
import com.luyu.blog.web.dto.AuthDtos.CaptchaResponse;
import com.luyu.blog.web.dto.AuthDtos.CodeRequest;
import com.luyu.blog.web.dto.AuthDtos.CodeResponse;
import com.luyu.blog.web.dto.AuthDtos.CodeVerifyRequest;
import com.luyu.blog.web.dto.AuthDtos.LoginRequest;
import com.luyu.blog.web.dto.AuthDtos.RegisterRequest;
import com.luyu.blog.web.dto.AuthDtos.ResetPasswordRequest;
import com.luyu.blog.web.dto.AuthDtos.UserDto;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.Optional;

@Service
public class AuthService {

	private static final String LOGIN_FAILED = "用户名 / 邮箱或密码不正确";

	private final UserRepository users;
	private final LoginAttemptRepository loginAttempts;
	private final PasswordEncoder passwordEncoder;
	private final JwtService jwtService;
	private final VerificationCodeService verificationCodes;
	private final CaptchaService captchaService;
	private final String adminEmail;
	private final long loginWindowSeconds;
	private final long loginMaxAttempts;
	/** 失败计数必须在独立事务里提交，否则会随登录异常一起回滚 */
	private final TransactionTemplate requiresNew;

	public AuthService(UserRepository users, LoginAttemptRepository loginAttempts, PasswordEncoder passwordEncoder,
			JwtService jwtService, VerificationCodeService verificationCodes, CaptchaService captchaService,
			PlatformTransactionManager transactionManager,
			@Value("${app.seed.admin-email:}") String adminEmail,
			@Value("${app.auth.login-window-minutes:15}") long loginWindowMinutes,
			@Value("${app.auth.login-max-attempts:5}") long loginMaxAttempts) {
		this.users = users;
		this.loginAttempts = loginAttempts;
		this.passwordEncoder = passwordEncoder;
		this.jwtService = jwtService;
		this.verificationCodes = verificationCodes;
		this.captchaService = captchaService;
		this.adminEmail = normalize(adminEmail);
		this.loginWindowSeconds = Math.max(1, loginWindowMinutes) * 60;
		this.loginMaxAttempts = Math.max(1, loginMaxAttempts);
		this.requiresNew = new TransactionTemplate(transactionManager);
		this.requiresNew.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
	}

	public CaptchaResponse createCaptcha() {
		return captchaService.create();
	}

	/** 发送邮箱验证码：先过人机验证，再按用途发信；找回密码时账号会解析成注册邮箱。 */
	public CodeResponse sendCode(CodeRequest request, String ip) {
		captchaService.verify(request.captchaId(), request.captchaCode());

		boolean register = VerificationCode.PURPOSE_REGISTER.equals(request.scene());
		String email;
		if (register) {
			email = normalize(request.account());
			if (!email.contains("@")) {
				throw new ApiException(HttpStatus.BAD_REQUEST, "注册验证码请填写邮箱地址");
			}
		} else {
			email = resolveAccount(request.account()).getEmail();
		}

		return verificationCodes.send(email, request.scene(), ip);
	}

	/** 6 位验证码输完即校验：只提示对错，不消费验证码（提交注册 / 重置时仍会再校验一次） */
	public void verifyCode(CodeVerifyRequest request) {
		boolean register = VerificationCode.PURPOSE_REGISTER.equals(request.scene());
		String email = register
				? normalize(request.account())
				: resolveAccount(request.account()).getEmail();
		verificationCodes.peek(email, request.scene(), request.code());
	}

	@Transactional
	public AuthResponse register(RegisterRequest request, String ip) {
		String email = normalize(request.email());
		String username = request.username().trim();

		if (users.existsByEmail(email)) {
			throw new ApiException(HttpStatus.CONFLICT, "该邮箱已经注册过了");
		}
		if (users.existsByUsernameIgnoreCase(username)) {
			throw new ApiException(HttpStatus.CONFLICT, "该用户名已经被占用了，换一个试试");
		}

		verificationCodes.verify(email, VerificationCode.PURPOSE_REGISTER, request.code());

		Role role = !adminEmail.isEmpty() && email.equals(adminEmail) ? Role.ADMIN : Role.USER;
		User user = users.save(new User(username, email, passwordEncoder.encode(request.password()), role));
		user.recordLogin(ip);

		return new AuthResponse(jwtService.issue(user), UserDto.from(user));
	}

	/** 邮箱验证码重置密码；账号可用用户名或邮箱，重置后旧密码与已签发的 token 立即失效。 */
	@Transactional
	public void resetPassword(ResetPasswordRequest request) {
		User user = resolveAccount(request.account());
		verificationCodes.verify(user.getEmail(), VerificationCode.PURPOSE_RESET_PASSWORD, request.code());
		user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
		user.bumpTokenVersion();
	}

	@Transactional
	public AuthResponse login(LoginRequest request, String ip) {
		String account = normalize(request.account());
		String clientIp = ip == null ? "" : ip;
		long failures = loginAttempts.countByAccountAndIpAndCreatedAtAfter(account, clientIp,
				Instant.now().minusSeconds(loginWindowSeconds));
		if (failures >= loginMaxAttempts) {
			long waitMinutes = Math.max(1, Duration.ofSeconds(loginWindowSeconds).toMinutes());
			throw new ApiException(HttpStatus.TOO_MANY_REQUESTS,
					"登录尝试次数过多，请 " + waitMinutes + " 分钟后再试");
		}

		Optional<User> found = account.contains("@")
				? users.findByEmail(account)
				: users.findByUsernameIgnoreCase(account);

		Optional<User> matched = found
				.filter(candidate -> passwordEncoder.matches(request.password(), candidate.getPasswordHash()));
		if (matched.isEmpty()) {
			requiresNew.executeWithoutResult(
					status -> loginAttempts.save(new LoginAttempt(account, clientIp)));
			throw new ApiException(HttpStatus.UNAUTHORIZED, LOGIN_FAILED);
		}

		User user = matched.get();
		loginAttempts.deleteByAccountAndIp(account, clientIp);

		// 记录登录 IP：新 IP 登录后，此前 IP 上的会话会失效
		user.recordLogin(clientIp);

		return new AuthResponse(jwtService.issue(user), UserDto.from(user));
	}

	/** 定期清理过期的登录失败记录，避免表随攻击流量无限增长。 */
	@Scheduled(fixedDelayString = "${app.auth.login-attempt-cleanup-ms:86400000}")
	@Transactional
	public void cleanupLoginAttempts() {
		loginAttempts.deleteByCreatedAtBefore(Instant.now().minusSeconds(loginWindowSeconds * 2));
	}

	@Transactional(readOnly = true)
	public UserDto me(UserPrincipal principal) {
		User user = users.findById(principal.id())
				.orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "登录状态已失效"));
		return UserDto.from(user);
	}

	/** 账号解析：含 @ 视为邮箱，否则视为用户名。 */
	private User resolveAccount(String rawAccount) {
		String account = rawAccount == null ? "" : rawAccount.trim();
		if (account.isEmpty()) {
			throw new ApiException(HttpStatus.BAD_REQUEST, "请填写用户名或邮箱");
		}
		if (account.contains("@")) {
			return users.findByEmail(normalize(account))
					.orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "该邮箱还没有注册，请先注册账号"));
		}
		return users.findByUsernameIgnoreCase(account)
				.orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "该用户名还没有注册，请先注册账号"));
	}

	private static String normalize(String value) {
		return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
	}
}
