package com.luyu.blog.repo;

import com.luyu.blog.domain.Audience;
import com.luyu.blog.domain.Notification;
import com.luyu.blog.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

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
}
