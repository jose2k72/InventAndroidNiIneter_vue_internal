import os
import filecmp
import json

dir_internal = r"D:\SRC.PROJECTS\NI.INETER.CADIC\SRC.ANDROID\src.android.ineter.vue.internal"
dir_official = r"D:\SRC.PROJECTS\NI.INETER.CADIC\SRC.ANDROID\src.android.ineter.vue"

exclude_dirs = {".git", ".gradle", ".idea", "build", "dist", "node_modules", "temp", "tmp", "bin", "obj", ".vscode"}

def get_relative_files(base_dir):
    rel_files = {}
    for root, dirs, files in os.walk(base_dir):
        # Filter directories to exclude
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        for f in files:
            full_path = os.path.join(root, f)
            rel_path = os.path.relpath(full_path, base_dir)
            rel_files[rel_path] = full_path
    return rel_files

internal_files = get_relative_files(dir_internal)
official_files = get_relative_files(dir_official)

only_in_internal = []
only_in_official = []
modified = []
identical = []

for rel_path in sorted(set(internal_files.keys()) | set(official_files.keys())):
    if rel_path in internal_files and rel_path not in official_files:
        only_in_internal.append(rel_path)
    elif rel_path not in internal_files and rel_path in official_files:
        only_in_official.append(rel_path)
    else:
        file_int = internal_files[rel_path]
        file_off = official_files[rel_path]
        if filecmp.cmp(file_int, file_off, shallow=False):
            identical.append(rel_path)
        else:
            modified.append(rel_path)

print(json.dumps({
    "only_in_internal_count": len(only_in_internal),
    "only_in_official_count": len(only_in_official),
    "modified_count": len(modified),
    "identical_count": len(identical),
    "modified_files": modified[:40], # Show first 40 modified
    "only_in_internal": only_in_internal[:40],
    "only_in_official": only_in_official[:40]
}, indent=2))
