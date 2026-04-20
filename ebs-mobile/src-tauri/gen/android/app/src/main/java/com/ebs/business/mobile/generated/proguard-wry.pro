# THIS FILE IS AUTO-GENERATED. DO NOT MODIFY!!

# Copyright 2020-2023 Tauri Programme within The Commons Conservancy
# SPDX-License-Identifier: Apache-2.0
# SPDX-License-Identifier: MIT

-keep class com.ebs.business.mobile.* {
  native <methods>;
}

-keep class com.ebs.business.mobile.WryActivity {
  public <init>(...);

  void setWebView(com.ebs.business.mobile.RustWebView);
  java.lang.Class getAppClass(...);
  java.lang.String getVersion();
}

-keep class com.ebs.business.mobile.Ipc {
  public <init>(...);

  @android.webkit.JavascriptInterface public <methods>;
}

-keep class com.ebs.business.mobile.RustWebView {
  public <init>(...);

  void loadUrlMainThread(...);
  void loadHTMLMainThread(...);
  void evalScript(...);
}

-keep class com.ebs.business.mobile.RustWebChromeClient,com.ebs.business.mobile.RustWebViewClient {
  public <init>(...);
}
