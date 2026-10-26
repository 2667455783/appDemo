package com.xuexibaodian.app.dto;

public record BootstrapResponse(Long userId, String deviceId, boolean created, ProfileDto profile) {}
