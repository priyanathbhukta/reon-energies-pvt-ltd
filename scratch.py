import sys

path = 'server/scripts/pdf_generator.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('"₹ "', '_RUPEE')
content = content.replace("'₹ '", '_RUPEE')
content = content.replace("₹ ", "{_RUPEE}")
content = content.replace("_RUPEE+", "_RUPEE +") 

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Replaced successfully")
