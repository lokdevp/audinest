import { applyFdroidGradle } from '../plugins/withFdroid';

// Trimmed from the app/build.gradle that `expo prebuild` generates.
const template = `apply plugin: "com.android.application"

android {
    defaultConfig {
        versionCode 1
    }
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            // Caution! In production, you need to generate your own keystore file.
            signingConfig signingConfigs.debug
            minifyEnabled enableMinifyInReleaseBuilds
        }
    }
}
`;

const buildType = (gradle: string, name: string) =>
  gradle.match(new RegExp(`buildTypes \\{[\\s\\S]*?\\n {8}${name} \\{([\\s\\S]*?)\\n {8}\\}`))![1];

describe('applyFdroidGradle', () => {
  const gradle = applyFdroidGradle(template);

  it('drops the dependency info blob and splits release APKs by ABI', () => {
    expect(gradle).toContain('includeInApk = false');
    expect(gradle).toContain("include 'armeabi-v7a', 'arm64-v8a', 'x86_64'");
    expect(gradle).toContain('universalApk true');
    expect(gradle).toContain("'armeabi-v7a': 1, 'arm64-v8a': 2, 'x86_64': 3");
  });

  it('signs release builds with the upload key only when it is configured', () => {
    expect(buildType(gradle, 'release')).not.toContain('signingConfigs.debug');
    expect(buildType(gradle, 'release')).toContain(
      "signingConfig findProperty('AUDINEST_UPLOAD_STORE_FILE') ? signingConfigs.release : null",
    );
    expect(buildType(gradle, 'debug')).toContain('signingConfig signingConfigs.debug');
    expect(gradle).toContain("storeFile file(findProperty('AUDINEST_UPLOAD_STORE_FILE'))");
  });

  it('is idempotent', () => {
    expect(applyFdroidGradle(gradle)).toBe(gradle);
  });

  it('fails loudly when the template changes shape', () => {
    expect(() => applyFdroidGradle('android {\n}\n')).toThrow(/release signingConfig/);
  });
});
