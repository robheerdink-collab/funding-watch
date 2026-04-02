#!/usr/bin/env python3
"""
Funding Watch Dashboard Updater — April 2, 2026 (afternoon run)
Adds new funding opportunities and updates statuses in index.html.
Run on Mac: python3 ~/Documents/Claude/"Funding watch"/update_funding.py
"""

import re
import json
from datetime import datetime

FILE_PATH = __file__.replace("update_funding.py", "index.html")
TODAY = "2026-04-02"
TIMESTAMP = datetime.now().strftime("%B %-d, %Y %H:%M")

# New entries to add (IDs 93+)
NEW_ENTRIES = [
    {
        "id": 93,
        "funder": "MSCA (Marie Skłodowska-Curie Actions)",
        "funderCategory": "European",
        "name": "MSCA Postdoctoral Fellowships 2026",
        "type": "Personal Fellowship",
        "careerStage": ["Postdoc"],
        "budgetMin": 0,
        "budgetMax": 250000,
        "currency": "EUR",
        "deadline": "2026-09-09",
        "deadlineType": "Full proposal",
        "phaseType": "1-phase",
        "mandatoryPartners": False,
        "mandatoryPartnersDesc": "",
        "recurring": "Annual",
        "status": "Upcoming",
        "relevanceTags": ["pharmacoepidemiology", "clinical pharmacy", "real-world evidence", "pharmaceutical policy", "HTA", "pharmacovigilance", "drug utilisation research"],
        "description": "MSCA Postdoctoral Fellowships enhance the creative and innovative potential of researchers holding a PhD through advanced training, international and interdisciplinary mobility. Budget €399M. Opens April 9, 2026. Open to excellent researchers of any nationality.",
        "url": "https://marie-sklodowska-curie-actions.ec.europa.eu/actions/postdoctoral-fellowships",
        "dateAdded": TODAY
    },
    {
        "id": 94,
        "funder": "KWF (Dutch Cancer Society)",
        "funderCategory": "Private/Foundation",
        "name": "KWF Young Investigator Grant 2026",
        "type": "Personal Fellowship",
        "careerStage": ["Postdoc", "Junior researcher"],
        "budgetMin": 0,
        "budgetMax": 600000,
        "currency": "EUR",
        "deadline": "2026-04-07",
        "deadlineType": "Full proposal",
        "phaseType": "2-phase",
        "mandatoryPartners": False,
        "mandatoryPartnersDesc": "",
        "recurring": "Annual",
        "status": "Open",
        "relevanceTags": ["pharmacoepidemiology", "real-world evidence", "cost-effectiveness", "drug utilisation research"],
        "description": "Dedicated annual call for young talented researchers (within 5 years of PhD) to initiate a strong and independent oncological research line. Now a separate call from the regular Open Call. Full proposal deadline April 7, 2026.",
        "url": "https://www.kwf.nl/en/forresearchers/funding/young-investigator-grant",
        "dateAdded": TODAY
    },
    {
        "id": 95,
        "funder": "KWF (Dutch Cancer Society)",
        "funderCategory": "Private/Foundation",
        "name": "KWF Biomarker Validation Call 2026",
        "type": "Project Grant",
        "careerStage": ["Senior researcher", "Associate professor", "Full professor"],
        "budgetMin": 0,
        "budgetMax": 500000,
        "currency": "EUR",
        "deadline": "2026-06-30",
        "deadlineType": "Full proposal (estimated)",
        "phaseType": "1-phase",
        "mandatoryPartners": False,
        "mandatoryPartnersDesc": "",
        "recurring": "One-time",
        "status": "Open",
        "relevanceTags": ["real-world evidence", "pharmacoepidemiology", "precision medicine", "cost-effectiveness"],
        "description": "Call to clinically validate (combinations of) already known biomarkers that align with patient-relevant outcomes or treatment responses and that can be used in daily clinical practice in the near future.",
        "url": "https://www.kwf.nl/en/forresearchers/funding/biomarkers2026",
        "dateAdded": TODAY
    },
    {
        "id": 96,
        "funder": "KWF (Dutch Cancer Society)",
        "funderCategory": "Private/Foundation",
        "name": "KWF Lead4Life PPP Call 2026",
        "type": "Network/Consortium",
        "careerStage": ["Senior researcher", "Associate professor", "Full professor"],
        "budgetMin": 0,
        "budgetMax": 5000000,
        "currency": "EUR",
        "deadline": "2026-06-30",
        "deadlineType": "Estimated",
        "phaseType": "Unknown",
        "mandatoryPartners": True,
        "mandatoryPartnersDesc": "Public-private partnership required",
        "recurring": "One-time",
        "status": "Upcoming",
        "relevanceTags": ["pharmacoepidemiology", "drug safety", "ATMPs", "cost-effectiveness"],
        "description": "€5M public-private partnership call for Pb-212 production and enabling technologies for targeted alpha therapy cancer treatments. Consortia of companies and research organisations.",
        "url": "https://www.kwf.nl/en/forresearchers/funding/lead4life",
        "dateAdded": TODAY
    },
    {
        "id": 97,
        "funder": "FIP (International Pharmaceutical Federation)",
        "funderCategory": "International",
        "name": "FIP HPS Research Grant 2026",
        "type": "Project Grant",
        "careerStage": ["Postdoc", "Junior researcher", "Senior researcher"],
        "budgetMin": 0,
        "budgetMax": 3000,
        "currency": "EUR",
        "deadline": "2026-05-01",
        "deadlineType": "Full proposal",
        "phaseType": "1-phase",
        "mandatoryPartners": False,
        "mandatoryPartnersDesc": "",
        "recurring": "Annual",
        "status": "Open",
        "relevanceTags": ["clinical pharmacy", "pharmacy practice research", "antimicrobial resistance", "medication adherence"],
        "description": "Hospital Pharmacy Section/FIP Foundation Research Grant for research on implementation of the revised Basel Statements. Priority: FIP Development Goals 19 (patient safety), 17 (antimicrobial stewardship), 5 (competency development). Must be FIP HPS member.",
        "url": "https://www.fipfoundation.org/fip-hospital-pharmacy-section-hps-grants/",
        "dateAdded": TODAY
    },
    {
        "id": 98,
        "funder": "EUP OHAMR",
        "funderCategory": "European",
        "name": "EUP OHAMR Joint Transnational Call 2026 — New Treatments to Tackle AMR",
        "type": "Network/Consortium",
        "careerStage": ["Senior researcher", "Associate professor", "Full professor"],
        "budgetMin": 0,
        "budgetMax": 500000,
        "currency": "EUR",
        "deadline": "2026-06-17",
        "deadlineType": "Full proposal",
        "phaseType": "2-phase",
        "mandatoryPartners": True,
        "mandatoryPartnersDesc": "Transnational consortium required (min 3 countries)",
        "recurring": "Annual",
        "status": "Open",
        "relevanceTags": ["antimicrobial resistance", "pharmacoepidemiology", "drug safety", "pharmacovigilance"],
        "description": "First EUP OHAMR call (successor to JPIAMR). Focus: new combination treatments using existing or innovative antimicrobials to extend drug efficacy and combat resistance. 37 funding organisations from 28 countries, total budget >€31M. Pre-proposals closed Feb 2.",
        "url": "https://ohamr.eu/calls/call-2026-new-treatments-to-tackle-amr/",
        "dateAdded": TODAY
    },
    {
        "id": 99,
        "funder": "Health~Holland",
        "funderCategory": "Dutch National",
        "name": "Health~Holland Science for Industry Call 2026",
        "type": "Network/Consortium",
        "careerStage": ["Senior researcher", "Associate professor", "Full professor"],
        "budgetMin": 500000,
        "budgetMax": 1200000,
        "currency": "EUR",
        "deadline": "2026-09-22",
        "deadlineType": "Full proposal",
        "phaseType": "2-phase",
        "mandatoryPartners": True,
        "mandatoryPartnersDesc": "At least one Dutch company (main applicant) + one Dutch research organisation",
        "recurring": "Annual",
        "status": "Open",
        "relevanceTags": ["real-world evidence", "pharmaceutical policy", "HTA", "AI/data science", "drug utilisation research"],
        "description": "€5M+ PPP subsidy for innovative collaborations between companies and research organisations in Life Sciences & Health. Pre-registration deadline July 14, 2026. Full proposal deadline September 22, 2026.",
        "url": "https://www.health-holland.com/funding-opportunities/science-industry-call-2026",
        "dateAdded": TODAY
    },
    {
        "id": 100,
        "funder": "Health~Holland",
        "funderCategory": "Dutch National",
        "name": "Health~Holland SME Call 2026",
        "type": "Network/Consortium",
        "careerStage": ["Senior researcher", "Associate professor", "Full professor"],
        "budgetMin": 0,
        "budgetMax": 350000,
        "currency": "EUR",
        "deadline": "2026-09-01",
        "deadlineType": "Full proposal (estimated)",
        "phaseType": "2-phase",
        "mandatoryPartners": True,
        "mandatoryPartnersDesc": "SME + research organisation required",
        "recurring": "Annual",
        "status": "Open",
        "relevanceTags": ["real-world evidence", "pharmaceutical policy", "AI/data science", "drug utilisation research"],
        "description": "€12M PPP subsidy for SMEs in Life Sciences & Health. Promotes public-private partnerships (PPP) focused on innovative industrial research within the LSH sector.",
        "url": "https://www.health-holland.com/funding-opportunities/mkb-call",
        "dateAdded": TODAY
    },
    {
        "id": 101,
        "funder": "NWO",
        "funderCategory": "Dutch National",
        "name": "NWO Vici Science Domain 2026",
        "type": "Personal Fellowship",
        "careerStage": ["Associate professor", "Full professor"],
        "budgetMin": 0,
        "budgetMax": 1500000,
        "currency": "EUR",
        "deadline": "2026-09-08",
        "deadlineType": "Full proposal",
        "phaseType": "2-phase",
        "mandatoryPartners": False,
        "mandatoryPartnersDesc": "",
        "recurring": "Annual",
        "status": "Open",
        "relevanceTags": ["pharmacoepidemiology", "real-world evidence", "AI/data science", "pharmacogenetics"],
        "description": "Vici grants for senior researchers to develop an innovative line of research and set up their own research group. Up to €1.5M for 5 years. Pre-proposals closed March 10, 2026. Full proposals due September 8, 2026.",
        "url": "https://www.nwo.nl/en/calls/nwo-talent-programme-vici-science-2026",
        "dateAdded": TODAY
    },
    {
        "id": 102,
        "funder": "NWO",
        "funderCategory": "Dutch National",
        "name": "NWO Vici ZonMw Domain 2026",
        "type": "Personal Fellowship",
        "careerStage": ["Associate professor", "Full professor"],
        "budgetMin": 0,
        "budgetMax": 1500000,
        "currency": "EUR",
        "deadline": "2026-09-08",
        "deadlineType": "Full proposal",
        "phaseType": "2-phase",
        "mandatoryPartners": False,
        "mandatoryPartnersDesc": "",
        "recurring": "Annual",
        "status": "Open",
        "relevanceTags": ["pharmacoepidemiology", "clinical pharmacy", "pharmacovigilance", "real-world evidence", "HTA"],
        "description": "Vici grants (ZonMw domain) for experienced researchers to build an innovative research line. Up to €1.5M for 5 years. Pre-proposals closed March 2026. Full proposals due September 8, 2026.",
        "url": "https://www.nwo.nl/en/calls/nwo-talent-programme-vici-zonmw-2026",
        "dateAdded": TODAY
    },
    {
        "id": 103,
        "funder": "Global Health EDCTP3",
        "funderCategory": "European",
        "name": "EDCTP3 CSA — Ethics, Regulatory & Pharmacovigilance Training 2026",
        "type": "Network/Consortium",
        "careerStage": ["Senior researcher", "Associate professor", "Full professor"],
        "budgetMin": 0,
        "budgetMax": 2000000,
        "currency": "EUR",
        "deadline": "2026-08-31",
        "deadlineType": "Full proposal",
        "phaseType": "1-phase",
        "mandatoryPartners": True,
        "mandatoryPartnersDesc": "International consortium, including sub-Saharan Africa partners",
        "recurring": "Annual",
        "status": "Open",
        "relevanceTags": ["pharmacovigilance", "drug safety", "pharmaceutical policy", "regulatory science"],
        "description": "Coordination and support action to support training and capacity-building in ethics, regulatory and pharmacovigilance. Part of the EDCTP3 2026 work programme (€147M total).",
        "url": "https://www.global-health-edctp3.europa.eu/",
        "dateAdded": TODAY
    },
    {
        "id": 104,
        "funder": "Hartstichting (Dutch Heart Foundation)",
        "funderCategory": "Private/Foundation",
        "name": "Hartstichting ICRPA 2026 — International Cardiovascular Research Partnership Awards",
        "type": "Network/Consortium",
        "careerStage": ["Senior researcher", "Associate professor", "Full professor"],
        "budgetMin": 0,
        "budgetMax": 2400000,
        "currency": "EUR",
        "deadline": "2026-06-30",
        "deadlineType": "Estimated",
        "phaseType": "Unknown",
        "mandatoryPartners": True,
        "mandatoryPartnersDesc": "International consortium with DZHK participation",
        "recurring": "Annual",
        "status": "Upcoming",
        "relevanceTags": ["pharmacoepidemiology", "real-world evidence", "drug safety", "cost-effectiveness"],
        "description": "Eighth round of the International Cardiovascular Research Partnership Awards. Projects up to 4 years, total budget up to €2.4M. DZHK provides €400K per project for up to 3 projects.",
        "url": "https://dzhk.de/en/research/partnerships/international-cardiovascular-research-partnerships-awards",
        "dateAdded": TODAY
    },
    {
        "id": 105,
        "funder": "Horizon Europe / GenAI4EU",
        "funderCategory": "European",
        "name": "GenAI4EU — Generative AI in Biomedical Research",
        "type": "Project Grant",
        "careerStage": ["Senior researcher", "Associate professor", "Full professor"],
        "budgetMin": 15000000,
        "budgetMax": 17000000,
        "currency": "EUR",
        "deadline": "2026-09-30",
        "deadlineType": "Estimated",
        "phaseType": "Unknown",
        "mandatoryPartners": True,
        "mandatoryPartnersDesc": "Consortium required",
        "recurring": "One-time",
        "status": "Upcoming",
        "relevanceTags": ["AI/data science", "real-world evidence", "pharmacoepidemiology", "precision medicine"],
        "description": "EU funding of €15-17M to leverage multimodal data to advance generative AI in biomedical research, moving towards predictive and personalised medicine. Part of Horizon Europe / Digital Europe / EIC calls for 2026-2027.",
        "url": "https://digital-strategy.ec.europa.eu/en/policies/genai4eu",
        "dateAdded": TODAY
    },
    {
        "id": 106,
        "funder": "KWF (Dutch Cancer Society)",
        "funderCategory": "Private/Foundation",
        "name": "KWF PIPELINE Call 2026",
        "type": "Project Grant",
        "careerStage": ["Senior researcher", "Associate professor", "Full professor"],
        "budgetMin": 0,
        "budgetMax": 1000000,
        "currency": "EUR",
        "deadline": "2026-06-30",
        "deadlineType": "Estimated (spring 2026 launch)",
        "phaseType": "Unknown",
        "mandatoryPartners": False,
        "mandatoryPartnersDesc": "",
        "recurring": "One-time",
        "status": "Upcoming",
        "relevanceTags": ["pharmacoepidemiology", "drug safety", "cost-effectiveness", "ATMPs"],
        "description": "New KWF call focusing on advancing the clinical development of new cancer drugs derived from academic research, with the potential to significantly improve treatment outcomes for patients with unmet medical needs. Expected launch spring 2026.",
        "url": "https://www.kwf.nl/en/forresearchers/funding",
        "dateAdded": TODAY
    },
    {
        "id": 107,
        "funder": "Alzheimer Nederland",
        "funderCategory": "Private/Foundation",
        "name": "Alzheimer Nederland Impuls Grant 2026 — Round 2",
        "type": "Project Grant",
        "careerStage": ["Postdoc", "Junior researcher", "Senior researcher"],
        "budgetMin": 0,
        "budgetMax": 100000,
        "currency": "EUR",
        "deadline": "2026-07-01",
        "deadlineType": "Estimated (round 2)",
        "phaseType": "1-phase",
        "mandatoryPartners": False,
        "mandatoryPartnersDesc": "",
        "recurring": "3x per year",
        "status": "Upcoming",
        "relevanceTags": ["pharmacoepidemiology", "drug utilisation research", "polypharmacy", "real-world evidence"],
        "description": "Quick-start grants for innovative dementia research. Opens three times per year. Round 1 closed March 30. Round 2 expected ~July 2026. Relevant for drug utilisation research in dementia/elderly populations.",
        "url": "https://grants.alzheimer-nederland.nl/",
        "dateAdded": TODAY
    }
]

# Status updates for existing entries
STATUS_UPDATES = {
    # ZonMw Open Competition 2026 (ID 1) — deadline April 2 (today) — keep Open until end of day
    # No changes needed for entries already updated by earlier session today
}

def update_file():
    with open(FILE_PATH, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the highest existing ID
    ids = [int(m) for m in re.findall(r'"id":\s*(\d+)', content)]
    max_id = max(ids) if ids else 0
    print(f"Current max ID: {max_id}")
    print(f"Current entries: {len(ids)}")

    # Filter out entries with IDs that would conflict
    entries_to_add = []
    next_id = max_id + 1
    for entry in NEW_ENTRIES:
        # Check if this opportunity is already tracked (by name similarity)
        name_escaped = re.escape(entry['name'][:30])
        if re.search(name_escaped, content):
            print(f"  SKIP (already exists): {entry['name']}")
            continue
        # Also check by funder + partial name
        funder_check = entry['funder'].split('(')[0].strip()[:15]
        name_short = entry['name'].split(' 2026')[0].split(' —')[0][-20:]
        if funder_check in content and name_short in content:
            print(f"  SKIP (likely exists): {entry['name']}")
            continue
        entry['id'] = next_id
        next_id += 1
        entries_to_add.append(entry)
        print(f"  ADD (ID {entry['id']}): {entry['name']}")

    if not entries_to_add:
        print("\nNo new entries to add.")
    else:
        # Build JS for new entries
        js_entries = []
        for e in entries_to_add:
            js = "    {\n"
            js += f'      id: {e["id"]},\n'
            js += f'      funder: {json.dumps(e["funder"])},\n'
            js += f'      funderCategory: {json.dumps(e["funderCategory"])},\n'
            js += f'      name: {json.dumps(e["name"])},\n'
            js += f'      type: {json.dumps(e["type"])},\n'
            js += f'      careerStage: {json.dumps(e["careerStage"])},\n'
            js += f'      budgetMin: {e["budgetMin"]},\n'
            js += f'      budgetMax: {e["budgetMax"]},\n'
            js += f'      currency: {json.dumps(e["currency"])},\n'
            js += f'      deadline: {json.dumps(e["deadline"])},\n'
            js += f'      deadlineType: {json.dumps(e["deadlineType"])},\n'
            js += f'      phaseType: {json.dumps(e["phaseType"])},\n'
            js += f'      mandatoryPartners: {"true" if e["mandatoryPartners"] else "false"},\n'
            js += f'      mandatoryPartnersDesc: {json.dumps(e["mandatoryPartnersDesc"])},\n'
            js += f'      recurring: {json.dumps(e["recurring"])},\n'
            js += f'      status: {json.dumps(e["status"])},\n'
            js += f'      relevanceTags: {json.dumps(e["relevanceTags"])},\n'
            js += f'      description: {json.dumps(e["description"])},\n'
            js += f'      url: {json.dumps(e["url"])},\n'
            js += f'      dateAdded: {json.dumps(e["dateAdded"])}\n'
            js += "    }"
            js_entries.append(js)

        new_js = ",\n" + ",\n".join(js_entries)

        # Insert before the closing ]; of fundingData
        # Find the last entry's closing brace before ];
        pattern = r'(}\s*\n\s*\];)'
        match = list(re.finditer(pattern, content))
        if match:
            last_match = match[-1]
            insert_pos = last_match.start() + 1  # After the last }
            content = content[:insert_pos] + new_js + content[insert_pos:]
            print(f"\nInserted {len(entries_to_add)} new entries")
        else:
            print("ERROR: Could not find insertion point in fundingData array")
            return

    # Update timestamps
    # Header: Last updated:
    content = re.sub(
        r'Last updated:\s*[A-Z][a-z]+ \d{1,2}, \d{4} \d{2}:\d{2}',
        f'Last updated: {TIMESTAMP}',
        content
    )
    # Footer: Data Last Updated:
    content = re.sub(
        r'Data Last Updated:\s*[A-Z][a-z]+ \d{1,2}, \d{4} \d{2}:\d{2}',
        f'Data Last Updated: {TIMESTAMP}',
        content
    )

    # Update opportunity count in footer
    new_total = len(re.findall(r'"id":\s*\d+', content))
    content = re.sub(
        r'Tracking\s+\d+\s+funding opportunities',
        f'Tracking {new_total} funding opportunities',
        content
    )

    with open(FILE_PATH, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"\nTotal entries after update: {new_total}")
    print(f"Timestamps updated to: {TIMESTAMP}")
    print("File saved successfully!")

if __name__ == "__main__":
    update_file()
