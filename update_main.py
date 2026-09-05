import re

with open('backend/main.py', 'r') as f:
    content = f.read()

# 1. Update imports
content = content.replace('from weather import fetch_weather', 'from weather import fetch_weather, fetch_elevation, fetch_historical_compare\nfrom config import LOCATIONS')

# 2. Remove LOCATIONS array
# It starts at LOCATIONS = [ and ends with ] right before SENSORS
content = re.sub(r'LOCATIONS = \[.*?\]\n\n# ═══════════════════════════════════════════════════════════════════════════════\n# SENSORS', '# LOCATIONS imported from config.py\n\n# ═══════════════════════════════════════════════════════════════════════════════\n# SENSORS', content, flags=re.DOTALL)

with open('backend/main.py', 'w') as f:
    f.write(content)
