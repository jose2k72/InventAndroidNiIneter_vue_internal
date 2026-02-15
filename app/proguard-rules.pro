# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.kts.

# Keep JavaScript interface for WebView
-keepclassmembers class com.cadicsa.inventario.aceras.FormActivity$AndroidBridge {
    public *;
}

# Keep data classes
-keep class com.cadicsa.inventario.aceras.** { *; }
