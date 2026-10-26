package com.xuexibaodian.app.repo;

import com.xuexibaodian.app.entity.GitRepo;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GitRepoRepository extends JpaRepository<GitRepo, Long> {
  List<GitRepo> findByUserIdOrderByUpdatedAtDesc(Long userId);

  Optional<GitRepo> findByIdAndUserId(Long id, Long userId);

  Optional<GitRepo> findByUserIdAndProviderAndOwnerAndRepoAndSubpath(
      Long userId, String provider, String owner, String repo, String subpath);
}
