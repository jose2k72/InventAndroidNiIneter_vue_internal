import urllib.request
import json

try:
    req = urllib.request.Request("http://localhost:8080/query", data=b"SELECT DATOS FROM DATOS WHERE ID = 3")
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode('utf-8'))
        if data:
            js = json.loads(data[0]['DATOS'])
            for k, v in js.items():
                print(f"{k}: {v}")
        else:
            print("No data found")
except Exception as e:
    print(f"Error: {e}")
