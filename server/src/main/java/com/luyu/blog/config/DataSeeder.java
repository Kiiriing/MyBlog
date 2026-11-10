package com.luyu.blog.config;

import com.luyu.blog.domain.Audience;
import com.luyu.blog.domain.Notification;
import com.luyu.blog.domain.NotificationCategory;
import com.luyu.blog.domain.Role;
import com.luyu.blog.domain.User;
import com.luyu.blog.repo.NotificationRepository;
import com.luyu.blog.repo.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Component
public class DataSeeder implements ApplicationRunner {

	private final UserRepository users;
	private final NotificationRepository notifications;
	private final PasswordEncoder passwordEncoder;
	private final String adminEmail;
	private final String adminPassword;

	public DataSeeder(UserRepository users, NotificationRepository notifications, PasswordEncoder passwordEncoder,
			@Value("${app.seed.admin-email:}") String adminEmail,
			@Value("${app.seed.admin-password:}") String adminPassword) {
		this.users = users;
		this.notifications = notifications;
		this.passwordEncoder = passwordEncoder;
		this.adminEmail = adminEmail == null ? "" : adminEmail.trim().toLowerCase(Locale.ROOT);
		this.adminPassword = adminPassword == null ? "" : adminPassword;
	}

	@Override
	@Transactional
	public void run(ApplicationArguments args) {
		if (!adminEmail.isEmpty() && !adminPassword.isEmpty() && !users.existsByEmail(adminEmail)) {
			users.save(new User(adminEmail, passwordEncoder.encode(adminPassword), "Admin", Role.ADMIN));
		}

		if (notifications.count() == 0) {
			notifications.save(new Notification(
					NotificationCategory.SYSTEM,
					Audience.ALL,
					null,
					null,
					"站内信已上线",
					"公告、反馈回执和私信都会出现在这里。读过的消息会收进「已读」，重要的可以置顶。",
					"/journal"));
		}
	}
}
