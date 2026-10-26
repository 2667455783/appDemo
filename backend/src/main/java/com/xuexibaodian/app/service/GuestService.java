package com.xuexibaodian.app.service;

import com.xuexibaodian.app.dto.BootstrapResponse;
import com.xuexibaodian.app.entity.AppUser;
import com.xuexibaodian.app.entity.UserProfile;
import com.xuexibaodian.app.repo.AppUserRepository;
import com.xuexibaodian.app.repo.UserProfileRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GuestService {

  private final AppUserRepository users;
  private final UserProfileRepository profiles;
  private final ProfileMapper mapper;

  public GuestService(
      AppUserRepository users, UserProfileRepository profiles, ProfileMapper mapper) {
    this.users = users;
    this.profiles = profiles;
    this.mapper = mapper;
  }

  @Transactional
  public BootstrapResponse bootstrap(String deviceId) {
    String id = deviceId.trim();
    return users
        .findByDeviceId(id)
        .map(
            user -> {
              UserProfile profile =
                  profiles
                      .findByUserId(user.getId())
                      .orElseGet(() -> createDefaultProfile(user.getId()));
              return new BootstrapResponse(user.getId(), id, false, mapper.toDto(profile));
            })
        .orElseGet(() -> createNew(id));
  }

  private BootstrapResponse createNew(String deviceId) {
    AppUser user = new AppUser();
    user.setDeviceId(deviceId);
    users.save(user);
    UserProfile profile = createDefaultProfile(user.getId());
    return new BootstrapResponse(user.getId(), deviceId, true, mapper.toDto(profile));
  }

  private UserProfile createDefaultProfile(Long userId) {
    UserProfile p = new UserProfile();
    p.setUserId(userId);
    p.setOnboarded(false);
    p.setName("\u5b66\u4e60\u8005");
    p.setMotto("");
    p.setLevel("cet4");
    p.setTargetScore(425);
    p.setStreak(0);
    p.setActiveDomain("english");
    p.setDomainLevels("{\"english\":\"cet4\"}");
    return profiles.save(p);
  }
}
