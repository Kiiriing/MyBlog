package com.luyu.blog.service;

import com.luyu.blog.domain.Audience;
import com.luyu.blog.domain.Notification;
import com.luyu.blog.domain.NotificationState;
import com.luyu.blog.domain.Role;
import com.luyu.blog.domain.User;
import com.luyu.blog.repo.NotificationRepository;
import com.luyu.blog.repo.NotificationStateRepository;
import com.luyu.blog.repo.UserRepository;
import com.luyu.blog.security.UserPrincipal;
import com.luyu.blog.web.ApiException;
import com.luyu.blog.web.dto.NotificationDtos.NotificationDto;
import com.luyu.blog.web.dto.NotificationDtos.NotificationListDto;
import com.luyu.blog.web.dto.NotificationDtos.UnreadDto;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Transactional
public class NotificationService {

	private final NotificationRepository notifications;
	private final NotificationStateRepository states;
	private final UserRepository users;

	public NotificationService(NotificationRepository notifications, NotificationStateRepository states,
			UserRepository users) {
		this.notifications = notifications;
		this.states = states;
		this.users = users;
	}

	@Transactional(readOnly = true)
	public NotificationListDto list(UserPrincipal principal, String filter) {
		User user = requireUser(principal);
		List<Notification> visible = visibleFor(user);
		Map<Long, NotificationState> stateMap = stateMap(user, visible);

		boolean unreadOnly = "unread".equalsIgnoreCase(filter);
		boolean readOnly = "read".equalsIgnoreCase(filter);

		List<NotificationDto> items = visible.stream()
				.map(notification -> toDto(notification, stateMap.get(notification.getId())))
				.filter(item -> !unreadOnly || !item.read())
				.filter(item -> !readOnly || item.read())
				.sorted(Comparator
						.comparing((NotificationDto item) -> item.pinned()).reversed()
						.thenComparing(NotificationDto::createdAt, Comparator.reverseOrder()))
				.toList();

		long unread = visible.stream()
				.filter(notification -> !isRead(stateMap.get(notification.getId())))
				.count();

		return new NotificationListDto(items, unread);
	}

	@Transactional(readOnly = true)
	public UnreadDto unread(UserPrincipal principal) {
		User user = requireUser(principal);
		List<Notification> visible = visibleFor(user);
		Map<Long, NotificationState> stateMap = stateMap(user, visible);
		long unread = visible.stream()
				.filter(notification -> !isRead(stateMap.get(notification.getId())))
				.count();
		return new UnreadDto(unread);
	}

	public NotificationDto markRead(UserPrincipal principal, Long id) {
		User user = requireUser(principal);
		Notification notification = requireVisible(id, user);
		NotificationState state = stateOf(notification, user);
		if (state.getReadAt() == null) {
			state.setReadAt(Instant.now());
		}
		return toDto(notification, states.save(state));
	}

	public UnreadDto markAllRead(UserPrincipal principal) {
		User user = requireUser(principal);
		List<Notification> visible = visibleFor(user);
		Map<Long, NotificationState> stateMap = stateMap(user, visible);
		List<NotificationState> changed = visible.stream()
				.filter(notification -> !isRead(stateMap.get(notification.getId())))
				.map(notification -> {
					NotificationState state = stateMap.get(notification.getId());
					if (state == null) {
						state = new NotificationState(notification, user);
					}
					state.setReadAt(Instant.now());
					return state;
				})
				.toList();
		states.saveAll(changed);
		return new UnreadDto(0);
	}

	public NotificationDto togglePin(UserPrincipal principal, Long id) {
		User user = requireUser(principal);
		Notification notification = requireVisible(id, user);
		NotificationState state = stateOf(notification, user);
		state.setPinnedAt(state.getPinnedAt() == null ? Instant.now() : null);
		return toDto(notification, states.save(state));
	}

	public void hide(UserPrincipal principal, Long id) {
		User user = requireUser(principal);
		Notification notification = requireVisible(id, user);
		NotificationState state = stateOf(notification, user);
		state.setHiddenAt(Instant.now());
		states.save(state);
	}

	private List<Notification> visibleFor(User user) {
		return notifications.findVisibleFor(user, user.getRole() == Role.ADMIN, Audience.ALL, Audience.ADMIN);
	}

	private Map<Long, NotificationState> stateMap(User user, List<Notification> visible) {
		if (visible.isEmpty()) {
			return Map.of();
		}
		List<Long> ids = visible.stream().map(Notification::getId).toList();
		return states.findByUserIdAndNotificationIdIn(user.getId(), ids).stream()
				.collect(Collectors.toMap(state -> state.getNotification().getId(), Function.identity()));
	}

	private Notification requireVisible(Long id, User user) {
		Notification notification = notifications.findById(id)
				.orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "通知不存在"));

		boolean visible = notification.getAudience() == Audience.ALL
				|| (notification.getAudience() == Audience.ADMIN && user.getRole() == Role.ADMIN)
				|| (notification.getRecipient() != null && notification.getRecipient().getId().equals(user.getId()));

		if (!visible) {
			throw new ApiException(HttpStatus.NOT_FOUND, "通知不存在");
		}
		return notification;
	}

	private NotificationState stateOf(Notification notification, User user) {
		return states.findByNotificationIdAndUserId(notification.getId(), user.getId())
				.orElseGet(() -> new NotificationState(notification, user));
	}

	private boolean isRead(NotificationState state) {
		return state != null && state.getReadAt() != null;
	}

	private NotificationDto toDto(Notification notification, NotificationState state) {
		String senderName = notification.getSender() == null ? null : notification.getSender().getDisplayName();
		return new NotificationDto(
				notification.getId(),
				notification.getCategory().name(),
				notification.getTitle(),
				notification.getBody(),
				notification.getLink(),
				notification.getCreatedAt(),
				isRead(state),
				state != null && state.getPinnedAt() != null,
				senderName);
	}

	private User requireUser(UserPrincipal principal) {
		if (principal == null) {
			throw new ApiException(HttpStatus.UNAUTHORIZED, "请先登录");
		}
		return users.findById(principal.id())
				.orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "登录状态已失效"));
	}
}
