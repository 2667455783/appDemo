package com.xuexibaodian.app.web;

import com.xuexibaodian.app.common.ApiException;
import com.xuexibaodian.app.common.ApiResponse;
import com.xuexibaodian.app.dto.UserProjectDetailDto;
import com.xuexibaodian.app.dto.UserProjectSummaryDto;
import com.xuexibaodian.app.dto.UserProjectUpsertRequest;
import com.xuexibaodian.app.service.UserProjectService;
import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.util.List;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/me/projects")
public class MeProjectController {

  private final UserProjectService projects;

  public MeProjectController(UserProjectService projects) {
    this.projects = projects;
  }

  @GetMapping
  public ApiResponse<List<UserProjectSummaryDto>> list() {
    return ApiResponse.ok(projects.list(DeviceContext.userId()));
  }

  @GetMapping("/{id}")
  public ApiResponse<UserProjectDetailDto> get(@PathVariable Long id) {
    return ApiResponse.ok(projects.get(DeviceContext.userId(), id));
  }

  /** JSON 方式保存 / 更新个人项目（文件 map） */
  @PutMapping
  public ApiResponse<UserProjectDetailDto> upsert(@RequestBody UserProjectUpsertRequest body) {
    return ApiResponse.ok(projects.upsert(DeviceContext.userId(), body));
  }

  /** multipart 上传 zip（兼容表单） */
  @PostMapping(value = "/zip", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ApiResponse<UserProjectDetailDto> uploadZipMultipart(
      @RequestParam("file") MultipartFile file,
      @RequestParam(value = "title", required = false) String title) {
    return ApiResponse.ok(projects.uploadZip(DeviceContext.userId(), file, title));
  }

  /** 原始 zip 二进制上传（前端首选，避免 multipart 丢体） */
  @PostMapping(
      value = "/zip",
      consumes = {
        "application/zip",
        "application/x-zip-compressed",
        "application/octet-stream"
      })
  public ApiResponse<UserProjectDetailDto> uploadZipRaw(
      HttpServletRequest request, @RequestParam(value = "title", required = false) String title)
      throws IOException {
    byte[] bytes = request.getInputStream().readAllBytes();
    if (bytes.length == 0) {
      throw new ApiException(400, "zip 内容为空，请重新选择文件后再上传");
    }
    String name = title != null && !title.isBlank() ? title.trim() + ".zip" : "project.zip";
    return ApiResponse.ok(projects.uploadZipBytes(DeviceContext.userId(), bytes, name, title));
  }

  @DeleteMapping("/{id}")
  public ApiResponse<Void> delete(@PathVariable Long id) {
    projects.delete(DeviceContext.userId(), id);
    return ApiResponse.ok();
  }
}
