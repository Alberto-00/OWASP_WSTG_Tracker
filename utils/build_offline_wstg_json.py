import json
import requests
import os
from app_online import fetch_reference_details

JSON_URL = "https://raw.githubusercontent.com/OWASP/wstg/master/checklists/checklist.json"

def main():
    response = requests.get(JSON_URL)
    checklist = response.json()

    result = {}

    for category, details in checklist["categories"].items():
        for test in details["tests"]:
            test_id = test["id"]
            reference_url = test["reference"]
            print(f"[*] Fetching {test_id}...")

            # Usa la funzione originale che restituisce HTML per ogni sezione
            sections = fetch_reference_details(reference_url)

            # Pulizia finale: assicurati che siano presenti tutte le sezioni
            result[test_id] = {
                "summary": sections.get("summary", ""),
                "how-to": sections.get("how-to", ""),
                "tools": sections.get("tools", ""),
                "remediation": sections.get("remediation", ""),
                "test_objectives": sections.get("test objectives", "")
            }

    output_path = os.path.join(os.path.dirname(__file__), "wstg_offline_data.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=4, ensure_ascii=False)

    print("\n[OK] File salvato come wstg_offline_data.json")

if __name__ == "__main__":
    main()
