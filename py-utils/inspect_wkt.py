import sqlite3
import os

db_path = r"D:\00.PENDIENTES\CR.GOICO.IPIS\00_MAP_APP\CALLE BLANCO\map.db"

print(f"📂 Analizando WKT de cada capa en: {db_path}\n")

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    layers = ['Predios', 'rutas_locales', 'rutas_nacionales']
    
    for layer in layers:
        print(f"═" * 60)
        print(f"🔹 Capa: {layer}")
        print(f"═" * 60)
        
        # Obtener un ejemplo de WKT
        cursor.execute(f"""
            SELECT id, LOCALIZACION, wkt 
            FROM objects 
            WHERE layer = '{layer}' COLLATE NOCASE
            LIMIT 2
        """)
        rows = cursor.fetchall()
        
        if not rows:
            print("   (Sin registros)")
            continue
            
        for row in rows:
            obj_id = row[0]
            localizacion = row[1] or "(NULL)"
            wkt = row[2] or "(NULL)"
            
            # Mostrar solo los primeros 200 caracteres del WKT
            wkt_preview = wkt[:200] + "..." if len(wkt) > 200 else wkt
            
            print(f"\n   ID: {obj_id}")
            print(f"   Localización: {localizacion}")
            print(f"   WKT tipo: {wkt.split('(')[0] if '(' in wkt else 'Desconocido'}")
            print(f"   WKT preview: {wkt_preview}")
        
        print()

    conn.close()
    print("✅ Análisis completado.")

except Exception as e:
    print(f"❌ Error: {e}")
