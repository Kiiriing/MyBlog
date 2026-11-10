package com.luyu.blog.web;

import com.luyu.blog.security.ClientIp;
import com.luyu.blog.security.UserPrincipal;
import com.luyu.blog.service.AuthService;
import com.luyu.blog.web.dto.AuthDtos.AuthResponse;
import com.luyu.blog.web.dto.AuthDtos.CodeRequest;
import com.luyu.blog.web.dto.AuthDtos.CodeResponse;
import com.luyu.blog.web.dto.AuthDtos.LoginRequest;
import com.luyu.blog.web.dto.AuthDtos.RegisterRequest;
import com.luyu.blog.web.dto.AuthDtos.UserDto;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

	private final AuthService authService;

	public AuthController(AuthService authService) {
		this.authService = authService;
	}

	/** 发送注册验证码（含频率限制），未接入邮件服务时验证码直接返回 */
	@PostMapping("/code")
	public CodeResponse code(@Valid @RequestBody CodeRequest request, HttpServletRequest http) {
		return authService.sendRegisterCode(request, ClientIp.resolve(http));
	}

	@PostMapping("/register")
	public AuthResponse register(@Valid @RequestBody RegisterRequest request, HttpServletRequest http) {
		return authService.register(request, ClientIp.resolve(http));
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
