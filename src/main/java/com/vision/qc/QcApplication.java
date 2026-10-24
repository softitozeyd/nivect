package com.vision.qc;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling // Scheduled görevleri aktif eder
public class QcApplication {
    public static void main(String[] args) {
        SpringApplication.run(QcApplication.class, args);
    }
}