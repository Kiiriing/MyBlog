package com.luyu.blog.web;

import com.luyu.blog.security.UserPrincipal;
import com.luyu.blog.service.NotificationService;
import com.luyu.blog.web.dto.NotificationDtos.NotificationDto;
import com.luyu.blog.web.dto.NotificationDtos.NotificationListDto;
import com.luyu.blog.web.dto.NotificationDtos.UnreadDto;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

	private final NotificationService notificationService;

	public NotificationController(NotificationService notificationService) {
		this.notificationService = notificationService;
	}

	@GetMapping
	public NotificationListDto list(@AuthenticationPrincipal UserPrincipal principal,
			@RequestParam(defaultValue = "all") String filter) {
		return notificationService.list(principal, filter);
	}

	@GetMapping("/unread-count")
	public UnreadDto unread(@AuthenticationPrincipal UserPrincipal principal) {
		return notificationService.unread(principal);
	}

	@PostMapping("/read-all")
	public UnreadDto markAllRead(@AuthenticationPrincipal UserPrincipal principal) {
		return notificationService.markAllRead(principal);
	}

	@PostMapping("/{id}/read")
	public NotificationDto markRead(@AuthenticationPrincipal UserPrincipal principal, @PathVariable UUID id) {
		return notificationService.markRead(principal, id);
	}

	@PostMapping("/{id}/pin")
	public NotificationDto togglePin(@AuthenticationPrincipal UserPrincipal principal, @PathVariable UUID id) {
		return notificationService.togglePin(principal, id);
	}

	@DeleteMapping("/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void hide(@AuthenticationPrincipal UserPrincipal principal, @PathVariable UUID id) {
		notificationService.hide(principal, id);
	}
}
