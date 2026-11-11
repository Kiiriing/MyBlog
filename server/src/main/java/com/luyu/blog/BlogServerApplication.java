package com.luyu.blog;

import com.luyu.blog.config.DatabaseBootstrapInitializer;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class BlogServerApplication {

	public static void main(String[] args) {
		SpringApplication application = new SpringApplication(BlogServerApplication.class);
		// 在 DataSource 初始化之前确认数据库存在，避免第一次部署时因库不存在而启动失败
		application.addInitializers(new DatabaseBootstrapInitializer());
		application.run(args);
	}

}
