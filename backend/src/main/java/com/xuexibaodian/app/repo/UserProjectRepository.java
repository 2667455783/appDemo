package com.xuexibaodian.app.repo;

import com.xuexibaodian.app.entity.UserProject;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserProjectRepository extends JpaRepository<UserProject, Long> {
  List<UserProject> findByUserIdOrderByUpdatedAtDesc(Long userId);

  Optional<UserProject> findByIdAndUserId(Long id, Long userId);
}
