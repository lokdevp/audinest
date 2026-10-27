// Release-build tweaks for F-Droid / IzzyOnDroid, applied at prebuild (see FDROID.md).
// Expo Go ignores config plugins, so this only affects dev and release builds.
const { withAppBuildGradle, withGradleProperties } = require('expo/config-plugins');

const MARKER = '// @fdroid';
const ABIS = ['armeabi-v7a', 'arm64-v8a', 'x86_64'];

const androidBlock = `
    ${MARKER}: added by plugins/withFdroid.js
    dependenciesInfo {
        // AGP otherwise embeds a Google-encrypted dependency blob that F-Droid and Izzy flag.
        includeInApk = false
        includeInBundle = false
    }
    splits {
        abi {
            reset()
            // Only release builds are split, so \`expo run:android\` still installs a single APK.
            enable gradle.startParameter.taskNames.any { it.toLowerCase().contains('release') }
            include ${ABIS.map((abi) => `'${abi}'`).join(', ')}
            universalApk true
        }
    }
`;

const releaseSigning = `
        release {
            // Signed only when the upload key is configured, otherwise unsigned so F-Droid can sign.
            if (findProperty('AUDINEST_UPLOAD_STORE_FILE')) {
                storeFile file(findProperty('AUDINEST_UPLOAD_STORE_FILE'))
                storePassword findProperty('AUDINEST_UPLOAD_STORE_PASSWORD')
                keyAlias findProperty('AUDINEST_UPLOAD_KEY_ALIAS')
                keyPassword findProperty('AUDINEST_UPLOAD_KEY_PASSWORD')
            }
        }`;

const versionCodes = `
${MARKER}: versionCode * 10 + ABI index (universal APK = 0), so F-Droid can ship one build per ABI.
def abiCodes = [${ABIS.map((abi, i) => `'${abi}': ${i + 1}`).join(', ')}]
androidComponents {
    onVariants(selector().withBuildType('release')) { variant ->
        variant.outputs.each { output ->
            def abi = output.filters.find { it.filterType.name() == 'ABI' }?.identifier
            output.versionCode.set(android.defaultConfig.versionCode * 10 + (abiCodes[abi] ?: 0))
        }
    }
}
`;

function replaceOnce(contents, pattern, replacement, what) {
  if (!pattern.test(contents)) {
    throw new Error(`withFdroid: could not find ${what} in app/build.gradle`);
  }
  return contents.replace(pattern, replacement);
}

/** Applies the F-Droid changes to the contents of `android/app/build.gradle`. Idempotent. */
function applyFdroidGradle(contents) {
  if (contents.includes(MARKER)) return contents;
  // Swap the release build type's debug signing before adding the release signing config,
  // so the first `release {` is still the build type.
  contents = replaceOnce(
    contents,
    /(\n\s*release \{[^}]*?)signingConfig signingConfigs\.debug/,
    "$1signingConfig findProperty('AUDINEST_UPLOAD_STORE_FILE') ? signingConfigs.release : null",
    'the release signingConfig',
  );
  contents = replaceOnce(contents, /(\n\s*signingConfigs \{\n\s*debug \{[^}]*\})/, `$1${releaseSigning}`, 'signingConfigs');
  contents = replaceOnce(contents, /(\nandroid \{\n)/, `$1${androidBlock}`, 'the android block');
  return contents + versionCodes;
}

function withFdroid(config) {
  config = withAppBuildGradle(config, (config) => {
    config.modResults.contents = applyFdroidGradle(config.modResults.contents);
    return config;
  });
  return withGradleProperties(config, (config) => {
    const key = 'reactNativeArchitectures';
    config.modResults = config.modResults.filter((item) => !(item.type === 'property' && item.key === key));
    config.modResults.push({ type: 'property', key, value: ABIS.join(',') });
    return config;
  });
}

module.exports = withFdroid;
module.exports.applyFdroidGradle = applyFdroidGradle;
