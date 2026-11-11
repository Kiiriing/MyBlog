package com.luyu.blog.config;

import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.beans.factory.support.BeanDefinitionRegistry;
import org.springframework.beans.factory.support.BeanNameGenerator;

/**
 * 用全限定类名作为 bean 名。
 *
 * <p>混淆后不同包下的类可能被重命名成同一个短名（例如 com.luyu.blog.a.a 和 com.luyu.blog.b.a），
 * Spring 默认按短类名生成 bean 名，会直接抛 ConflictingBeanDefinitionException。
 * 换成全限定类名后每个类都唯一。未混淆的构建同样适用，只是 bean 名变成 FQCN，不影响功能。
 */
public class FqcnBeanNameGenerator implements BeanNameGenerator {

	@Override
	public String generateBeanName(BeanDefinition definition, BeanDefinitionRegistry registry) {
		return definition.getBeanClassName();
	}
}
