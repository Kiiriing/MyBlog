package com.luyu.blog.web;

import com.luyu.blog.security.UserPrincipal;
import com.luyu.blog.service.NotificationService;
import com.luyu.blog.web.dto.NotificationDtos.CreateNotificationRequest;
import com.luyu.blog.web.dto.NotificationDtos.NotificationDto;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/notifications")
public class AdminNotificationController {

	private final NotificationService notificationService;

	public AdminNotificationController(NotificationService notificationService) {
		this.notificationService = notificationService;
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public NotificationDto create(@AuthenticationPrincipal UserPrincipal principal,
			@Valid @RequestBody CreateNotificationRequest request) {
		return notificationService.create(principal, request);
	}
}
