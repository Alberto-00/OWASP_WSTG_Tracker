import json
import requests
import os

from bs4 import BeautifulSoup

JSON_URL = "https://raw.githubusercontent.com/OWASP/wstg/master/checklists/checklist.json"

def fetch_reference_details(url):
    try:
        response = requests.get(url)
        if response.status_code != 200:
            return {"summary": "<i>Failed to fetch reference.</i>"}

        soup = BeautifulSoup(response.text, "html.parser")
        main_content = soup.find("div", id="main")
        if not main_content:
            return {"summary": "<i>Main content not found.</i>"}

        sections = {
            "summary": "",
            "how-to": "",
            "tools": "",
            "test objectives": "",
            "remediation": ""
        }

        current_section = "summary"
        capture = False

        for element in main_content.find_all(['h2', 'p', 'ul', 'li', 'pre', 'code', 'br']):
            if element.name == 'h2':
                section_id = element.get('id', '').lower()
                title = element.get_text(strip=True)
                if 'summary' in section_id:
                    current_section = "summary"
                    capture = True
                elif 'how-to' in section_id:
                    current_section = "how-to"
                elif 'tools' in section_id:
                    current_section = "tools"
                elif 'test objectives' in section_id:
                    current_section = "test objectives"
                elif 'remediation' in section_id:
                    current_section = "remediation"

                sections[current_section] += f"<h3>{title}</h3>"
            elif capture:
                if element.name == 'p':
                    sections[current_section] += f"<p>{element.get_text(' ', strip=True)}</p>"
                elif element.name == 'ul':
                    sections[current_section] += "<ul>"
                    for li in element.find_all('li'):
                        sections[current_section] += f"<li>{li.get_text(strip=True)}</li>"
                    sections[current_section] += "</ul>"
                elif element.name == 'pre':
                    code_block = element.get_text(" ", strip=True)
                    sections[current_section] += f"<pre><code>{code_block}</code></pre>"
                elif element.name == 'br':
                    sections[current_section] += "<br>"
                elif element.name[0] == 'h' and element.name != "h2":
                    sections[current_section] += f"<h5>{element.get_text(strip=True)}</h5>"

        return sections

    except Exception as e:
        return {"summary": f"<i>Error fetching reference: {str(e)}</i>"}


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
