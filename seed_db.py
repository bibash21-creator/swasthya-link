import requests

BASE_URL = "http://127.0.0.1:8000/api/pharmacies"

MOCK_PHARMACIES = [
    { "name": "City Care Pharmacy", "latitude": 27.7172, "longitude": 85.3240, "address": "Durbar Marg, Kathmandu", "contact_number": "01-4412345" },
    { "name": "Everest Health Plus", "latitude": 27.7052, "longitude": 85.3290, "address": "Baneshwor, Kathmandu", "contact_number": "01-4478901" },
    { "name": "MediTech Pharma", "latitude": 27.7232, "longitude": 85.3190, "address": "Lazimpat, Kathmandu", "contact_number": "01-4423456" },
    { "name": "Green Cross Pharmacy", "latitude": 27.6915, "longitude": 85.3420, "address": "Koteshwor, Kathmandu", "contact_number": "01-4487654" },
    { "name": "Life Line Medics", "latitude": 27.6710, "longitude": 85.3120, "address": "Patan, Lalitpur", "contact_number": "01-5523456" },
]

def seed():
    print("Starting database seeding...")
    for pharmacy in MOCK_PHARMACIES:
        try:
            response = requests.post(BASE_URL, json=pharmacy)
            if response.status_code == 200:
                print(f"Added: {pharmacy['name']}")
            else:
                print(f"Failed to add {pharmacy['name']}: {response.text}")
        except Exception as e:
            print(f"Error connecting to server: {e}")
            break

if __name__ == "__main__":
    seed()
