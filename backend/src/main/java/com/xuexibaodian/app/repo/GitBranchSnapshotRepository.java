package com.xuexibaodian.app.repo;

import com.xuexibaodian.app.entity.GitBranchSnapshot;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GitBranchSnapshotRepository extends JpaRepository<GitBranchSnapshot, Long> {
  List<GitBranchSnapshot> findByRepoId(Long repoId);

  Optional<GitBranchSnapshot> findByRepoIdAndBranchName(Long repoId, String branchName);

  void deleteByRepoId(Long repoId);
}
