import sys
import json
import urllib.request
import subprocess

def run():
    if len(sys.argv) < 2:
        print("Uso: python py-utils/query_device.py \"SELECT * FROM ...\"")
        sys.exit(1)
        
    query = " ".join(sys.argv[1:])
    
    # 1. Asegurar la redirección de puerto
    try:
        subprocess.run(['adb', 'forward', 'tcp:8080', 'tcp:8080'], check=True, stdout=subprocess.DEVNULL)
    except Exception as e:
        print(f"⚠️ Error al redireccionar puerto con ADB: {e}")
        sys.exit(1)
        
    # 2. Enviar petición HTTP al dispositivo
    url = "http://localhost:8080/query"
    try:
        req = urllib.request.Request(
            url, 
            data=query.encode('utf-8'), 
            headers={'Content-Type': 'text/plain'}
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            res_data = response.read().decode('utf-8')
            records = json.loads(res_data)
    except urllib.error.HTTPError as e:
        try:
            err_json = json.loads(e.read().decode('utf-8'))
            print(f"\n❌ Error del Servidor ({e.code}): {err_json.get('error', e.reason)}")
        except Exception:
            print(f"\n❌ Error HTTP ({e.code}): {e.reason}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error de conexión: {e}")
        print("Asegúrate de que la aplicación esté abierta en el dispositivo y en modo Debug.")
        sys.exit(1)
        
    # 3. Formatear y mostrar los resultados en Markdown
    if not records:
        print("\n*Consulta ejecutada con éxito. 0 filas devueltas.*")
        return
        
    if isinstance(records, dict) and "error" in records:
        print(f"\n❌ Error: {records['error']}")
        return
        
    columns = list(records[0].keys())
    
    print("\n| " + " | ".join(columns) + " |")
    print("| " + " | ".join(["---"] * len(columns)) + " |")
    for row in records:
        cells = []
        for col in columns:
            val = row[col]
            if val is None:
                cells.append("NULL")
            else:
                cell_str = str(val).replace("|", "\\|").replace("\n", " ")
                if len(cell_str) > 100:
                    cell_str = cell_str[:97] + "..."
                cells.append(cell_str)
        print("| " + " | ".join(cells) + " |")

if __name__ == "__main__":
    run()
