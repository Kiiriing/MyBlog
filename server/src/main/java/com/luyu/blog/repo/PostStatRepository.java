package com.luyu.blog.repo;

import com.luyu.blog.domain.PostStat;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PostStatRepository extends JpaRepository<PostStat, String> {

	List<PostStat> findByPostSlugIn(List<String> postSlugs);
}
