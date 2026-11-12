package com.luyu.blog.repo;

import com.luyu.blog.domain.PostStat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PostStatRepository extends JpaRepository<PostStat, String> {

	List<PostStat> findByPostSlugIn(List<String> postSlugs);

	/** 批量落库阅读量；文章还没有统计行时直接插入 */
	@Modifying
	@Query(value = """
			insert into post_stats (post_slug, views, likes, favorites)
			values (:slug, :delta, 0, 0)
			on conflict (post_slug) do update set views = post_stats.views + excluded.views
			""", nativeQuery = true)
	void addViews(@Param("slug") String slug, @Param("delta") long delta);
}
