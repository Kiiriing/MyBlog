package com.luyu.blog.web.dto;

import com.luyu.blog.domain.User;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
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
			String displayName,

			@NotBlank(message = "请填写邮箱验证码")
			@Size(min = 6, max = 6, message = "验证码为 6 位数字")
			String code) {
	}

	/** 发送邮箱验证码：必须先通过图片人机验证 */
	public record CodeRequest(
			@NotBlank(message = "请填写邮箱")
			@Email(message = "邮箱格式不正确")
			String email,

			@NotBlank(message = "请选择验证码用途")
			@Pattern(regexp = "REGISTER|RESET_PASSWORD", message = "验证码用途不正确")
			String scene,

			@NotBlank(message = "请填写图片验证码")
			String captchaId,

			@NotBlank(message = "请填写图片验证码")
			String captchaCode) {
	}

	/** 图片人机验证码，image 为 data URI（Base64 PNG） */
	public record CaptchaResponse(String id, String image, long expiresInSeconds) {
	}

	/** 验证码已改为邮件发送，响应中不再返回验证码本身 */
	public record CodeResponse(long expiresInSeconds, long resendAfterSeconds) {
	}

	public record ResetPasswordRequest(
			@NotBlank(message = "请填写邮箱")
			@Email(message = "邮箱格式不正确")
			String email,

			@NotBlank(message = "请填写邮箱验证码")
			@Size(min = 6, max = 6, message = "验证码为 6 位数字")
			String code,

			@NotBlank(message = "请填写新密码")
			@Size(min = 8, max = 72, message = "密码长度需要在 8 到 72 位之间")
			String newPassword) {
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
