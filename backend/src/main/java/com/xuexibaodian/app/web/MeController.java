package com.xuexibaodian.app.web;

import com.xuexibaodian.app.common.ApiResponse;
import com.xuexibaodian.app.dto.ProfileDto;
import com.xuexibaodian.app.dto.StudySnapshotDto;
import com.xuexibaodian.app.service.ProfileService;
import com.xuexibaodian.app.service.StudyService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/me")
public class MeController {

  private final ProfileService profileService;
  private final StudyService studyService;

  public MeController(ProfileService profileService, StudyService studyService) {
    this.profileService = profileService;
    this.studyService = studyService;
  }

  @GetMapping("/profile")
  public ApiResponse<ProfileDto> getProfile() {
    return ApiResponse.ok(profileService.get(DeviceContext.userId()));
  }

  @PutMapping("/profile")
  public ApiResponse<ProfileDto> putProfile(@RequestBody ProfileDto body) {
    return ApiResponse.ok(profileService.put(DeviceContext.userId(), body));
  }

  @GetMapping("/study/{domainId}")
  public ApiResponse<StudySnapshotDto> getStudy(@PathVariable String domainId) {
    return ApiResponse.ok(studyService.get(DeviceContext.userId(), domainId));
  }

  @PutMapping("/study/{domainId}")
  public ApiResponse<StudySnapshotDto> putStudy(
      @PathVariable String domainId, @RequestBody StudySnapshotDto body) {
    return ApiResponse.ok(studyService.put(DeviceContext.userId(), domainId, body));
  }
}
