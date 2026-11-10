package com.luyu.blog.repo;

import com.luyu.blog.domain.NotificationState;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface NotificationStateRepository extends JpaRepository<NotificationState, UUID> {

	Optional<NotificationState> findByNotificationIdAndUserId(UUID notificationId, UUID userId);

	List<NotificationState> findByUserIdAndNotificationIdIn(UUID userId, Collection<UUID> notificationIds);
}
