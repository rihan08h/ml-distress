"""Seed script — medicines, interactions, first-aid KB, pharmacies, inventory, verifications.

Run: python -m app.seeds.seed_data
"""

import asyncio
import random
from decimal import Decimal
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import async_session_factory
from app.models.medicine import Medicine, GenericMapping
from app.models.interaction import DrugInteraction
from app.models.first_aid import FirstAidKB
from app.models.pharmacy import Pharmacy, PharmacyInventory
from app.models.verification import MedicineVerification
from app.models.demand_tracking import DemandTracking


# ----- MEDICINES (15 — aligned with Smart-Medicine-Hub) -----
MEDICINES = [
    {
        "name": "Crocin 500mg",
        "generic_name": "Paracetamol",
        "brand": "Crocin",
        "manufacturer": "GSK",
        "composition": [{"ingredient": "Paracetamol", "strength": "500mg"}],
        "dosage_form": "tablet",
        "category": "analgesic",
        "prescription_required": False,
        "price_mrp": Decimal("30.00"),
        "pack_size": "10 tablets",
        "dosage_instructions": {
            "adult": "1-2 tablets every 4-6 hours",
            "children": "Half tablet every 6 hours",
            "with_food": "Can be taken with or without food",
            "max_daily": "4g",
        },
        "side_effects": {
            "common": ["Nausea", "Stomach pain"],
            "rare": ["Liver damage at high doses", "Allergic skin reaction"],
            "seek_help": ["Yellowing of skin", "Dark urine"],
        },
        "contraindications": ["Severe liver disease", "Alcohol dependence"],
        "storage_info": "Store below 25 degrees C in dry place",
    },
    {
        "name": "Paracetamol IP 500mg",
        "generic_name": "Paracetamol",
        "manufacturer": "Various",
        "composition": [{"ingredient": "Paracetamol", "strength": "500mg"}],
        "dosage_form": "tablet",
        "category": "analgesic",
        "prescription_required": False,
        "price_mrp": Decimal("12.00"),
        "pack_size": "10 tablets",
        "dosage_instructions": {"adult": "1-2 tablets every 4-6 hours", "max_daily": "4g"},
        "side_effects": {"common": ["Nausea"], "rare": ["Liver damage at high doses"]},
        "storage_info": "Store below 25 degrees C",
    },
    {
        "name": "Dolo 650mg",
        "generic_name": "Paracetamol",
        "brand": "Dolo",
        "manufacturer": "Micro Labs",
        "composition": [{"ingredient": "Paracetamol", "strength": "650mg"}],
        "dosage_form": "tablet",
        "category": "analgesic",
        "prescription_required": False,
        "price_mrp": Decimal("35.00"),
        "pack_size": "15 tablets",
        "dosage_instructions": {"adult": "1 tablet every 6 hours", "max_daily": "3g"},
        "side_effects": {"common": ["Nausea"], "rare": ["Liver damage"]},
        "storage_info": "Store below 25 degrees C",
    },
    {
        "name": "Amoxicillin 500mg Capsule",
        "generic_name": "Amoxicillin",
        "brand": "Amoxil",
        "manufacturer": "Cipla",
        "composition": [{"ingredient": "Amoxicillin trihydrate", "strength": "500mg"}],
        "dosage_form": "capsule",
        "category": "antibiotic",
        "prescription_required": True,
        "price_mrp": Decimal("85.00"),
        "pack_size": "10 capsules",
        "dosage_instructions": {
            "adult": "1 capsule every 8 hours",
            "children": "Weight-based dosing",
            "with_food": "Can be taken with or without food",
        },
        "side_effects": {
            "common": ["Diarrhea", "Nausea", "Rash"],
            "rare": ["Anaphylaxis", "C. difficile colitis"],
        },
        "contraindications": ["Penicillin allergy"],
        "storage_info": "Store below 25 degrees C",
    },
    {
        "name": "Mox 500mg",
        "generic_name": "Amoxicillin",
        "brand": "Mox",
        "manufacturer": "Ranbaxy",
        "composition": [{"ingredient": "Amoxicillin trihydrate", "strength": "500mg"}],
        "dosage_form": "capsule",
        "category": "antibiotic",
        "prescription_required": True,
        "price_mrp": Decimal("45.00"),
        "pack_size": "10 capsules",
        "dosage_instructions": {"adult": "1 capsule every 8 hours"},
        "side_effects": {"common": ["Diarrhea", "Rash"]},
        "storage_info": "Store below 25 degrees C",
    },
    {
        "name": "Warfarin 5mg",
        "generic_name": "Warfarin",
        "manufacturer": "Cipla",
        "composition": [{"ingredient": "Warfarin sodium", "strength": "5mg"}],
        "dosage_form": "tablet",
        "category": "anticoagulant",
        "prescription_required": True,
        "price_mrp": Decimal("65.00"),
        "pack_size": "30 tablets",
        "dosage_instructions": {"adult": "As directed by physician, regular INR monitoring required"},
        "side_effects": {
            "common": ["Bleeding", "Bruising"],
            "rare": ["Skin necrosis", "Purple toe syndrome"],
            "seek_help": ["Unusual bleeding", "Blood in urine or stool"],
        },
        "contraindications": ["Pregnancy", "Active bleeding", "Severe liver disease"],
        "storage_info": "Store below 25 degrees C, protect from light",
    },
    {
        "name": "Metformin 500mg Tablet",
        "generic_name": "Metformin",
        "brand": "Glycomet",
        "manufacturer": "USV",
        "composition": [{"ingredient": "Metformin HCl", "strength": "500mg"}],
        "dosage_form": "tablet",
        "category": "antidiabetic",
        "prescription_required": True,
        "price_mrp": Decimal("25.00"),
        "pack_size": "10 tablets",
        "dosage_instructions": {
            "adult": "1 tablet 2-3 times daily with meals",
            "with_food": "Take with or immediately after meals",
        },
        "side_effects": {
            "common": ["GI upset", "Metallic taste", "Diarrhea"],
            "rare": ["Lactic acidosis", "Vitamin B12 deficiency"],
        },
        "contraindications": ["Severe renal impairment", "Metabolic acidosis"],
        "storage_info": "Store below 30 degrees C",
    },
    {
        "name": "Cetirizine 10mg Tablet",
        "generic_name": "Cetirizine",
        "brand": "Zyrtec",
        "manufacturer": "UCB",
        "composition": [{"ingredient": "Cetirizine HCl", "strength": "10mg"}],
        "dosage_form": "tablet",
        "category": "antihistamine",
        "prescription_required": False,
        "price_mrp": Decimal("45.00"),
        "pack_size": "10 tablets",
        "dosage_instructions": {"adult": "1 tablet once daily", "children": "5mg once daily for ages 6-12"},
        "side_effects": {"common": ["Drowsiness", "Dry mouth", "Fatigue"]},
        "storage_info": "Store below 30 degrees C",
    },
    {
        "name": "Okacet 10mg",
        "generic_name": "Cetirizine",
        "brand": "Okacet",
        "manufacturer": "Cipla",
        "composition": [{"ingredient": "Cetirizine HCl", "strength": "10mg"}],
        "dosage_form": "tablet",
        "category": "antihistamine",
        "prescription_required": False,
        "price_mrp": Decimal("20.00"),
        "pack_size": "10 tablets",
        "dosage_instructions": {"adult": "1 tablet once daily"},
        "side_effects": {"common": ["Drowsiness", "Dry mouth"]},
        "storage_info": "Store below 30 degrees C",
    },
    {
        "name": "Amlodipine 5mg",
        "generic_name": "Amlodipine",
        "manufacturer": "Cipla",
        "composition": [{"ingredient": "Amlodipine besylate", "strength": "5mg"}],
        "dosage_form": "tablet",
        "category": "antihypertensive",
        "prescription_required": True,
        "price_mrp": Decimal("40.00"),
        "pack_size": "10 tablets",
        "dosage_instructions": {"adult": "1 tablet once daily"},
        "side_effects": {"common": ["Ankle swelling", "Headache", "Flushing"]},
        "storage_info": "Store below 30 degrees C",
    },
    {
        "name": "Omeprazole 20mg Capsule",
        "generic_name": "Omeprazole",
        "brand": "Omez",
        "manufacturer": "Dr. Reddy's",
        "composition": [{"ingredient": "Omeprazole", "strength": "20mg"}],
        "dosage_form": "capsule",
        "category": "antacid",
        "prescription_required": False,
        "price_mrp": Decimal("55.00"),
        "pack_size": "10 capsules",
        "dosage_instructions": {"adult": "1 capsule before breakfast"},
        "side_effects": {"common": ["Headache", "Nausea", "Abdominal pain"]},
        "storage_info": "Store below 25 degrees C in dry place",
    },
    {
        "name": "Pantoprazole 40mg",
        "generic_name": "Pantoprazole",
        "manufacturer": "Sun Pharma",
        "composition": [{"ingredient": "Pantoprazole sodium", "strength": "40mg"}],
        "dosage_form": "tablet",
        "category": "antacid",
        "prescription_required": False,
        "price_mrp": Decimal("60.00"),
        "pack_size": "10 tablets",
        "dosage_instructions": {"adult": "1 tablet before breakfast"},
        "side_effects": {"common": ["Headache", "Diarrhea"]},
        "storage_info": "Store below 25 degrees C",
    },
    {
        "name": "Azithromycin 500mg",
        "generic_name": "Azithromycin",
        "brand": "Azithral",
        "manufacturer": "Alembic",
        "composition": [{"ingredient": "Azithromycin dihydrate", "strength": "500mg"}],
        "dosage_form": "tablet",
        "category": "antibiotic",
        "prescription_required": True,
        "price_mrp": Decimal("95.00"),
        "pack_size": "3 tablets",
        "dosage_instructions": {"adult": "500mg once daily for 3 days"},
        "side_effects": {"common": ["Nausea", "Diarrhea", "Abdominal pain"]},
        "storage_info": "Store below 30 degrees C",
    },
    {
        "name": "Ibuprofen 400mg Tablet",
        "generic_name": "Ibuprofen",
        "brand": "Brufen",
        "manufacturer": "Abbott",
        "composition": [{"ingredient": "Ibuprofen", "strength": "400mg"}],
        "dosage_form": "tablet",
        "category": "NSAID",
        "prescription_required": False,
        "price_mrp": Decimal("35.00"),
        "pack_size": "10 tablets",
        "dosage_instructions": {
            "adult": "1 tablet every 6-8 hours",
            "with_food": "Take with food to reduce stomach irritation",
        },
        "side_effects": {
            "common": ["GI irritation", "Headache", "Dizziness"],
            "rare": ["GI bleeding", "Kidney problems"],
        },
        "contraindications": ["Active peptic ulcer", "Severe heart failure"],
        "storage_info": "Store below 25 degrees C",
    },
    {
        "name": "Atorvastatin 10mg Tablet",
        "generic_name": "Atorvastatin",
        "brand": "Lipitor",
        "manufacturer": "Pfizer",
        "composition": [{"ingredient": "Atorvastatin calcium", "strength": "10mg"}],
        "dosage_form": "tablet",
        "category": "statin",
        "prescription_required": True,
        "price_mrp": Decimal("120.00"),
        "pack_size": "10 tablets",
        "dosage_instructions": {"adult": "1 tablet once daily at night"},
        "side_effects": {"common": ["Muscle pain", "Headache", "Nausea"]},
        "contraindications": ["Active liver disease", "Pregnancy"],
        "storage_info": "Store below 30 degrees C",
    },
]

# ----- DRUG INTERACTIONS (6 — aligned with Smart-Medicine-Hub) -----
INTERACTIONS_TEMPLATE = [
    {
        "drug_a_name": "Warfarin",
        "drug_b_name": "Ibuprofen",
        "severity": "major",
        "description": "Ibuprofen significantly increases the risk of bleeding when combined with Warfarin. NSAIDs inhibit platelet function and may cause GI bleeding.",
        "mechanism": "NSAIDs inhibit COX-1-dependent platelet aggregation and can cause gastric erosion, compounding anticoagulant bleeding risk.",
        "recommendation": "AVOID combination. Use Paracetamol for pain relief instead. If unavoidable, monitor INR closely.",
        "source": "DrugBank",
    },
    {
        "drug_a_name": "Warfarin",
        "drug_b_name": "Amoxicillin",
        "severity": "moderate",
        "description": "Amoxicillin may enhance the anticoagulant effect of Warfarin by disrupting gut flora that produce Vitamin K.",
        "mechanism": "Antibiotics disrupt intestinal flora responsible for Vitamin K synthesis, potentially increasing INR.",
        "recommendation": "Monitor INR more frequently during antibiotic course. Adjust Warfarin dose if needed.",
        "source": "FDA",
    },
    {
        "drug_a_name": "Ibuprofen",
        "drug_b_name": "Metformin",
        "severity": "moderate",
        "description": "Ibuprofen may increase the hypoglycaemic effect of Metformin and reduce renal function.",
        "mechanism": "NSAIDs can decrease renal blood flow, affecting metformin clearance and increasing lactic acidosis risk.",
        "recommendation": "Monitor blood glucose and renal function regularly. Consider Paracetamol as alternative.",
        "source": "BNF",
    },
    {
        "drug_a_name": "Metformin",
        "drug_b_name": "Atorvastatin",
        "severity": "minor",
        "description": "Minor interaction: Atorvastatin may slightly increase blood glucose levels in diabetic patients.",
        "mechanism": "Statins may affect glucose metabolism through effects on insulin secretion.",
        "recommendation": "Monitor blood glucose. No dosage adjustment usually required.",
        "source": "Clinical",
    },
    {
        "drug_a_name": "Ibuprofen",
        "drug_b_name": "Amoxicillin",
        "severity": "minor",
        "description": "No significant interaction expected. Safe to combine at normal doses.",
        "mechanism": "Different metabolic pathways.",
        "recommendation": "Safe at standard doses.",
        "source": "DrugBank",
    },
    {
        "drug_a_name": "Paracetamol",
        "drug_b_name": "Amoxicillin",
        "severity": "none",
        "description": "No known clinically significant interaction. Commonly used together for fever with infection.",
        "mechanism": "N/A",
        "recommendation": "Safe to use together.",
        "source": "DrugBank",
    },
]

# ----- GENERIC MAPPINGS -----
GENERIC_MAPPINGS = [
    {"brand_name": "Crocin", "generic_name": "Paracetamol IP 500mg", "savings_percent": 60},
    {"brand_name": "Amoxil", "generic_name": "Mox 500mg", "savings_percent": 47},
    {"brand_name": "Zyrtec", "generic_name": "Okacet 10mg", "savings_percent": 56},
    {"brand_name": "Omez", "generic_name": "Pantoprazole 40mg", "savings_percent": 10},
]

# ----- PHARMACIES (5 — Bangalore area) -----
PHARMACIES = [
    {
        "name": "MedPlus Pharmacy",
        "license_number": "KA/BLR/MP/2024/001",
        "address": "123 MG Road, Bangalore",
        "city": "Bangalore",
        "state": "Karnataka",
        "pincode": "560001",
        "phone": "+91-80-2222-1111",
        "latitude": Decimal("12.97160000"),
        "longitude": Decimal("77.59460000"),
        "rating": Decimal("4.5"),
        "is_open_24hrs": False,
        "operating_hours": {"monday-saturday": "8:00 AM - 10:00 PM", "sunday": "9:00 AM - 6:00 PM"},
    },
    {
        "name": "Apollo Pharmacy",
        "license_number": "KA/BLR/AP/2024/002",
        "address": "456 Indiranagar, Bangalore",
        "city": "Bangalore",
        "state": "Karnataka",
        "pincode": "560038",
        "phone": "+91-80-2222-2222",
        "latitude": Decimal("12.97840000"),
        "longitude": Decimal("77.64080000"),
        "rating": Decimal("4.3"),
        "is_open_24hrs": True,
        "operating_hours": {"all_days": "24 hours"},
    },
    {
        "name": "Netmeds Store",
        "license_number": "KA/BLR/NM/2024/003",
        "address": "789 Koramangala, Bangalore",
        "city": "Bangalore",
        "state": "Karnataka",
        "pincode": "560095",
        "phone": "+91-80-2222-3333",
        "latitude": Decimal("12.93520000"),
        "longitude": Decimal("77.62450000"),
        "rating": Decimal("4.1"),
        "is_open_24hrs": False,
        "operating_hours": {"monday-saturday": "9:00 AM - 9:00 PM", "sunday": "10:00 AM - 5:00 PM"},
    },
    {
        "name": "Wellness Forever",
        "license_number": "KA/BLR/WF/2024/004",
        "address": "321 Jayanagar, Bangalore",
        "city": "Bangalore",
        "state": "Karnataka",
        "pincode": "560041",
        "phone": "+91-80-2222-4444",
        "latitude": Decimal("12.92500000"),
        "longitude": Decimal("77.59380000"),
        "rating": Decimal("4.6"),
        "is_open_24hrs": False,
        "operating_hours": {"monday-saturday": "8:30 AM - 10:30 PM", "sunday": "9:00 AM - 8:00 PM"},
    },
    {
        "name": "HealthKart Pharmacy",
        "license_number": "KA/BLR/HK/2024/005",
        "address": "654 Whitefield, Bangalore",
        "city": "Bangalore",
        "state": "Karnataka",
        "pincode": "560066",
        "phone": "+91-80-2222-5555",
        "latitude": Decimal("12.96980000"),
        "longitude": Decimal("77.75000000"),
        "rating": Decimal("4.0"),
        "is_open_24hrs": True,
        "operating_hours": {"all_days": "24 hours"},
    },
]

# ----- KNOWN VERIFICATION CODES -----
VERIFICATION_CODES = [
    {
        "code": "MED-2024-001",
        "code_type": "barcode",
        "is_authentic": True,
        "medicine_name": "Crocin 500mg",
        "manufacturer": "GSK",
        "batch_number": "BATCH-001-2024",
        "manufacturing_date": date(2024, 1, 15),
        "expiry_date": date(2026, 1, 15),
        "verification_source": "manufacturer_db",
    },
    {
        "code": "MED-2024-002",
        "code_type": "qr_code",
        "is_authentic": True,
        "medicine_name": "Amoxicillin 500mg",
        "manufacturer": "Cipla",
        "batch_number": "BATCH-002-2024",
        "manufacturing_date": date(2024, 3, 1),
        "expiry_date": date(2026, 3, 1),
        "verification_source": "manufacturer_db",
    },
    {
        "code": "FAKE-001",
        "code_type": "barcode",
        "is_authentic": False,
        "medicine_name": "Suspicious Paracetamol",
        "manufacturer": "Unknown",
        "batch_number": "FAKE-BATCH",
        "verification_source": "counterfeit_db",
    },
]

# ----- FIRST AID KB -----
FIRST_AID_ENTRIES = [
    {
        "condition": "Burns",
        "immediate_actions": [
            "Cool the burn under running cold water for at least 20 minutes",
            "Remove jewellery or clothing near the burn (but not stuck to skin)",
            "Cover with a sterile non-fluffy dressing or cling film",
        ],
        "do_not": ["Do NOT apply ice directly", "Do NOT burst blisters", "Do NOT apply butter or toothpaste"],
        "seek_emergency_if": ["Burn is larger than palm size", "Face, hands, feet, or genitals affected", "Deep or charred burn"],
    },
    {
        "condition": "Choking (Adult)",
        "immediate_actions": [
            "Encourage coughing if able",
            "Give 5 back blows between shoulder blades",
            "Give 5 abdominal thrusts (Heimlich manoeuvre)",
        ],
        "do_not": ["Do NOT do blind finger sweep", "Do NOT give water while choking"],
        "seek_emergency_if": ["Person cannot breathe, talk, or cough", "Turns blue", "Loses consciousness"],
    },
    {
        "condition": "Bee/Wasp Sting",
        "immediate_actions": [
            "Remove stinger by scraping sideways with credit card",
            "Wash area with soap and water",
            "Apply cold compress for 10 minutes",
            "Take antihistamine if available",
        ],
        "do_not": ["Do NOT squeeze stinger", "Do NOT scratch the area"],
        "seek_emergency_if": ["Difficulty breathing", "Swelling of face/throat", "Known allergy to stings"],
    },
    {
        "condition": "Heat Stroke",
        "immediate_actions": [
            "Move person to cool, shaded area",
            "Remove excess clothing",
            "Cool with wet cloths or fan",
            "If conscious, give small sips of cool water",
        ],
        "do_not": ["Do NOT give large amounts of water quickly", "Do NOT give alcohol"],
        "seek_emergency_if": ["Temperature above 104F/40C", "Confusion", "Loss of consciousness", "Seizures"],
    },
    {
        "condition": "Nosebleed",
        "immediate_actions": [
            "Sit upright and lean slightly forward",
            "Pinch soft part of nose for 10-15 minutes",
            "Breathe through mouth",
        ],
        "do_not": ["Do NOT lean back", "Do NOT pack nose with tissue", "Do NOT blow nose for several hours"],
        "seek_emergency_if": ["Bleeding lasts more than 20 minutes", "Caused by head injury", "Heavy blood flow"],
    },
]


async def seed():
    async with async_session_factory() as session:
        # Check idempotent: skip if medicines already exist
        existing = await session.execute(select(Medicine).limit(1))
        if existing.scalar_one_or_none():
            print("Seed data already exists, skipping.")
            return

        # --- Seed Medicines ---
        medicine_map = {}  # name -> id
        for m_data in MEDICINES:
            med = Medicine(**m_data)
            session.add(med)
            await session.flush()
            medicine_map[m_data["name"]] = med.id
            if m_data.get("brand"):
                medicine_map[m_data["brand"]] = med.id

        # --- Seed Generic Mappings ---
        for gm_data in GENERIC_MAPPINGS:
            brand_id = medicine_map.get(gm_data["brand_name"])
            generic_id = None
            for name, mid in medicine_map.items():
                if name == gm_data["generic_name"]:
                    generic_id = mid
                    break
            if brand_id and generic_id:
                gm = GenericMapping(
                    brand_medicine_id=brand_id,
                    generic_medicine_id=generic_id,
                    composition_match_percent=100,
                    price_savings_percent=gm_data["savings_percent"],
                )
                session.add(gm)

        # --- Seed Interactions ---
        generic_to_id = {}
        for m_data in MEDICINES:
            if m_data["generic_name"] not in generic_to_id:
                generic_to_id[m_data["generic_name"]] = medicine_map[m_data["name"]]

        for i_data in INTERACTIONS_TEMPLATE:
            a_id = generic_to_id.get(i_data["drug_a_name"])
            b_id = generic_to_id.get(i_data["drug_b_name"])
            if a_id and b_id:
                interaction = DrugInteraction(
                    medicine_a_id=a_id,
                    medicine_b_id=b_id,
                    severity=i_data["severity"],
                    description=i_data["description"],
                    mechanism=i_data["mechanism"],
                    recommendation=i_data["recommendation"],
                    source=i_data["source"],
                )
                session.add(interaction)

        # --- Seed First Aid KB ---
        for fa_data in FIRST_AID_ENTRIES:
            faid = FirstAidKB(
                condition_name=fa_data["condition"],
                immediate_actions=fa_data["immediate_actions"],
                things_to_avoid=fa_data["do_not"],
                emergency_signs=fa_data["seek_emergency_if"],
            )
            session.add(faid)

        # --- Seed Pharmacies with Inventory ---
        all_medicine_ids = list(medicine_map.values())
        # deduplicate (brands share ids with name entries)
        unique_med_ids = list(dict.fromkeys(all_medicine_ids))
        pharmacy_ids = []
        for p_data in PHARMACIES:
            pharmacy = Pharmacy(**p_data)
            session.add(pharmacy)
            await session.flush()
            pharmacy_ids.append(pharmacy.id)

            sample_size = min(random.randint(8, 12), len(unique_med_ids))
            for med_id in random.sample(unique_med_ids, sample_size):
                inv = PharmacyInventory(
                    pharmacy_id=pharmacy.id,
                    medicine_id=med_id,
                    quantity=random.randint(5, 150),
                    price=Decimal(str(round(random.uniform(10, 30), 2))),
                    expiry_date=date(2027, 6, 30),
                    status="in_stock",
                )
                session.add(inv)

        # --- Seed Verification Codes ---
        for v_data in VERIFICATION_CODES:
            v = MedicineVerification(**v_data)
            session.add(v)

        # --- Seed Demand Tracking Data (3 months) ---
        periods = [date(2026, 1, 1), date(2026, 2, 1), date(2026, 3, 1)]
        for p_id in pharmacy_ids:
            sample_meds = random.sample(unique_med_ids, min(8, len(unique_med_ids)))
            for med_id in sample_meds:
                for period_date in periods:
                    dt = DemandTracking(
                        pharmacy_id=p_id,
                        medicine_id=med_id,
                        date=period_date,
                        units_searched=random.randint(10, 100),
                        units_reserved=random.randint(2, 30),
                        units_sold=random.randint(5, 50),
                    )
                    session.add(dt)

        await session.commit()
        print(
            f"Seeded {len(MEDICINES)} medicines, {len(INTERACTIONS_TEMPLATE)} interactions, "
            f"{len(FIRST_AID_ENTRIES)} first-aid entries, {len(PHARMACIES)} pharmacies, "
            f"{len(VERIFICATION_CODES)} verification codes"
        )


if __name__ == "__main__":
    asyncio.run(seed())
