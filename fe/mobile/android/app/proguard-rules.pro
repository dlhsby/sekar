# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# ========================================
# React Native Core
# ========================================

# Keep React Native core classes
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }

# Keep Hermes unicode classes
-keep class com.facebook.hermes.unicode.** { *; }

# Keep React Native modules
-keep,includedescriptorclasses class * { native <methods>; }

# Keep JavaScript interface classes
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep custom React packages
-keep class com.sekarapp.** { *; }

# Don't warn about React Native
-dontwarn com.facebook.react.**
-dontwarn com.facebook.hermes.**
-dontwarn com.facebook.jni.**

# ========================================
# React Native Geolocation Service
# ========================================

-keep class com.agontuk.RNFusedLocation.** { *; }
-dontwarn com.agontuk.RNFusedLocation.**

# Google Play Services Location
-keep class com.google.android.gms.location.** { *; }
-dontwarn com.google.android.gms.**

# ========================================
# React Native Maps
# ========================================

-keep class com.airbnb.android.react.maps.** { *; }
-keep class com.google.android.gms.maps.** { *; }
-dontwarn com.google.android.gms.maps.**

# ========================================
# React Native Image Picker
# ========================================

-keep class com.imagepicker.** { *; }
-dontwarn com.imagepicker.**

# ========================================
# React Native Async Storage
# ========================================

-keep class com.reactnativecommunity.asyncstorage.** { *; }
-dontwarn com.reactnativecommunity.asyncstorage.**

# ========================================
# React Native Encrypted Storage
# ========================================

-keep class com.emeraldsanto.encryptedstorage.** { *; }
-dontwarn com.emeraldsanto.encryptedstorage.**

# ========================================
# OkHttp (used by React Native networking)
# ========================================

-keepattributes Signature
-keepattributes *Annotation*
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }
-dontwarn okhttp3.**
-dontwarn okio.**

# OkHttp platform used only on JVM and when Conscrypt dependency is available
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**

# ========================================
# JSC (JavaScriptCore)
# ========================================

-keep class org.webkit.** { *; }

# ========================================
# Fresco (Image loading library used by React Native)
# ========================================

-keep class com.facebook.imagepipeline.** { *; }
-keep class com.facebook.drawee.** { *; }
-dontwarn com.facebook.imagepipeline.**
-dontwarn com.facebook.drawee.**

# ========================================
# General Android
# ========================================

# Keep annotations
-keepattributes *Annotation*

# Keep source file and line numbers for debugging
-keepattributes SourceFile,LineNumberTable

# Keep native methods
-keepclassmembers class * {
    native <methods>;
}

# Keep enums
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# Keep Parcelable implementations
-keep class * implements android.os.Parcelable {
    public static final android.os.Parcelable$Creator *;
}

# Keep Serializable implementations
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}

# ========================================
# Debugging Support
# ========================================

# Remove debug logging in release builds
-assumenosideeffects class android.util.Log {
    public static *** d(...);
    public static *** v(...);
    public static *** i(...);
}
