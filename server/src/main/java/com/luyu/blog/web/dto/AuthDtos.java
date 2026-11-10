package com.luyu.blog.web.dto;

import com.luyu.blog.domain.User;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public final class AuthDtos {

	/** 用户名允许中英文、数字、下划线，2-20 个字符 */
	public static final String USERNAME_REGEX = "^[\\w\\u4e00-\\u9fa5]{2,20}$";

	private AuthDtos() {
	}

	public record RegisterRequest(
			@NotBlank(message = "请填写用户名")
			@Pattern(regexp = USERNAME_REGEX, message = "用户名为 2-20 位中英文、数字或下划线")
			String username,

			@NotBlank(message = "请填写邮箱")
			@Email(message = "邮箱格式不正确")
			String email,

			@NotBlank(message = "请填写密码")
			@Size(min = 8, max = 72, message = "密码长度需要在 8 到 72 位之间")
			String password,

			@NotBlank(message = "请填写邮箱验证码")
			@Size(min = 6, max = 6, message = "验证码为 6 位数字")
			String code) {
	}

	/** 发送邮箱验证码：必须先通过图片人机验证；account 为用户名或邮箱 */
	public record CodeRequest(
			@NotBlank(message = "请填写用户名或邮箱")
			@Size(max = 190, message = "用户名或邮箱过长")
			String account,

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

	/** 6 位邮箱验证码输完即自动校验；只提示对错，不消费验证码 */
	public record CodeVerifyRequest(
			@NotBlank(message = "请填写用户名或邮箱")
			@Size(max = 190, message = "用户名或邮箱过长")
			String account,

			@NotBlank(message = "请选择验证码用途")
			@Pattern(regexp = "REGISTER|RESET_PASSWORD", message = "验证码用途不正确")
			String scene,

			@NotBlank(message = "请填写邮箱验证码")
			@Size(min = 6, max = 6, message = "验证码为 6 位数字")
			String code) {
	}

	/** 验证码已改为邮件发送；sentTo 为脱敏后的接收邮箱 */
	public record CodeResponse(long expiresInSeconds, long resendAfterSeconds, String sentTo) {
	}

	public record ResetPasswordRequest(
			@NotBlank(message = "请填写用户名或邮箱")
			@Size(max = 190, message = "用户名或邮箱过长")
			String account,

			@NotBlank(message = "请填写邮箱验证码")
			@Size(min = 6, max = 6, message = "验证码为 6 位数字")
			String code,

			@NotBlank(message = "请填写新密码")
			@Size(min = 8, max = 72, message = "密码长度需要在 8 到 72 位之间")
			String newPassword) {
	}

	/** account 可以是用户名或邮箱 */
	public record LoginRequest(
			@NotBlank(message = "请填写用户名或邮箱")
			@Size(max = 190, message = "用户名或邮箱过长")
			String account,

			@NotBlank(message = "请填写密码")
			String password) {
	}

	public record UserDto(UUID id, String username, String email, String displayName, String role) {

		public static UserDto from(User user) {
			// 历史账号没有用户名，回退到展示名，前端只认一个字段
			String username = user.getUsername() == null || user.getUsername().isBlank()
					? user.getDisplayName()
					: user.getUsername();
			return new UserDto(user.getId(), username, user.getEmail(), user.getDisplayName(),
					user.getRole().name());
		}
	}

	public record AuthResponse(String token, UserDto user) {
	}
}
