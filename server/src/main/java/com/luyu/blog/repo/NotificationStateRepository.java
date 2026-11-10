package com.luyu.blog.repo;

import com.luyu.blog.domain.NotificationState;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface NotificationStateRepository extends JpaRepository<NotificationState, Long> {

	Optional<NotificationState> findByNotificationIdAndUserId(Long notificationId, Long userId);

	List<NotificationState> findByUserIdAndNotificationIdIn(Long userId, Collection<Long> notificationIds);
}
