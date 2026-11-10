package com.luyu.blog.web.dto;

import com.luyu.blog.domain.User;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class AuthDtos {

	private AuthDtos() {
	}

	public record RegisterRequest(
			@NotBlank(message = "请填写邮箱")
			@Email(message = "邮箱格式不正确")
			String email,

			@NotBlank(message = "请填写密码")
			@Size(min = 8, max = 72, message = "密码长度需要在 8 到 72 位之间")
			String password,

			@NotBlank(message = "请填写昵称")
			@Size(min = 2, max = 40, message = "昵称长度需要在 2 到 40 个字符之间")
			String displayName) {
	}

	public record LoginRequest(
			@NotBlank(message = "请填写邮箱")
			@Email(message = "邮箱格式不正确")
			String email,

			@NotBlank(message = "请填写密码")
			String password) {
	}

	public record UserDto(Long id, String email, String displayName, String role) {

		public static UserDto from(User user) {
			return new UserDto(user.getId(), user.getEmail(), user.getDisplayName(), user.getRole().name());
		}
	}

	public record AuthResponse(String token, UserDto user) {
	}
}
