package com.luyu.blog.service;

import com.luyu.blog.domain.Audience;
import com.luyu.blog.domain.Notification;
import com.luyu.blog.domain.NotificationCategory;
import com.luyu.blog.domain.NotificationState;
import com.luyu.blog.domain.Role;
import com.luyu.blog.domain.User;
import com.luyu.blog.repo.NotificationRepository;
import com.luyu.blog.repo.NotificationStateRepository;
import com.luyu.blog.repo.UserRepository;
import com.luyu.blog.security.UserPrincipal;
import com.luyu.blog.web.ApiException;
import com.luyu.blog.web.dto.NotificationDtos.CreateNotificationRequest;
import com.luyu.blog.web.dto.NotificationDtos.NotificationDto;
import com.luyu.blog.web.dto.NotificationDtos.NotificationListDto;
import com.luyu.blog.web.dto.NotificationDtos.UnreadDto;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
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
	public NotificationListDto list(UserPrincipal principal, String filter, int page, int size) {
		User user = requireUser(principal);
		boolean admin = user.getRole() == Role.ADMIN;
		boolean unreadOnly = "unread".equalsIgnoreCase(filter);
		boolean readOnly = "read".equalsIgnoreCase(filter);
		int pageSize = size <= 0 ? 20 : Math.min(size, 50);
		int pageIndex = Math.max(0, page);

		List<Notification> visible = notifications.findVisiblePage(user, admin, Audience.ALL, Audience.ADMIN,
				unreadOnly, readOnly, PageRequest.of(pageIndex, pageSize + 1));
		boolean hasMore = visible.size() > pageSize;
		List<Notification> pageItems = hasMore ? visible.subList(0, pageSize) : visible;
		Map<UUID, NotificationState> stateMap = stateMap(user, pageItems);

		List<NotificationDto> items = pageItems.stream()
				.map(notification -> toDto(notification, stateMap.get(notification.getId())))
				.toList();

		long unread = notifications.countVisibleUnread(user, admin, Audience.ALL, Audience.ADMIN);
		return new NotificationListDto(items, unread, hasMore);
	}

	@Transactional(readOnly = true)
	public UnreadDto unread(UserPrincipal principal) {
		User user = requireUser(principal);
		List<Notification> visible = visibleFor(user);
		Map<UUID, NotificationState> stateMap = stateMap(user, visible);
		long unread = visible.stream()
				.filter(notification -> !isRead(stateMap.get(notification.getId())))
				.count();
		return new UnreadDto(unread);
	}

	public NotificationDto markRead(UserPrincipal principal, UUID id) {
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
		Map<UUID, NotificationState> stateMap = stateMap(user, visible);
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

	public NotificationDto togglePin(UserPrincipal principal, UUID id) {
		User user = requireUser(principal);
		Notification notification = requireVisible(id, user);
		NotificationState state = stateOf(notification, user);
		state.setPinnedAt(state.getPinnedAt() == null ? Instant.now() : null);
		return toDto(notification, states.save(state));
	}

	public void hide(UserPrincipal principal, UUID id) {
		User user = requireUser(principal);
		Notification notification = requireVisible(id, user);
		NotificationState state = stateOf(notification, user);
		state.setHiddenAt(Instant.now());
		states.save(state);
	}

	/** 管理员发布全站公告；填写 recipientEmail 时改为发送私信 */
	public NotificationDto create(UserPrincipal principal, CreateNotificationRequest request) {
		User sender = requireUser(principal);
		String email = request.recipientEmail() == null ? "" : request.recipientEmail().trim().toLowerCase(Locale.ROOT);
		String link = request.link() == null || request.link().isBlank() ? null : request.link().trim();

		Notification notification;
		if (email.isEmpty()) {
			notification = new Notification(NotificationCategory.SYSTEM, Audience.ALL, null, sender,
					request.title().trim(), request.body().trim(), link);
		} else {
			User recipient = users.findByEmail(email)
					.orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "收件人不存在"));
			notification = new Notification(NotificationCategory.DIRECT, Audience.USER, recipient, sender,
					request.title().trim(), request.body().trim(), link);
		}

		return toDto(notifications.save(notification), null);
	}

	private List<Notification> visibleFor(User user) {
		return notifications.findVisibleFor(user, user.getRole() == Role.ADMIN, Audience.ALL, Audience.ADMIN);
	}

	private Map<UUID, NotificationState> stateMap(User user, List<Notification> visible) {
		if (visible.isEmpty()) {
			return Map.of();
		}
		List<UUID> ids = visible.stream().map(Notification::getId).toList();
		return states.findByUserIdAndNotificationIdIn(user.getId(), ids).stream()
				.collect(Collectors.toMap(state -> state.getNotification().getId(), Function.identity()));
	}

	private Notification requireVisible(UUID id, User user) {
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
