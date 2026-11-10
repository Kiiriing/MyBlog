package com.luyu.blog.web;

import com.luyu.blog.security.ClientIp;
import com.luyu.blog.security.UserPrincipal;
import com.luyu.blog.service.AuthService;
import com.luyu.blog.web.dto.AuthDtos.AuthResponse;
import com.luyu.blog.web.dto.AuthDtos.CaptchaResponse;
import com.luyu.blog.web.dto.AuthDtos.CodeRequest;
import com.luyu.blog.web.dto.AuthDtos.CodeResponse;
import com.luyu.blog.web.dto.AuthDtos.CodeVerifyRequest;
import com.luyu.blog.web.dto.AuthDtos.LoginRequest;
import com.luyu.blog.web.dto.AuthDtos.RegisterRequest;
import com.luyu.blog.web.dto.AuthDtos.ResetPasswordRequest;
import com.luyu.blog.web.dto.AuthDtos.UserDto;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

	private final AuthService authService;

	public AuthController(AuthService authService) {
		this.authService = authService;
	}

	/** 获取图片人机验证码（发送邮箱验证码前必须通过） */
	@GetMapping("/captcha")
	public CaptchaResponse captcha() {
		return authService.createCaptcha();
	}

	/** 发送邮箱验证码：注册或重置密码，含人机验证与频率限制 */
	@PostMapping("/code")
	public CodeResponse code(@Valid @RequestBody CodeRequest request, HttpServletRequest http) {
		return authService.sendCode(request, ClientIp.resolve(http));
	}

	/** 6 位验证码输完即校验，仅用于前端即时提示，不消费验证码 */
	@PostMapping("/code/verify")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void verifyCode(@Valid @RequestBody CodeVerifyRequest request) {
		authService.verifyCode(request);
	}

	@PostMapping("/register")
	public AuthResponse register(@Valid @RequestBody RegisterRequest request, HttpServletRequest http) {
		return authService.register(request, ClientIp.resolve(http));
	}

	@PostMapping("/password/reset")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
		authService.resetPassword(request);
	}

	@PostMapping("/login")
	public AuthResponse login(@Valid @RequestBody LoginRequest request, HttpServletRequest http) {
		return authService.login(request, ClientIp.resolve(http));
	}

	@GetMapping("/me")
	public UserDto me(@AuthenticationPrincipal UserPrincipal principal) {
		return authService.me(principal);
	}
}
