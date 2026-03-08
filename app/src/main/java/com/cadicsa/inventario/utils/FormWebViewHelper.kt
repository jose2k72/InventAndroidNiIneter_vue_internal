package com.cadicsa.inventario.utils

import android.annotation.SuppressLint
import android.util.Log
import android.webkit.*
import com.cadicsa.inventario.FormActivity
import java.lang.ref.WeakReference

/**
 * Helper para configurar y gestionar el WebView de FormActivity.
 * Centraliza la lógica de configuración, clientes y depuración.
 */
class FormWebViewHelper(activity: FormActivity, private val webView: WebView) {

    private val activityRef = WeakReference(activity)
    private val activity: FormActivity? get() = activityRef.get()

    @SuppressLint("SetJavaScriptEnabled")
    fun setup() {
        val act = activity ?: return
        
        Log.d("FormWebViewHelper", "🏗️ Configurando WebView")

        webView.settings.apply {
            javaScriptEnabled = true
            // Deshabilitar caché para desarrollo
            cacheMode = WebSettings.LOAD_NO_CACHE
        }

        // Limpieza de caché
        webView.clearCache(true)
        webView.clearFormData()
        webView.clearHistory()

        // WebViewClient para interceptar carga y manejar finalización
        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                Log.d("FormWebViewHelper", "✅ Página cargada: $url")
                
                // Inyectar datos de edición si existen
                act.injectExistingData()
            }

            override fun onReceivedError(view: WebView?, request: WebResourceRequest?, error: WebResourceError?) {
                super.onReceivedError(view, request, error)
                Log.e("FormWebViewHelper", "❌ Error WebView: ${error?.description}")
            }
        }

        // WebChromeClient para depuración de consola
        webView.webChromeClient = object : WebChromeClient() {
            override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                val level = when (consoleMessage?.messageLevel()) {
                    ConsoleMessage.MessageLevel.ERROR -> "❌ JS-ERROR"
                    ConsoleMessage.MessageLevel.WARNING -> "⚠️ JS-WARN"
                    else -> "📝 JS-LOG"
                }
                Log.d("FormWebViewHelper-JS", "$level ${consoleMessage?.message()} (${consoleMessage?.sourceId()}:${consoleMessage?.lineNumber()})")
                return true
            }

            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                super.onProgressChanged(view, newProgress)
                if (newProgress == 100) Log.d("FormWebViewHelper", "📊 Carga completada")
            }
        }

        // Cargar URL inicial con cache-busting
        val timestamp = System.currentTimeMillis()
        val url = "file:///android_asset/web/index.html?v=$timestamp"
        webView.loadUrl(url)
    }
}
