import urllib.request
import json

req = urllib.request.Request(
    'http://127.0.0.1:8000/api/patients/register',
    data=json.dumps({"email": "pttest2@test.com", "password": "test", "full_name": "Test User", "latitude": 27.7, "longitude": 85.3}).encode(),
    headers={'Content-Type': 'application/json'}
)
try:
    resp = urllib.request.urlopen(req)
    print("SUCCESS", resp.read().decode())
except Exception as e:
    print("FAILED", getattr(e, 'read', lambda: b'')().decode())
