import sqlite3
import os

# Ruta de la base de datos
db_path = r"D:\00.PENDIENTES\CR.GOICO.IPIS\00_MAP_APP\CALLE BLANCO\map.db"

print(f"📂 Inspeccionando capas (layers) en: {db_path}")

if not os.path.exists(db_path):
    print("❌ Error: El archivo de base de datos no existe.")
    exit(1)

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Consultar tipos de layer y conteo
    query = """
        SELECT layer, COUNT(*) as total
        FROM objects
        GROUP BY layer
        ORDER BY total DESC
    """
    
    cursor.execute(query)
    results = cursor.fetchall()
    
    print(f"\n📊 Resumen de Capas encontradas:")
    print(f"{'Capa (Layer)':<30} | {'Cantidad de Objetos'}")
    print("-" * 50)
    
    for row in results:
        layer_name = row[0] if row[0] is not None else "NULL (Sin nombre)"
        count = row[1]
        print(f"{layer_name:<30} | {count}")

    conn.close()
    print("\n✅ Consulta completada.")

except sqlite3.Error as e:
    print(f"❌ Error SQLite: {e}")
except Exception as e:
    print(f"❌ Error General: {e}")
