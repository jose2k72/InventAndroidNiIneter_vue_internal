import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// Función para generar versión automática basada en timestamp (visual)
fun getAutoVersion(): String {
    val dateFormat = SimpleDateFormat("yyyy.MM.dd.HHmm", Locale.US)
    return dateFormat.format(Date())
}

// Función para generar versionCode incremental basado en epoch timestamp
// Usa segundos desde 1970 dividido entre 10 para que quepa en Int
// Siempre crece, nunca se repite, funciona por décadas
fun getAutoVersionCode(): Int {
    return (System.currentTimeMillis() / 1000 / 10).toInt()
}

android {
    namespace = "com.cadicsa.inventario"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.cadicsa.inventario.ni.ineter"
        minSdk = 24
        targetSdk = 30  // CAMBIADO de 34 a 30 para evitar restricciones de Android 14
        versionCode = getAutoVersionCode()  // Generado automáticamente: yyMMddHHmm
        versionName = getAutoVersion()      // Generado automáticamente: yyyy.MM.dd.HHmm

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        
        // Configuración centralizada del directorio de almacenamiento
        // CAMBIAR ESTE VALOR para cada variante de la aplicación
        buildConfigField("String", "STORAGE_DIR_NAME", "\"CADIC.NI.INETER\"")
    }



    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    androidResources {
        noCompress += listOf("js", "css", "html")
        ignoreAssetsPattern = "!.svn:!.git:.*:!CVS:!thumbs.db:!picasa.ini:!*.scc:*~"
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        viewBinding = true
        buildConfig = true  // Necesario para acceder a BuildConfig.STORAGE_DIR_NAME
    }
}

dependencies {
    // AndroidX Core
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation("com.google.android.material:material:1.11.0")
    implementation("androidx.constraintlayout:constraintlayout:2.1.4")
    
    // Lifecycle
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.6.2")
    implementation("androidx.lifecycle:lifecycle-viewmodel-ktx:2.6.2")
    
    // Google Maps
    implementation("com.google.android.gms:play-services-maps:18.2.0")
    implementation("com.google.android.gms:play-services-location:21.0.1")
    // android-maps-utils ELIMINADA - migrada a JTS
    
    
    // WebView
    implementation("androidx.webkit:webkit:1.9.0")
    
    // Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
    
    // Geometría y Proyecciones (JTS + Proj4J)
    implementation("org.locationtech.jts:jts-core:1.19.0")
    implementation("org.locationtech.proj4j:proj4j:1.3.0")
    
    // Testing
    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.1.5")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.5.1")
}
