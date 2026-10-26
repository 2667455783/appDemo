package com.xuexibaodian.app.repo;

import com.xuexibaodian.app.entity.AppUser;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppUserRepository extends JpaRepository<AppUser, Long> {
  Optional<AppUser> findByDeviceId(String deviceId);
}
