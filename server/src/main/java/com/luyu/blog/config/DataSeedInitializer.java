package com.luyu.blog.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;

/**
 * 空库首次启动时导入干净的种子数据。
 *
 * <p>交代背景：库不存在由 {@link DatabaseBootstrapInitializer} 负责创建，表结构由
 * {@code spring.jpa.hibernate.ddl-auto=update} 负责补齐；这里只处理「库和表都建好了，
 * 但一条数据都没有」的情况——把 {@code db/seed-data.sql} 里的用户、评论、点赞、统计导进去。
 *
 * <p>只要 users 或 post_comments 里已有数据就直接跳过，不会覆盖或重复导入。
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class DataSeedInitializer implements ApplicationRunner {

	private static final Logger log = LoggerFactory.getLogger(DataSeedInitializer.class);

	private final JdbcTemplate jdbc;

	private final DataSource dataSource;

	public DataSeedInitializer(JdbcTemplate jdbc, DataSource dataSource) {
		this.jdbc = jdbc;
		this.dataSource = dataSource;
	}

	@Override
	public void run(ApplicationArguments args) {
		if (!isEmpty()) {
			return;
		}
		ResourceDatabasePopulator populator = new ResourceDatabasePopulator(
				new ClassPathResource("db/seed-data.sql"));
		populator.setSqlScriptEncoding("UTF-8");
		populator.execute(dataSource);
		log.info("检测到空库，已导入种子数据：users={}, post_comments={}",
				count("users"), count("post_comments"));
	}

	private boolean isEmpty() {
		return count("users") == 0 && count("post_comments") == 0;
	}

	private long count(String table) {
		Long value = jdbc.queryForObject("select count(*) from " + table, Long.class);
		return value == null ? 0 : value;
	}
}
