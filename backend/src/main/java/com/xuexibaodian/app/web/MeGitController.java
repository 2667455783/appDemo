package com.xuexibaodian.app.web;

import com.xuexibaodian.app.common.ApiResponse;
import com.xuexibaodian.app.dto.GitBranchPutRequest;
import com.xuexibaodian.app.dto.GitBranchSnapshotDto;
import com.xuexibaodian.app.dto.GitRepoDetailDto;
import com.xuexibaodian.app.dto.GitRepoSummaryDto;
import com.xuexibaodian.app.dto.GitRepoUpsertRequest;
import com.xuexibaodian.app.service.GitWorkspaceService;
import java.util.List;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/me/git")
public class MeGitController {

  private final GitWorkspaceService git;

  public MeGitController(GitWorkspaceService git) {
    this.git = git;
  }

  @GetMapping("/repos")
  public ApiResponse<List<GitRepoSummaryDto>> list() {
    return ApiResponse.ok(git.list(DeviceContext.userId()));
  }

  @GetMapping("/repos/{id}")
  public ApiResponse<GitRepoDetailDto> get(@PathVariable Long id) {
    return ApiResponse.ok(git.get(DeviceContext.userId(), id));
  }

  @PutMapping("/repos")
  public ApiResponse<GitRepoDetailDto> upsert(@RequestBody GitRepoUpsertRequest body) {
    return ApiResponse.ok(git.upsert(DeviceContext.userId(), body));
  }

  @DeleteMapping("/repos/{id}")
  public ApiResponse<Void> delete(@PathVariable Long id) {
    git.delete(DeviceContext.userId(), id);
    return ApiResponse.ok();
  }

  @GetMapping("/repos/{id}/branches/{branch}")
  public ApiResponse<GitBranchSnapshotDto> getBranch(
      @PathVariable Long id, @PathVariable String branch) {
    return ApiResponse.ok(git.getBranch(DeviceContext.userId(), id, branch));
  }

  @PutMapping("/repos/{id}/branches/{branch}")
  public ApiResponse<GitBranchSnapshotDto> putBranch(
      @PathVariable Long id,
      @PathVariable String branch,
      @RequestBody GitBranchPutRequest body) {
    return ApiResponse.ok(git.putBranch(DeviceContext.userId(), id, branch, body));
  }
}
