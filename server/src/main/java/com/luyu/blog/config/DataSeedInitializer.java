package com.luyu.blog.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;

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
		Resource resource = new ClassPathResource("db/seed-data.sql");
		if (!hasStatements(resource)) {
			// 脚本只有注释时不能交给 ResourceDatabasePopulator，否则它会抛
			// “'script' must not be null or empty” 让空库直接启动失败
			log.info("种子脚本为空，跳过导入");
			return;
		}
		ResourceDatabasePopulator populator = new ResourceDatabasePopulator(resource);
		populator.setSqlScriptEncoding("UTF-8");
		populator.execute(dataSource);
		log.info("检测到空库，已导入种子数据：users={}, post_comments={}",
				count("users"), count("post_comments"));
	}

	private boolean hasStatements(Resource resource) {
		try (var reader = new BufferedReader(new InputStreamReader(resource.getInputStream(),
				StandardCharsets.UTF_8))) {
			return reader.lines()
					.map(String::trim)
					.anyMatch(line -> !line.isEmpty() && !line.startsWith("--"));
		} catch (IOException ex) {
			throw new IllegalStateException("读取种子脚本失败：" + resource, ex);
		}
	}

	private boolean isEmpty() {
		return count("users") == 0 && count("post_comments") == 0;
	}

	private long count(String table) {
		Long value = jdbc.queryForObject("select count(*) from " + table, Long.class);
		return value == null ? 0 : value;
	}
}
