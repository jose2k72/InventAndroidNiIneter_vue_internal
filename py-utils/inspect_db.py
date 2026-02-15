import sqlite3
import os

# Ruta de la base de datos (con raw string 'r' para evitar problemas con backslashes)
db_path = r"D:\00.PENDIENTES\CR.GOICO.IPIS\00_MAP_APP\CALLE BLANCO\map.db"

print(f"📂 Inspeccionando base de datos: {db_path}")

if not os.path.exists(db_path):
    print("❌ Error: El archivo de base de datos no existe en la ruta especificada.")
    exit(1)

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Obtener lista de tablas
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    
    print(f"\n📊 Tablas encontradas: {len(tables)}")
    for table in tables:
        table_name = table[0]
        if table_name == "android_metadata": continue
        
        print(f"\n🔹 Tabla: {table_name}")
        
        # Obtener info de columnas (PRAGMA table_info)
        cursor.execute(f"PRAGMA table_info({table_name})")
        columns = cursor.fetchall()
        col_names = [col[1] for col in columns]
        print(f"   Columnas ({len(columns)}): {', '.join(col_names)}")
        
        # Contar filas
        cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
        count = cursor.fetchone()[0]
        print(f"   Registros: {count}")
        
        # Mostrar muestra de datos (primeros 3)
        if count > 0:
            print("   Muestra de datos (top 3):")
            cursor.execute(f"SELECT * FROM {table_name} LIMIT 3")
            rows = cursor.fetchall()
            for row in rows:
                # Truncar textos largos para visualización
                row_str = str(row)
                if len(row_str) > 150:
                    row_str = row_str[:147] + "..."
                print(f"     - {row_str}")

    conn.close()
    print("\n✅ Inspección completada.")

except sqlite3.Error as e:
    print(f"❌ Error SQLite: {e}")
except Exception as e:
    print(f"❌ Error General: {e}")
