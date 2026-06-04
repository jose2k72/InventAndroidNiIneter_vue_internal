import sys
import json
import urllib.request
import subprocess
from shapely.wkb import loads as wkb_loads

def query_device(sql):
    # Asegurar la redirección de puerto
    try:
        subprocess.run(['adb', 'forward', 'tcp:8080', 'tcp:8080'], check=True, stdout=subprocess.DEVNULL)
    except Exception as e:
        print(f"⚠️ Error al redireccionar puerto con ADB: {e}")
        sys.exit(1)
        
    url = "http://localhost:8080/query"
    try:
        req = urllib.request.Request(
            url, 
            data=sql.encode('utf-8'), 
            headers={'Content-Type': 'text/plain'}
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            res_data = response.read().decode('utf-8')
            return json.loads(res_data)
    except Exception as e:
        print(f"❌ Error al consultar el dispositivo: {e}")
        sys.exit(1)

def main():
    if len(sys.argv) < 2:
        print("Uso: python py-utils/query_owners_by_predio.py <ID_PREDIO>")
        sys.exit(1)
        
    predio_id = sys.argv[1]
    
    # 1. Obtener el predio, su WKB y su bounding box
    predio_sql = f"SELECT id, minX, minY, maxX, maxY, hex(wkb) as hex_wkb, LOCALIZACION FROM objects WHERE id = {predio_id} AND layer = 'Predios'"
    predio_rows = query_device(predio_sql)
    
    if not predio_rows:
        print(f"❌ No se encontró ningún predio con ID {predio_id} en la capa 'Predios'.")
        sys.exit(1)
        
    predio = predio_rows[0]
    if not predio.get('hex_wkb'):
        print(f"❌ El predio {predio_id} no tiene datos de geometría WKB válidos.")
        sys.exit(1)
        
    predio_geom = wkb_loads(bytes.fromhex(predio['hex_wkb']))
    
    # 2. Consultar candidatos de la capa 'Propietarios' dentro del bounding box del predio
    min_x, max_x = predio['minX'], predio['maxX']
    min_y, max_y = predio['minY'], predio['maxY']
    
    owners_sql = f"""
        SELECT id, LOCALIZACION, hex(wkb) as hex_wkb 
        FROM objects 
        WHERE layer = 'Propietarios' 
          AND minX BETWEEN {min_x} AND {max_x} 
          AND minY BETWEEN {min_y} AND {max_y}
    """
    candidates = query_device(owners_sql)
    
    # 3. Filtrar candidatos espacialmente usando Shapely
    matching_owners = []
    for cand in candidates:
        if not cand.get('hex_wkb'):
            continue
        try:
            point_geom = wkb_loads(bytes.fromhex(cand['hex_wkb']))
            # Comprobar si el punto está dentro del polígono del predio (intersects o contains)
            if predio_geom.contains(point_geom) or predio_geom.intersects(point_geom):
                matching_owners.append(cand)
        except Exception as e:
            # Ignorar errores de parseo de geometrías individuales corruptas
            continue
            
    # 4. Mostrar resultados
    print(f"\n==================================================")
    print(f"Predio ID: {predio_id} | Localización (Código): {predio['LOCALIZACION']}")
    print(f"BBox: [{min_x}, {min_y}] a [{max_x}, {max_y}]")
    print(f"==================================================")
    
    if not matching_owners:
        print("No se encontraron propietarios dentro de este predio espacialmente (consultando por WKB).")
    else:
        print(f"Se encontraron {len(matching_owners)} propietarios:")
        print("-" * 50)
        print(f"{'ID Owner':<10} | {'Nombre / Localización':<35}")
        print("-" * 50)
        for owner in matching_owners:
            print(f"{owner['id']:<10} | {owner['LOCALIZACION']:<35}")
        print("-" * 50)

if __name__ == "__main__":
    main()
