package com.ysc.aicodegenerator.service;

import org.springframework.stereotype.Service;

public interface ScreenshotService {
    String generateAndUploadScreenshot(String webUrl);
}
