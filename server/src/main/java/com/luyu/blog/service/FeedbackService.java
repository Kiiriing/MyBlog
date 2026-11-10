package com.luyu.blog.service;

import com.luyu.blog.domain.Audience;
import com.luyu.blog.domain.Feedback;
import com.luyu.blog.domain.Notification;
import com.luyu.blog.domain.NotificationCategory;
import com.luyu.blog.domain.Role;
import com.luyu.blog.domain.User;
import com.luyu.blog.repo.FeedbackRepository;
import com.luyu.blog.repo.NotificationRepository;
import com.luyu.blog.repo.UserRepository;
import com.luyu.blog.security.UserPrincipal;
import com.luyu.blog.web.ApiException;
import com.luyu.blog.web.dto.FeedbackDtos.FeedbackDto;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

@Service
@Transactional
public class FeedbackService {

	/** 每位用户每天最多提交的反馈条数 */
	private static final int DAILY_LIMIT = 3;

	/** 以北京时间切分自然日 */
	private static final ZoneId ZONE = ZoneId.of("Asia/Shanghai");

	private final FeedbackRepository feedbackRepository;
	private final NotificationRepository notifications;
	private final UserRepository users;
	private final ModerationService moderation;

	public FeedbackService(FeedbackRepository feedbackRepository, NotificationRepository notifications,
			UserRepository users, ModerationService moderation) {
		this.feedbackRepository = feedbackRepository;
		this.notifications = notifications;
		this.users = users;
		this.moderation = moderation;
	}

	public void submit(UserPrincipal principal, String content) {
		User author = users.findById(principal.id())
				.orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "登录状态已失效"));

		Instant dayStart = LocalDate.now(ZONE).atStartOfDay(ZONE).toInstant();
		long sentToday = feedbackRepository.countByUser_IdAndCreatedAtGreaterThanEqual(author.getId(), dayStart);
		if (sentToday >= DAILY_LIMIT) {
			throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "今天的 3 条反馈已经发完了，明天再来吧");
		}

		String cleaned = content.trim();
		moderation.validate(cleaned);
		feedbackRepository.save(new Feedback(author, cleaned));

		String title = "来自 " + author.getDisplayName() + " 的反馈";
		for (User admin : users.findByRole(Role.ADMIN)) {
			notifications.save(new Notification(NotificationCategory.FEEDBACK, Audience.USER, admin, author,
					title, cleaned, null));
		}

		notifications.save(new Notification(NotificationCategory.SYSTEM, Audience.USER, author, null,
				"反馈已收到", "谢谢你的建议，我会尽快查看并回复。", "/journal"));
	}

	@Transactional(readOnly = true)
	public List<FeedbackDto> listAll() {
		return feedbackRepository.findAllByOrderByCreatedAtDesc().stream()
				.map(FeedbackDto::from)
				.toList();
	}
}
