package com.ysc.aicodegenerator;

import org.apache.dubbo.config.spring.context.annotation.EnableDubbo;
import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;


@SpringBootApplication
@MapperScan("com.ysc.aicodegenerator.mapper")
@EnableDubbo
public class ZeoCodeUserApplication {
    public static void main(String[] args) {
        SpringApplication.run(ZeoCodeUserApplication.class, args);
    }
}
