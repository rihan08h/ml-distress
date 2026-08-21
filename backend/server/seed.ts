import { db } from "./db";
import { medicines, genericMappings, drugInteractions, pharmacies, pharmacyInventory, demandTracking } from "@shared/schema";
import { sql } from "drizzle-orm";

export async function seedDatabase() {
  const existingMeds = await db.select().from(medicines).limit(1);
  if (existingMeds.length > 0) {
    await seedPharmacies();
    return;
  }

  console.log("Seeding database...");

  const meds = await db.insert(medicines).values([
    {
      name: "Crocin Advance 500mg",
      genericName: "Paracetamol",
      brand: "Crocin",
      manufacturer: "GSK Consumer Healthcare",
      composition: [{ ingredient: "Paracetamol", strength: "500mg" }],
      dosageForm: "tablet",
      dosageInstructions: { adults: "1-2 tablets every 4-6 hours. Max 8 tablets/day.", children: "Consult doctor for dosage.", withFood: "Can be taken with or without food" },
      sideEffects: { common: ["Nausea", "Allergic skin reactions"], rare: ["Liver damage (overdose)", "Blood disorders"], seekHelpIf: ["Skin rash or peeling", "Difficulty breathing"] },
      contraindications: ["Severe liver disease", "Alcohol dependence"],
      storageInfo: "Store below 30°C in a dry place",
      priceMrp: "30.50",
      packSize: "15 tablets",
      prescriptionRequired: false,
      category: "analgesic",
    },
    {
      name: "Paracetamol IP 500mg",
      genericName: "Paracetamol",
      brand: null,
      manufacturer: "Cipla",
      composition: [{ ingredient: "Paracetamol", strength: "500mg" }],
      dosageForm: "tablet",
      dosageInstructions: { adults: "1-2 tablets every 4-6 hours", children: "Consult doctor", withFood: "With or without food" },
      sideEffects: { common: ["Nausea"], rare: ["Liver damage (overdose)"] },
      contraindications: ["Severe liver disease"],
      storageInfo: "Store below 30°C",
      priceMrp: "12.00",
      packSize: "10 tablets",
      prescriptionRequired: false,
      category: "analgesic",
    },
    {
      name: "Dolo 650mg",
      genericName: "Paracetamol",
      brand: "Dolo",
      manufacturer: "Micro Labs",
      composition: [{ ingredient: "Paracetamol", strength: "650mg" }],
      dosageForm: "tablet",
      dosageInstructions: { adults: "1 tablet every 4-6 hours. Max 4 tablets/day.", children: "Not recommended for children under 12", withFood: "Can be taken with or without food" },
      sideEffects: { common: ["Nausea", "Stomach upset"], rare: ["Liver damage"], seekHelpIf: ["Yellowing of skin", "Dark urine"] },
      contraindications: ["Severe liver impairment"],
      storageInfo: "Store below 25°C in a cool, dry place",
      priceMrp: "26.00",
      packSize: "15 tablets",
      prescriptionRequired: false,
      category: "analgesic",
    },
    {
      name: "Amoxicillin 500mg Capsule",
      genericName: "Amoxicillin",
      brand: "Amoxil",
      manufacturer: "GSK",
      composition: [{ ingredient: "Amoxicillin Trihydrate", strength: "500mg" }],
      dosageForm: "capsule",
      dosageInstructions: { adults: "1 capsule every 8 hours for 7-10 days", children: "Dosage based on weight, consult doctor", withFood: "Preferably after food" },
      sideEffects: { common: ["Diarrhea", "Nausea", "Skin rash"], rare: ["Severe allergic reaction", "Liver inflammation"], seekHelpIf: ["Severe skin rash", "Swelling of face/throat", "Difficulty breathing"] },
      contraindications: ["Penicillin allergy", "Mononucleosis"],
      storageInfo: "Store below 25°C. Keep away from moisture",
      priceMrp: "85.00",
      packSize: "10 capsules",
      prescriptionRequired: true,
      category: "antibiotic",
    },
    {
      name: "Mox 500mg",
      genericName: "Amoxicillin",
      brand: "Mox",
      manufacturer: "Ranbaxy",
      composition: [{ ingredient: "Amoxicillin Trihydrate", strength: "500mg" }],
      dosageForm: "capsule",
      dosageInstructions: { adults: "1 capsule every 8 hours", children: "As directed by physician", withFood: "After food" },
      sideEffects: { common: ["Diarrhea", "Nausea"], rare: ["Allergic reaction"] },
      contraindications: ["Penicillin allergy"],
      storageInfo: "Store below 25°C",
      priceMrp: "42.00",
      packSize: "10 capsules",
      prescriptionRequired: true,
      category: "antibiotic",
    },
    {
      name: "Warfarin 5mg",
      genericName: "Warfarin Sodium",
      brand: "Warf",
      manufacturer: "Cipla",
      composition: [{ ingredient: "Warfarin Sodium", strength: "5mg" }],
      dosageForm: "tablet",
      dosageInstructions: { adults: "As prescribed by physician based on INR levels", children: "Not typically used in children", withFood: "Take at the same time each day" },
      sideEffects: { common: ["Easy bruising", "Minor bleeding"], rare: ["Major bleeding", "Skin necrosis"], seekHelpIf: ["Unusual bleeding", "Blood in urine/stool", "Severe headache"] },
      contraindications: ["Active bleeding", "Pregnancy", "Severe liver disease", "Recent surgery"],
      storageInfo: "Store below 30°C, protect from light",
      priceMrp: "35.00",
      packSize: "30 tablets",
      prescriptionRequired: true,
      category: "anticoagulant",
    },
    {
      name: "Metformin 500mg",
      genericName: "Metformin Hydrochloride",
      brand: "Glycomet",
      manufacturer: "USV",
      composition: [{ ingredient: "Metformin Hydrochloride", strength: "500mg" }],
      dosageForm: "tablet",
      dosageInstructions: { adults: "1 tablet twice daily with meals", children: "Not recommended under 10 years", withFood: "Take with meals to reduce stomach upset" },
      sideEffects: { common: ["Nausea", "Diarrhea", "Stomach upset", "Metallic taste"], rare: ["Lactic acidosis", "Vitamin B12 deficiency"], seekHelpIf: ["Severe nausea/vomiting", "Unusual muscle pain", "Difficulty breathing"] },
      contraindications: ["Severe kidney disease", "Liver disease", "Heart failure", "Alcoholism"],
      storageInfo: "Store below 30°C",
      priceMrp: "28.00",
      packSize: "20 tablets",
      prescriptionRequired: true,
      category: "antidiabetic",
    },
    {
      name: "Cetirizine 10mg",
      genericName: "Cetirizine Hydrochloride",
      brand: "Zyrtec",
      manufacturer: "Johnson & Johnson",
      composition: [{ ingredient: "Cetirizine Hydrochloride", strength: "10mg" }],
      dosageForm: "tablet",
      dosageInstructions: { adults: "1 tablet once daily", children: "5mg once daily for children 6-12", withFood: "Can be taken with or without food" },
      sideEffects: { common: ["Drowsiness", "Dry mouth", "Headache"], rare: ["Allergic reactions", "Liver problems"] },
      contraindications: ["Severe kidney disease"],
      storageInfo: "Store below 25°C",
      priceMrp: "45.00",
      packSize: "10 tablets",
      prescriptionRequired: false,
      category: "antihistamine",
    },
    {
      name: "Okacet 10mg",
      genericName: "Cetirizine Hydrochloride",
      brand: "Okacet",
      manufacturer: "Cipla",
      composition: [{ ingredient: "Cetirizine Hydrochloride", strength: "10mg" }],
      dosageForm: "tablet",
      dosageInstructions: { adults: "1 tablet once daily", children: "Consult doctor", withFood: "With or without food" },
      sideEffects: { common: ["Drowsiness", "Dry mouth"], rare: ["Liver problems"] },
      contraindications: ["Severe kidney disease"],
      storageInfo: "Store below 25°C",
      priceMrp: "18.00",
      packSize: "10 tablets",
      prescriptionRequired: false,
      category: "antihistamine",
    },
    {
      name: "Amlodipine 5mg",
      genericName: "Amlodipine Besylate",
      brand: "Amlong",
      manufacturer: "Micro Labs",
      composition: [{ ingredient: "Amlodipine Besylate", strength: "5mg" }],
      dosageForm: "tablet",
      dosageInstructions: { adults: "1 tablet once daily", children: "As directed by physician", withFood: "Can be taken with or without food" },
      sideEffects: { common: ["Swelling of ankles", "Headache", "Flushing", "Dizziness"], rare: ["Palpitations", "Liver problems"], seekHelpIf: ["Severe dizziness", "Irregular heartbeat"] },
      contraindications: ["Severe aortic stenosis", "Cardiogenic shock"],
      storageInfo: "Store below 30°C",
      priceMrp: "32.00",
      packSize: "30 tablets",
      prescriptionRequired: true,
      category: "antihypertensive",
    },
    {
      name: "Omeprazole 20mg",
      genericName: "Omeprazole",
      brand: "Omez",
      manufacturer: "Dr. Reddy's",
      composition: [{ ingredient: "Omeprazole", strength: "20mg" }],
      dosageForm: "capsule",
      dosageInstructions: { adults: "1 capsule once daily before breakfast", children: "As directed by physician", withFood: "Take 30 minutes before food" },
      sideEffects: { common: ["Headache", "Nausea", "Diarrhea", "Stomach pain"], rare: ["Vitamin B12 deficiency", "Bone fractures with long-term use"] },
      contraindications: ["Hypersensitivity to proton pump inhibitors"],
      storageInfo: "Store below 25°C, protect from moisture",
      priceMrp: "55.00",
      packSize: "15 capsules",
      prescriptionRequired: false,
      category: "antacid",
    },
    {
      name: "Pantoprazole 40mg",
      genericName: "Pantoprazole",
      brand: "Pan 40",
      manufacturer: "Alkem",
      composition: [{ ingredient: "Pantoprazole Sodium", strength: "40mg" }],
      dosageForm: "tablet",
      dosageInstructions: { adults: "1 tablet once daily before breakfast", children: "As directed", withFood: "Take before food" },
      sideEffects: { common: ["Headache", "Diarrhea", "Flatulence"], rare: ["Joint pain", "Fractures"] },
      contraindications: ["Hypersensitivity to PPIs"],
      storageInfo: "Store below 25°C",
      priceMrp: "68.00",
      packSize: "15 tablets",
      prescriptionRequired: false,
      category: "antacid",
    },
    {
      name: "Azithromycin 500mg",
      genericName: "Azithromycin",
      brand: "Azithral",
      manufacturer: "Alembic",
      composition: [{ ingredient: "Azithromycin Dihydrate", strength: "500mg" }],
      dosageForm: "tablet",
      dosageInstructions: { adults: "1 tablet once daily for 3-5 days", children: "Dose based on weight", withFood: "Can be taken with or without food" },
      sideEffects: { common: ["Diarrhea", "Nausea", "Abdominal pain"], rare: ["Heart rhythm changes", "Liver problems"], seekHelpIf: ["Severe diarrhea", "Yellowing of skin", "Irregular heartbeat"] },
      contraindications: ["Macrolide allergy", "Severe liver disease"],
      storageInfo: "Store below 30°C",
      priceMrp: "95.00",
      packSize: "3 tablets",
      prescriptionRequired: true,
      category: "antibiotic",
    },
    {
      name: "Ibuprofen 400mg",
      genericName: "Ibuprofen",
      brand: "Brufen",
      manufacturer: "Abbott",
      composition: [{ ingredient: "Ibuprofen", strength: "400mg" }],
      dosageForm: "tablet",
      dosageInstructions: { adults: "1 tablet every 6-8 hours as needed", children: "Use pediatric formulation", withFood: "Take after food to reduce stomach upset" },
      sideEffects: { common: ["Stomach upset", "Nausea", "Headache"], rare: ["GI bleeding", "Kidney problems", "Cardiovascular events"], seekHelpIf: ["Black tarry stools", "Severe stomach pain", "Swelling"] },
      contraindications: ["Active GI bleeding", "Severe heart failure", "Last trimester of pregnancy", "NSAID allergy"],
      storageInfo: "Store below 25°C",
      priceMrp: "20.00",
      packSize: "15 tablets",
      prescriptionRequired: false,
      category: "analgesic",
    },
    {
      name: "Atorvastatin 10mg",
      genericName: "Atorvastatin Calcium",
      brand: "Atorva",
      manufacturer: "Zydus",
      composition: [{ ingredient: "Atorvastatin Calcium", strength: "10mg" }],
      dosageForm: "tablet",
      dosageInstructions: { adults: "1 tablet once daily, preferably at night", children: "Not recommended under 10", withFood: "Can be taken with or without food" },
      sideEffects: { common: ["Muscle pain", "Joint pain", "Headache"], rare: ["Rhabdomyolysis", "Liver damage"], seekHelpIf: ["Unexplained muscle pain", "Dark urine", "Yellowing of skin"] },
      contraindications: ["Active liver disease", "Pregnancy", "Breastfeeding"],
      storageInfo: "Store below 30°C, protect from light",
      priceMrp: "72.00",
      packSize: "10 tablets",
      prescriptionRequired: true,
      category: "statin",
    },
  ]).returning();

  const medMap = new Map(meds.map(m => [m.name, m.id]));

  await db.insert(genericMappings).values([
    { brandMedicineId: medMap.get("Crocin Advance 500mg")!, genericMedicineId: medMap.get("Paracetamol IP 500mg")!, compositionMatchPercent: "100.00", priceSavingsPercent: "60.00" },
    { brandMedicineId: medMap.get("Crocin Advance 500mg")!, genericMedicineId: medMap.get("Dolo 650mg")!, compositionMatchPercent: "85.00", priceSavingsPercent: "15.00" },
    { brandMedicineId: medMap.get("Amoxicillin 500mg Capsule")!, genericMedicineId: medMap.get("Mox 500mg")!, compositionMatchPercent: "100.00", priceSavingsPercent: "50.00" },
    { brandMedicineId: medMap.get("Cetirizine 10mg")!, genericMedicineId: medMap.get("Okacet 10mg")!, compositionMatchPercent: "100.00", priceSavingsPercent: "60.00" },
  ]);

  await db.insert(drugInteractions).values([
    {
      medicineAId: medMap.get("Warfarin 5mg")!,
      medicineBId: medMap.get("Amoxicillin 500mg Capsule")!,
      severity: "moderate",
      description: "Amoxicillin may increase the anticoagulant effect of Warfarin, increasing bleeding risk.",
      recommendation: "Monitor INR closely. Consult your doctor before combining these medications.",
      source: "DrugBank / OpenFDA",
    },
    {
      medicineAId: medMap.get("Warfarin 5mg")!,
      medicineBId: medMap.get("Ibuprofen 400mg")!,
      severity: "major",
      description: "NSAIDs like Ibuprofen significantly increase the risk of GI bleeding when combined with Warfarin.",
      recommendation: "Avoid this combination. Use Paracetamol instead of Ibuprofen for pain relief.",
      source: "DrugBank / Clinical Guidelines",
    },
    {
      medicineAId: medMap.get("Warfarin 5mg")!,
      medicineBId: medMap.get("Azithromycin 500mg")!,
      severity: "moderate",
      description: "Azithromycin may increase Warfarin levels, raising the risk of bleeding.",
      recommendation: "Monitor INR and watch for signs of bleeding. Dose adjustment may be needed.",
      source: "DrugBank",
    },
    {
      medicineAId: medMap.get("Metformin 500mg")!,
      medicineBId: medMap.get("Ibuprofen 400mg")!,
      severity: "minor",
      description: "NSAIDs may slightly reduce the glucose-lowering effect of Metformin.",
      recommendation: "Monitor blood glucose levels. Short-term use is generally acceptable.",
      source: "OpenFDA",
    },
    {
      medicineAId: medMap.get("Amlodipine 5mg")!,
      medicineBId: medMap.get("Atorvastatin 10mg")!,
      severity: "moderate",
      description: "Amlodipine may increase blood levels of Atorvastatin, raising the risk of muscle-related side effects.",
      recommendation: "Limit Atorvastatin dose to 20mg when used with Amlodipine. Monitor for muscle pain.",
      source: "FDA Drug Label / Clinical Guidelines",
    },
    {
      medicineAId: medMap.get("Omeprazole 20mg")!,
      medicineBId: medMap.get("Metformin 500mg")!,
      severity: "minor",
      description: "Omeprazole may slightly increase Metformin absorption.",
      recommendation: "Usually clinically insignificant. Monitor blood sugar levels.",
      source: "Clinical Studies",
    },
  ]);

  await seedPharmaciesWithMeds(medMap);

  console.log("Database seeded successfully!");
}

async function seedPharmacies() {
  const existingPharmacies = await db.select().from(pharmacies).limit(1);
  if (existingPharmacies.length > 0) return;
  const allMeds = await db.select().from(medicines);
  const medMap = new Map(allMeds.map(m => [m.name, m.id]));
  await seedPharmaciesWithMeds(medMap);
}

async function seedPharmaciesWithMeds(medMap: Map<string, number>) {
  const existingPharmacies = await db.select().from(pharmacies).limit(1);
  if (existingPharmacies.length > 0) return;

  console.log("Seeding pharmacies...");

  const pharmas = await db.insert(pharmacies).values([
    {
      name: "Apollo Pharmacy - MG Road",
      address: "45 MG Road, Bangalore 560001",
      phone: "+91-80-4567-1234",
      latitude: "12.97160000",
      longitude: "77.59460000",
      rating: "4.5",
      isOpen: true,
      operatingHours: { open: "08:00", close: "22:00" },
      licenseNumber: "KA/BNG/PHR/2024/001",
      isActive: true,
    },
    {
      name: "MedPlus - Koramangala",
      address: "12 80 Feet Road, Koramangala, Bangalore 560034",
      phone: "+91-80-4567-5678",
      latitude: "12.93520000",
      longitude: "77.62460000",
      rating: "4.2",
      isOpen: true,
      operatingHours: { open: "07:00", close: "23:00" },
      licenseNumber: "KA/BNG/PHR/2024/002",
      isActive: true,
    },
    {
      name: "Netmeds Store - Indiranagar",
      address: "100 Feet Road, Indiranagar, Bangalore 560038",
      phone: "+91-80-4567-9012",
      latitude: "12.97830000",
      longitude: "77.64080000",
      rating: "4.0",
      isOpen: true,
      operatingHours: { open: "09:00", close: "21:00" },
      licenseNumber: "KA/BNG/PHR/2024/003",
      isActive: true,
    },
    {
      name: "Wellness Forever - HSR Layout",
      address: "27th Main, HSR Layout Sector 1, Bangalore 560102",
      phone: "+91-80-4567-3456",
      latitude: "12.91160000",
      longitude: "77.64170000",
      rating: "4.3",
      isOpen: false,
      operatingHours: { open: "08:00", close: "21:30" },
      licenseNumber: "KA/BNG/PHR/2024/004",
      isActive: true,
    },
    {
      name: "1mg Store - Whitefield",
      address: "ITPL Main Road, Whitefield, Bangalore 560066",
      phone: "+91-80-4567-7890",
      latitude: "12.96980000",
      longitude: "77.74960000",
      rating: "4.1",
      isOpen: true,
      operatingHours: { open: "08:30", close: "22:00" },
      licenseNumber: "KA/BNG/PHR/2024/005",
      isActive: true,
    },
  ]).returning();

  const inventoryData: { pharmacyId: number; medicineId: number; quantity: number; price: string; expiryDate: string }[] = [];

  for (const pharm of pharmas) {
    const medNames = Array.from(medMap.keys());
    const stockCount = 8 + Math.floor(Math.random() * 5);
    const selectedMeds = medNames.sort(() => Math.random() - 0.5).slice(0, Math.min(stockCount, medNames.length));

    for (const medName of selectedMeds) {
      const medId = medMap.get(medName)!;
      inventoryData.push({
        pharmacyId: pharm.id,
        medicineId: medId,
        quantity: Math.floor(Math.random() * 150) + 5,
        price: (Math.random() * 20 + 10).toFixed(2),
        expiryDate: "2027-06-30",
      });
    }
  }

  await db.insert(pharmacyInventory).values(inventoryData);

  const periods = ["2026-01", "2026-02", "2026-03"];
  const demandData: { medicineId: number; pharmacyId: number; searchCount: number; reservationCount: number; period: string }[] = [];
  for (const period of periods) {
    for (const pharm of pharmas) {
      const medNames = Array.from(medMap.keys()).slice(0, 8);
      for (const medName of medNames) {
        const medId = medMap.get(medName)!;
        demandData.push({
          medicineId: medId,
          pharmacyId: pharm.id,
          searchCount: Math.floor(Math.random() * 100) + 10,
          reservationCount: Math.floor(Math.random() * 30) + 2,
          period,
        });
      }
    }
  }

  await db.insert(demandTracking).values(demandData);
  console.log("Pharmacies and inventory seeded!");
}
