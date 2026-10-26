package com.xuexibaodian.app.service;

import com.xuexibaodian.app.common.ApiException;
import com.xuexibaodian.app.dto.ProfileDto;
import com.xuexibaodian.app.entity.UserProfile;
import com.xuexibaodian.app.repo.UserProfileRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProfileService {

  private final UserProfileRepository profiles;
  private final ProfileMapper mapper;

  public ProfileService(UserProfileRepository profiles, ProfileMapper mapper) {
    this.profiles = profiles;
    this.mapper = mapper;
  }

  @Transactional(readOnly = true)
  public ProfileDto get(Long userId) {
    return mapper.toDto(require(userId));
  }

  @Transactional
  public ProfileDto put(Long userId, ProfileDto body) {
    UserProfile p = require(userId);
    mapper.apply(p, body);
    return mapper.toDto(profiles.save(p));
  }

  private UserProfile require(Long userId) {
    return profiles
        .findByUserId(userId)
        .orElseThrow(() -> new ApiException(404, "用户档案不存在"));
  }
}
