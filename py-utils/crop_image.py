from PIL import Image
import os
import sys

# Ruta origen (JPG original)
input_path = r"D:/SRC.PROJECTS/CR.GOICO(CADIC)/DATA.CAPTURE/src.android.aceras.vue/app/src/main/res/drawable/logo_cadic_cr.jpg"
# Ruta destino (PNG nuevo)
output_path = r"D:/SRC.PROJECTS/CR.GOICO(CADIC)/DATA.CAPTURE/src.android.aceras.vue/app/src/main/res/drawable/logo_cadic_transparent.png"

print(f"🔹 Convirtiendo: {os.path.basename(input_path)}")

try:
    if not os.path.exists(input_path):
        print("❌ Error: No encuentro el archivo JPG original.")
        sys.exit(1)

    # Abrir imagen original
    img = Image.open(input_path).convert("RGBA")
    print(f"📏 Tamaño original: {img.size}")

    # ESTRATEGIA: Convertir Fondo Blanco a Transparente
    print("🎨 Procesando transparencia...")
    
    datas = img.getdata()
    newData = []
    
    # Tolerancia (0-255). 220 significa que gris muy claro también se va.
    # Ajustar si el logo tiene partes blancas que queremos conservar.
    threshold = 230

    for item in datas:
        # Si R, G y B son altos (casi blanco)
        if item[0] > threshold and item[1] > threshold and item[2] > threshold:
            newData.append((255, 255, 255, 0)) # Transparente total
        else:
            newData.append(item) # Mantener color original

    img.putdata(newData)
    
    # ESTRATEGIA: Recortar bordes vacíos (Autocrop)
    bbox = img.getbbox()
    if bbox:
        # Calcular cuánto se va a recortar para informar
        crop_width = bbox[2] - bbox[0]
        crop_height = bbox[3] - bbox[1]
        
        # Solo recortar si hay una diferencia significativa (>10px) para evitar recortar sombras suaves
        if (img.width - crop_width) > 10 or (img.height - crop_height) > 10:
             print(f"✂️ Recortando bordes vacíos detectados: {bbox}")
             img = img.crop(bbox)
        
        print(f"✅ Nuevo tamaño final: {img.size}")
        img.save(output_path, "PNG")
        print(f"💾 Guardado en: {os.path.basename(output_path)}")
    else:
        print("⚠️ La imagen quedó vacía. Revisa el umbral de color.")

except Exception as e:
    print(f"❌ Error crítico: {e}")
