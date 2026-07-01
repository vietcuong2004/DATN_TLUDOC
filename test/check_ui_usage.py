import os
import re

ui_dir = r"d:\DATN_TLUDOCUMENT\components\ui"
project_dir = r"d:\DATN_TLUDOCUMENT"

ui_files = [f for f in os.listdir(ui_dir) if f.endswith(('.tsx', '.ts'))]
ui_names = [f.split('.')[0] for f in ui_files]

usage_counts = {name: 0 for name in ui_names}

for root, dirs, files in os.walk(project_dir):
    if "node_modules" in root or ".next" in root or ".git" in root:
        continue
    for file in files:
        if file.endswith(('.tsx', '.ts')):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
                for name in ui_names:
                    # Search for import ... from "@/components/ui/name"
                    if f'@/components/ui/{name}' in content:
                        usage_counts[name] += 1

print("--- USAGE REPORT ---")
unused = []
for name, count in usage_counts.items():
    if count == 0:
        unused.append(name)
        print(f"{name}: UNUSED")
    else:
        print(f"{name}: {count} usages")

print("\n--- SUMMARY ---")
print(f"Total UI files: {len(ui_names)}")
print(f"Unused files: {len(unused)}")
print(f"Files to delete: {', '.join(unused)}")
