package com.luyu.blog.service;

import com.luyu.blog.domain.Role;
import com.luyu.blog.domain.User;
import com.luyu.blog.repo.UserRepository;
import com.luyu.blog.security.JwtService;
import com.luyu.blog.security.UserPrincipal;
import com.luyu.blog.web.ApiException;
import com.luyu.blog.web.dto.AuthDtos.AuthResponse;
import com.luyu.blog.web.dto.AuthDtos.CodeRequest;
import com.luyu.blog.web.dto.AuthDtos.CodeResponse;
import com.luyu.blog.web.dto.AuthDtos.LoginRequest;
import com.luyu.blog.web.dto.AuthDtos.RegisterRequest;
import com.luyu.blog.web.dto.AuthDtos.UserDto;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Service
public class AuthService {

	private final UserRepository users;
	private final PasswordEncoder passwordEncoder;
	private final JwtService jwtService;
	private final VerificationCodeService verificationCodes;
	private final String adminEmail;

	public AuthService(UserRepository users, PasswordEncoder passwordEncoder, JwtService jwtService,
			VerificationCodeService verificationCodes,
			@Value("${app.seed.admin-email:}") String adminEmail) {
		this.users = users;
		this.passwordEncoder = passwordEncoder;
		this.jwtService = jwtService;
		this.verificationCodes = verificationCodes;
		this.adminEmail = normalize(adminEmail);
	}

	public CodeResponse sendRegisterCode(CodeRequest request, String ip) {
		return verificationCodes.sendRegisterCode(request.email(), ip);
	}

	@Transactional
	public AuthResponse register(RegisterRequest request, String ip) {
		String email = normalize(request.email());
		if (users.existsByEmail(email)) {
			throw new ApiException(HttpStatus.CONFLICT, "该邮箱已经注册过了");
		}

		verificationCodes.verifyRegisterCode(email, request.code());

		Role role = !adminEmail.isEmpty() && email.equals(adminEmail) ? Role.ADMIN : Role.USER;
		User user = users.save(new User(email, passwordEncoder.encode(request.password()),
				request.displayName().trim(), role));
		user.recordLogin(ip);

		return new AuthResponse(jwtService.issue(user), UserDto.from(user));
	}

	@Transactional
	public AuthResponse login(LoginRequest request, String ip) {
		User user = users.findByEmail(normalize(request.email()))
				.orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "邮箱或密码不正确"));

		if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
			throw new ApiException(HttpStatus.UNAUTHORIZED, "邮箱或密码不正确");
		}

		// 记录登录 IP：新 IP 登录后，此前 IP 上的会话会失效
		user.recordLogin(ip);

		return new AuthResponse(jwtService.issue(user), UserDto.from(user));
	}

	@Transactional(readOnly = true)
	public UserDto me(UserPrincipal principal) {
		User user = users.findById(principal.id())
				.orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "登录状态已失效"));
		return UserDto.from(user);
	}

	private static String normalize(String email) {
		return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
	}
}
