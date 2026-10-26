package com.xuexibaodian.app.web;

import com.xuexibaodian.app.entity.AppUser;

public final class DeviceContext {

  private static final ThreadLocal<AppUser> HOLDER = new ThreadLocal<>();

  private DeviceContext() {}

  public static void set(AppUser user) {
    HOLDER.set(user);
  }

  public static AppUser get() {
    return HOLDER.get();
  }

  public static Long userId() {
    AppUser u = HOLDER.get();
    return u == null ? null : u.getId();
  }

  public static void clear() {
    HOLDER.remove();
  }
}
