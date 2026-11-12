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
 * 更新页数据为空时导入历史版本记录。
 *
 * <p>表结构由 Hibernate 的 {@code ddl-auto=update} 创建，这里只负责灌入
 * {@code db/changelog-seed.sql}。只要表里已有任意一条记录就跳过，不会重复导入。
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 1)
public class ChangelogSeedInitializer implements ApplicationRunner {

	private static final Logger log = LoggerFactory.getLogger(ChangelogSeedInitializer.class);

	private final JdbcTemplate jdbc;

	private final DataSource dataSource;

	public ChangelogSeedInitializer(JdbcTemplate jdbc, DataSource dataSource) {
		this.jdbc = jdbc;
		this.dataSource = dataSource;
	}

	@Override
	public void run(ApplicationArguments args) {
		if (count() > 0) {
			return;
		}
		ResourceDatabasePopulator populator = new ResourceDatabasePopulator(
				new ClassPathResource("db/changelog-seed.sql"));
		populator.setSqlScriptEncoding("UTF-8");
		populator.execute(dataSource);
		log.info("更新页记录为空，已导入版本数据：changelog_entries={}", count());
	}

	private long count() {
		Long value = jdbc.queryForObject("select count(*) from changelog_entries", Long.class);
		return value == null ? 0 : value;
	}
}
