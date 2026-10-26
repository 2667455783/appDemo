package com.xuexibaodian.app.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.xuexibaodian.app.common.ApiException;
import com.xuexibaodian.app.dto.GitBranchPutRequest;
import com.xuexibaodian.app.dto.GitBranchSnapshotDto;
import com.xuexibaodian.app.dto.GitRepoDetailDto;
import com.xuexibaodian.app.dto.GitRepoSummaryDto;
import com.xuexibaodian.app.dto.GitRepoUpsertRequest;
import com.xuexibaodian.app.entity.GitBranchSnapshot;
import com.xuexibaodian.app.entity.GitRepo;
import com.xuexibaodian.app.repo.GitBranchSnapshotRepository;
import com.xuexibaodian.app.repo.GitRepoRepository;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GitWorkspaceService {

  private final GitRepoRepository repos;
  private final GitBranchSnapshotRepository snapshots;
  private final JsonHelper json;

  public GitWorkspaceService(
      GitRepoRepository repos, GitBranchSnapshotRepository snapshots, JsonHelper json) {
    this.repos = repos;
    this.snapshots = snapshots;
    this.json = json;
  }

  @Transactional(readOnly = true)
  public List<GitRepoSummaryDto> list(Long userId) {
    return repos.findByUserIdOrderByUpdatedAtDesc(userId).stream()
        .map(this::toSummary)
        .collect(Collectors.toList());
  }

  @Transactional(readOnly = true)
  public GitRepoDetailDto get(Long userId, Long repoId) {
    GitRepo repo = requireRepo(userId, repoId);
    GitRepoDetailDto dto = toDetail(repo);
    GitBranchSnapshot snap =
        snapshots
            .findByRepoIdAndBranchName(repo.getId(), repo.getCurrentBranch())
            .orElse(null);
    if (snap != null) {
      dto.files = readFiles(snap.getFilesJson());
      if (snap.getOpenFile() != null && !snap.getOpenFile().isBlank()) {
        dto.openFile = snap.getOpenFile();
      }
    } else {
      dto.files = Collections.emptyMap();
    }
    return dto;
  }

  @Transactional
  public GitRepoDetailDto upsert(Long userId, GitRepoUpsertRequest body) {
    if (body == null || isBlank(body.provider) || isBlank(body.owner) || isBlank(body.repo)) {
      throw new ApiException(400, "provider / owner / repo 不能为空");
    }
    if (body.files == null || body.files.isEmpty()) {
      throw new ApiException(400, "files 不能为空");
    }
    String subpath = normalizeSubpath(body.subpath);
    String branch =
        firstNonBlank(body.currentBranch, body.defaultBranch, "main");

    GitRepo repo =
        repos
            .findByUserIdAndProviderAndOwnerAndRepoAndSubpath(
                userId, body.provider.trim(), body.owner.trim(), body.repo.trim(), subpath)
            .orElseGet(GitRepo::new);

    repo.setUserId(userId);
    repo.setProvider(body.provider.trim());
    repo.setOwner(body.owner.trim());
    repo.setRepo(body.repo.trim());
    repo.setSubpath(subpath);
    repo.setSourceUrl(nullToEmpty(body.sourceUrl));
    repo.setTitle(firstNonBlank(body.title, body.owner + "/" + body.repo));
    repo.setDefaultBranch(firstNonBlank(body.defaultBranch, branch));
    repo.setCurrentBranch(branch);
    repo.setAssetBase(body.assetBase);
    repo.setDetectedRoot(body.detectedRoot);
    repo.setOpenFile(body.openFile);
    repos.save(repo);

    upsertSnapshot(repo.getId(), branch, body.files, body.openFile);
    return get(userId, repo.getId());
  }

  @Transactional(readOnly = true)
  public GitBranchSnapshotDto getBranch(Long userId, Long repoId, String branch) {
    GitRepo repo = requireRepo(userId, repoId);
    String name = requireBranchName(branch);
    GitBranchSnapshot snap =
        snapshots
            .findByRepoIdAndBranchName(repo.getId(), name)
            .orElseThrow(() -> new ApiException(404, "分支快照不存在：" + name));
    GitBranchSnapshotDto dto = new GitBranchSnapshotDto();
    dto.repoId = repo.getId();
    dto.branchName = snap.getBranchName();
    dto.openFile = snap.getOpenFile();
    dto.files = readFiles(snap.getFilesJson());
    return dto;
  }

  @Transactional
  public GitBranchSnapshotDto putBranch(
      Long userId, Long repoId, String branch, GitBranchPutRequest body) {
    GitRepo repo = requireRepo(userId, repoId);
    String name = requireBranchName(branch);
    if (body == null || body.files == null || body.files.isEmpty()) {
      throw new ApiException(400, "files 不能为空");
    }
    upsertSnapshot(repo.getId(), name, body.files, body.openFile);
    boolean makeCurrent = body.makeCurrent == null || body.makeCurrent;
    if (makeCurrent) {
      repo.setCurrentBranch(name);
      if (body.openFile != null) repo.setOpenFile(body.openFile);
      repos.save(repo);
    }
    return getBranch(userId, repoId, name);
  }

  @Transactional
  public void delete(Long userId, Long repoId) {
    GitRepo repo = requireRepo(userId, repoId);
    snapshots.deleteByRepoId(repo.getId());
    repos.delete(repo);
  }

  private void upsertSnapshot(
      Long repoId, String branch, Map<String, String> files, String openFile) {
    GitBranchSnapshot snap =
        snapshots
            .findByRepoIdAndBranchName(repoId, branch)
            .orElseGet(
                () -> {
                  GitBranchSnapshot s = new GitBranchSnapshot();
                  s.setRepoId(repoId);
                  s.setBranchName(branch);
                  return s;
                });
    snap.setFilesJson(json.write(files));
    snap.setOpenFile(openFile);
    snap.setFetchedAt(LocalDateTime.now());
    snapshots.save(snap);
  }

  private GitRepo requireRepo(Long userId, Long repoId) {
    return repos
        .findByIdAndUserId(repoId, userId)
        .orElseThrow(() -> new ApiException(404, "仓库缓存不存在"));
  }

  private GitRepoSummaryDto toSummary(GitRepo repo) {
    GitRepoSummaryDto dto = new GitRepoSummaryDto();
    fillMeta(dto, repo);
    dto.cachedBranches =
        snapshots.findByRepoId(repo.getId()).stream()
            .map(GitBranchSnapshot::getBranchName)
            .sorted()
            .collect(Collectors.toList());
    return dto;
  }

  private GitRepoDetailDto toDetail(GitRepo repo) {
    GitRepoDetailDto dto = new GitRepoDetailDto();
    fillMeta(dto, repo);
    dto.cachedBranches =
        snapshots.findByRepoId(repo.getId()).stream()
            .map(GitBranchSnapshot::getBranchName)
            .sorted()
            .collect(Collectors.toList());
    return dto;
  }

  private void fillMeta(GitRepoSummaryDto dto, GitRepo repo) {
    dto.id = repo.getId();
    dto.provider = repo.getProvider();
    dto.owner = repo.getOwner();
    dto.repo = repo.getRepo();
    dto.subpath = repo.getSubpath();
    dto.sourceUrl = repo.getSourceUrl();
    dto.title = repo.getTitle();
    dto.defaultBranch = repo.getDefaultBranch();
    dto.currentBranch = repo.getCurrentBranch();
    dto.assetBase = repo.getAssetBase();
    dto.detectedRoot = repo.getDetectedRoot();
    dto.openFile = repo.getOpenFile();
  }

  private void fillMeta(GitRepoDetailDto dto, GitRepo repo) {
    dto.id = repo.getId();
    dto.provider = repo.getProvider();
    dto.owner = repo.getOwner();
    dto.repo = repo.getRepo();
    dto.subpath = repo.getSubpath();
    dto.sourceUrl = repo.getSourceUrl();
    dto.title = repo.getTitle();
    dto.defaultBranch = repo.getDefaultBranch();
    dto.currentBranch = repo.getCurrentBranch();
    dto.assetBase = repo.getAssetBase();
    dto.detectedRoot = repo.getDetectedRoot();
    dto.openFile = repo.getOpenFile();
  }

  private Map<String, String> readFiles(String raw) {
    Map<String, String> map = json.read(raw, new TypeReference<Map<String, String>>() {});
    return map == null ? Collections.emptyMap() : map;
  }

  private static String normalizeSubpath(String subpath) {
    if (subpath == null) return "";
    return subpath.replaceAll("^/+|/+$", "");
  }

  private static String requireBranchName(String branch) {
    if (isBlank(branch)) throw new ApiException(400, "branch 不能为空");
    String name = branch.trim();
    if (name.length() > 128) throw new ApiException(400, "分支名过长");
    return name;
  }

  private static boolean isBlank(String s) {
    return s == null || s.isBlank();
  }

  private static String nullToEmpty(String s) {
    return s == null ? "" : s;
  }

  private static String firstNonBlank(String... values) {
    if (values == null) return "";
    for (String v : values) {
      if (v != null && !v.isBlank()) return v.trim();
    }
    return "";
  }
}
