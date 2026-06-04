package com.cadicsa.inventario.utils

import android.content.Context
import android.database.Cursor
import android.util.Log
import com.cadicsa.inventario.DatabaseHelper
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.PrintWriter
import java.net.ServerSocket
import java.net.Socket
import java.nio.charset.StandardCharsets
import kotlin.concurrent.thread

object DebugDbServer {
    private const val TAG = "DebugDbServer"
    private const val PORT = 8080
    private var serverSocket: ServerSocket? = null
    private var isRunning = false

    fun start(context: Context) {
        if (isRunning) return
        isRunning = true
        thread(start = true, name = "DebugDbServerThread") {
            try {
                serverSocket = ServerSocket(PORT)
                Log.i(TAG, "🚀 Servidor de depuración de BD iniciado en puerto $PORT")
                while (isRunning) {
                    val socket = serverSocket?.accept() ?: break
                    thread {
                        handleClient(context, socket)
                    }
                }
            } catch (e: Exception) {
                if (isRunning) {
                    Log.e(TAG, "Error en el servidor de depuración: ${e.message}", e)
                }
            }
        }
    }

    fun stop() {
        isRunning = false
        try {
            serverSocket?.close()
            serverSocket = null
            Log.i(TAG, "🛑 Servidor de depuración detenido")
        } catch (e: Exception) {
            Log.e(TAG, "Error al detener el servidor: ${e.message}")
        }
    }

    private fun handleClient(context: Context, socket: Socket) {
        try {
            val reader = BufferedReader(InputStreamReader(socket.getInputStream(), StandardCharsets.UTF_8))
            val writer = PrintWriter(socket.getOutputStream())

            val firstLine = reader.readLine() ?: return
            val parts = firstLine.split(" ")
            if (parts.size < 2) return
            val method = parts[0]
            val pathWithQuery = parts[1]

            var contentLength = 0
            var line: String?
            while (reader.readLine().also { line = it } != null) {
                if (line!!.isEmpty()) break
                if (line!!.startsWith("Content-Length:", ignoreCase = true)) {
                    contentLength = line!!.substring(15).trim().toIntOrNull() ?: 0
                }
            }

            var sqlQuery = ""

            if (method.equals("POST", ignoreCase = true) && contentLength > 0) {
                val bodyChars = CharArray(contentLength)
                var read = 0
                while (read < contentLength) {
                    val r = reader.read(bodyChars, read, contentLength - read)
                    if (r == -1) break
                    read += r
                }
                sqlQuery = String(bodyChars).trim()
            } else if (method.equals("GET", ignoreCase = true)) {
                val queryIdx = pathWithQuery.indexOf("?")
                if (queryIdx != -1) {
                    val queryParams = pathWithQuery.substring(queryIdx + 1)
                    val pairs = queryParams.split("&")
                    for (pair in pairs) {
                        val idx = pair.indexOf("=")
                        if (idx > 0 && pair.substring(0, idx) == "q") {
                            sqlQuery = java.net.URLDecoder.decode(pair.substring(idx + 1), "UTF-8")
                        }
                    }
                }
            }

            if (method.equals("OPTIONS", ignoreCase = true)) {
                writer.print("HTTP/1.1 204 No Content\r\n")
                writer.print("Access-Control-Allow-Origin: *\r\n")
                writer.print("Access-Control-Allow-Methods: POST, GET, OPTIONS\r\n")
                writer.print("Access-Control-Allow-Headers: Content-Type\r\n")
                writer.print("\r\n")
                writer.flush()
                socket.close()
                return
            }

            var responseText: String
            var statusCode = 200
            var statusMsg = "OK"

            if (sqlQuery.isEmpty()) {
                statusCode = 400
                statusMsg = "Bad Request"
                responseText = JSONObject().put("error", "Query SQL vacía. Envía la query en el cuerpo (POST) o como parámetro ?q= (GET)").toString()
            } else {
                try {
                    responseText = runQuery(context, sqlQuery)
                } catch (e: Exception) {
                    statusCode = 500
                    statusMsg = "Internal Server Error"
                    responseText = JSONObject().put("error", e.message ?: "Error desconocido").toString()
                }
            }

            val bytes = responseText.toByteArray(StandardCharsets.UTF_8)
            writer.print("HTTP/1.1 $statusCode $statusMsg\r\n")
            writer.print("Content-Type: application/json; charset=utf-8\r\n")
            writer.print("Content-Length: ${bytes.size}\r\n")
            writer.print("Access-Control-Allow-Origin: *\r\n")
            writer.print("Connection: close\r\n")
            writer.print("\r\n")
            writer.flush()

            socket.getOutputStream().write(bytes)
            socket.getOutputStream().flush()
            socket.close()
        } catch (e: Exception) {
            Log.e(TAG, "Error manejando cliente: ${e.message}")
        }
    }

    private fun runQuery(context: Context, sql: String): String {
        val dbHelper = DatabaseHelper.getInstance(context)
        val db = dbHelper.readableDatabase
        val jsonArray = JSONArray()
        
        db.rawQuery(sql, null).use { cursor ->
            val columnNames = cursor.columnNames
            while (cursor.moveToNext()) {
                val rowObj = JSONObject()
                for (i in 0 until cursor.columnCount) {
                    val colName = columnNames[i]
                    val type = cursor.getType(i)
                    when (type) {
                        Cursor.FIELD_TYPE_NULL -> rowObj.put(colName, JSONObject.NULL)
                        Cursor.FIELD_TYPE_INTEGER -> rowObj.put(colName, cursor.getLong(i))
                        Cursor.FIELD_TYPE_FLOAT -> rowObj.put(colName, cursor.getDouble(i))
                        Cursor.FIELD_TYPE_BLOB -> {
                            val blob = cursor.getBlob(i)
                            rowObj.put(colName, "[BLOB: ${blob?.size ?: 0} bytes]")
                        }
                        else -> rowObj.put(colName, cursor.getString(i))
                    }
                }
                jsonArray.put(rowObj)
            }
        }
        return jsonArray.toString()
    }
}
