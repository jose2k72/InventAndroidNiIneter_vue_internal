import json
import subprocess
import sqlite3

def run_query(sql):
    result = subprocess.run(['python', 'py-utils/query_device.py', sql], capture_output=True, text=True)
    return result.stdout

print(run_query("SELECT id, LOCALIZACION, minX, minY FROM objects WHERE layer='PredNumber' AND minX >= -86.094 AND maxX <= -86.092 AND minY >= 11.970 AND maxY <= 11.972"))
