package com.luyu.blog.repo;

import com.luyu.blog.domain.Audience;
import com.luyu.blog.domain.Notification;
import com.luyu.blog.domain.User;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {

	@Query("""
			select n from Notification n
			left join NotificationState s on s.notification = n and s.user = :user
			where s.hiddenAt is null
			  and (
			    n.audience = :allAudience
			    or (n.audience = :adminAudience and :admin = true)
			    or n.recipient = :user
			  )
			""")
	List<Notification> findVisibleFor(
			@Param("user") User user,
			@Param("admin") boolean admin,
			@Param("allAudience") Audience allAudience,
			@Param("adminAudience") Audience adminAudience);

	/** 分页查询可见通知：置顶优先，其余按时间倒序，过滤在 SQL 层完成 */
	@Query("""
			select n from Notification n
			left join NotificationState s on s.notification = n and s.user = :user
			where s.hiddenAt is null
			  and (
			    n.audience = :allAudience
			    or (n.audience = :adminAudience and :admin = true)
			    or n.recipient = :user
			  )
			  and (:unreadOnly = false or s.readAt is null)
			  and (:readOnly = false or s.readAt is not null)
			order by s.pinnedAt desc nulls last, n.createdAt desc
			""")
	List<Notification> findVisiblePage(
			@Param("user") User user,
			@Param("admin") boolean admin,
			@Param("allAudience") Audience allAudience,
			@Param("adminAudience") Audience adminAudience,
			@Param("unreadOnly") boolean unreadOnly,
			@Param("readOnly") boolean readOnly,
			Pageable pageable);

	@Query("""
			select count(n) from Notification n
			left join NotificationState s on s.notification = n and s.user = :user
			where s.hiddenAt is null and s.readAt is null
			  and (
			    n.audience = :allAudience
			    or (n.audience = :adminAudience and :admin = true)
			    or n.recipient = :user
			  )
			""")
	long countVisibleUnread(
			@Param("user") User user,
			@Param("admin") boolean admin,
			@Param("allAudience") Audience allAudience,
			@Param("adminAudience") Audience adminAudience);
}
