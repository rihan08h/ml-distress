/**
 * Shared types for the Smart Medicine frontend.
 * These types mirror the backend database schema (Drizzle ORM)
 * but are defined as plain TypeScript interfaces for the client.
 */

export interface User {
  id: number;
  email: string;
  password: string;
  fullName: string;
  phone: string | null;
  role: string;
  subscriptionTier: string;
  createdAt: string | null;
}

export interface Medicine {
  id: number;
  name: string;
  genericName: string | null;
  brand: string | null;
  manufacturer: string | null;
  composition: { ingredient: string; strength: string }[];
  dosageForm: string | null;
  dosageInstructions: { adults?: string; children?: string; withFood?: string } | null;
  sideEffects: { common?: string[]; rare?: string[]; seekHelpIf?: string[] };
  contraindications: string[];
  storageInfo: string | null;
  priceMrp: string | null;
  packSize: string | null;
  prescriptionRequired: boolean | null;
  category: string | null;
  isActive: boolean | null;
}

export interface Reminder {
  id: number;
  userId: number;
  medicineId: number | null;
  medicineName: string;
  dosage: string | null;
  frequency: string;
  times: string[];
  startDate: string;
  endDate: string | null;
  isActive: boolean | null;
  notes: string | null;
  createdAt: string | null;
}

export interface DrugInteraction {
  id: number;
  medicineAId: number;
  medicineBId: number;
  severity: string;
  description: string;
  recommendation: string | null;
  source: string | null;
}

export interface Pharmacy {
  id: number;
  name: string;
  address: string;
  phone: string | null;
  latitude: string;
  longitude: string;
  rating: string | null;
  isOpen: boolean | null;
  operatingHours: { open: string; close: string } | null;
  licenseNumber: string | null;
  ownerUserId: number | null;
  isActive: boolean | null;
}

export interface PharmacyInventory {
  id: number;
  pharmacyId: number;
  medicineId: number;
  quantity: number;
  price: string | null;
  expiryDate: string | null;
  lastUpdated: string | null;
}

export interface Reservation {
  id: number;
  userId: number;
  pharmacyId: number;
  medicineId: number;
  quantity: number;
  status: string;
  confirmationCode: string | null;
  pickupBy: string | null;
  createdAt: string | null;
}

export interface Prescription {
  id: number;
  userId: number;
  rawText: string | null;
  detectedMedicines: {
    extractedName: string;
    matchedMedicineId?: number;
    matchedName?: string;
    dosage?: string;
    duration?: string;
    instructions?: string;
    confidence: number;
  }[];
  ocrConfidence: string | null;
  createdAt: string | null;
}

export interface MedicineVerification {
  id: number;
  userId: number | null;
  code: string;
  codeType: string;
  isAuthentic: boolean | null;
  medicineInfo: {
    name?: string;
    manufacturer?: string;
    batchNumber?: string;
    manufacturingDate?: string;
    expiryDate?: string;
    packSize?: string;
  } | null;
  verificationResult: {
    confidence: string;
    verifiedWith?: string;
    reason?: string;
    actionRequired?: string;
  } | null;
  createdAt: string | null;
}

export interface SymptomSession {
  id: number;
  userId: number;
  inputSymptoms: string[];
  riskLevel: string | null;
  predictions: {
    disease: string;
    confidence: number;
    description?: string;
    firstAid?: string[];
  }[];
  createdAt: string | null;
}

export interface PharmacyTransfer {
  id: number;
  fromPharmacyId: number;
  toPharmacyId: number;
  medicineId: number;
  quantity: number;
  status: string;
  reason: string | null;
  createdAt: string | null;
}

export interface DemandTracking {
  id: number;
  medicineId: number;
  pharmacyId: number | null;
  searchCount: number;
  reservationCount: number;
  period: string;
  createdAt: string | null;
}

export const SYMPTOM_LIST = [
  "fever", "cough", "headache", "fatigue", "nausea", "vomiting",
  "diarrhea", "sore throat", "runny nose", "body aches", "chills",
  "shortness of breath", "chest pain", "dizziness", "abdominal pain",
  "joint pain", "muscle pain", "rash", "itching", "swelling",
  "loss of appetite", "weight loss", "night sweats", "frequent urination",
  "burning urination", "blood in urine", "constipation", "bloating",
  "heartburn", "back pain", "neck stiffness", "blurred vision",
  "ear pain", "difficulty swallowing", "sneezing", "watery eyes",
  "skin redness", "bruising", "numbness", "tingling",
] as const;

export const SYMPTOM_DISEASE_MAP: Record<string, {
  disease: string;
  confidence: number;
  description: string;
  riskLevel: string;
  firstAid: string[];
}[]> = {
  "fever,cough,sore throat": [
    { disease: "Common Cold", confidence: 0.85, description: "Viral upper respiratory infection causing congestion, cough, and sore throat.", riskLevel: "low", firstAid: ["Rest and stay hydrated", "Take paracetamol for fever", "Gargle with warm salt water", "Use honey for sore throat"] },
    { disease: "Influenza (Flu)", confidence: 0.70, description: "Influenza virus infection with sudden onset of fever, body aches, and respiratory symptoms.", riskLevel: "medium", firstAid: ["Rest completely", "Stay hydrated with warm fluids", "Take antiviral medication if within 48 hours", "Monitor temperature regularly"] },
  ],
  "fever,headache,body aches": [
    { disease: "Influenza (Flu)", confidence: 0.80, description: "Influenza infection characterized by high fever, severe headache, and generalized body pain.", riskLevel: "medium", firstAid: ["Complete bed rest", "Take paracetamol for pain and fever", "Increase fluid intake", "Seek medical attention if fever persists >3 days"] },
    { disease: "Dengue Fever", confidence: 0.55, description: "Mosquito-borne viral disease causing high fever, severe headache, and joint/muscle pain.", riskLevel: "high", firstAid: ["Seek immediate medical attention", "Stay hydrated with ORS", "Do NOT take aspirin or ibuprofen", "Monitor platelet count"] },
  ],
  "chest pain,shortness of breath": [
    { disease: "Cardiac Event", confidence: 0.65, description: "Possible heart-related condition requiring immediate medical evaluation.", riskLevel: "emergency", firstAid: ["Call emergency services immediately (112)", "Sit upright and stay calm", "Chew aspirin 325mg if available", "Loosen tight clothing"] },
    { disease: "Anxiety/Panic Attack", confidence: 0.50, description: "Severe anxiety episode that can mimic heart attack symptoms.", riskLevel: "medium", firstAid: ["Practice deep breathing (4-7-8 technique)", "Focus on slow, controlled breaths", "Ground yourself with 5 senses technique", "Seek medical evaluation to rule out cardiac causes"] },
  ],
  "nausea,vomiting,diarrhea": [
    { disease: "Gastroenteritis", confidence: 0.85, description: "Inflammation of the stomach and intestines, commonly caused by viral or bacterial infection.", riskLevel: "low", firstAid: ["Stay hydrated with ORS solution", "Eat bland foods (BRAT diet)", "Avoid dairy and fatty foods", "Seek help if symptoms persist >48 hours"] },
    { disease: "Food Poisoning", confidence: 0.75, description: "Illness caused by consuming contaminated food or water.", riskLevel: "medium", firstAid: ["Drink plenty of clear fluids", "Avoid solid food for first few hours", "Take ORS to prevent dehydration", "See doctor if bloody stool or high fever"] },
  ],
  "joint pain,swelling,fatigue": [
    { disease: "Rheumatoid Arthritis", confidence: 0.60, description: "Autoimmune condition causing joint inflammation, pain, and stiffness.", riskLevel: "medium", firstAid: ["Apply warm compress to affected joints", "Gentle range-of-motion exercises", "Take anti-inflammatory medication as prescribed", "Consult rheumatologist for proper evaluation"] },
    { disease: "Viral Arthralgia", confidence: 0.55, description: "Joint pain associated with viral infections like Chikungunya.", riskLevel: "medium", firstAid: ["Rest the affected joints", "Apply ice packs for 15-20 minutes", "Take paracetamol for pain relief", "Stay hydrated and rest"] },
  ],
  "frequent urination,burning urination": [
    { disease: "Urinary Tract Infection (UTI)", confidence: 0.88, description: "Bacterial infection of the urinary tract causing pain and frequency.", riskLevel: "low", firstAid: ["Drink plenty of water", "Avoid caffeine and alcohol", "Take prescribed antibiotics", "See doctor if blood in urine or fever develops"] },
  ],
  "rash,itching,skin redness": [
    { disease: "Allergic Dermatitis", confidence: 0.80, description: "Skin inflammation caused by allergic reaction to substances.", riskLevel: "low", firstAid: ["Avoid the triggering substance", "Apply calamine lotion", "Take antihistamine (cetirizine)", "Use cold compress for relief"] },
    { disease: "Eczema", confidence: 0.55, description: "Chronic skin condition causing dry, itchy, inflamed skin patches.", riskLevel: "low", firstAid: ["Moisturize skin regularly", "Avoid hot water and harsh soaps", "Apply prescribed topical corticosteroid", "Wear soft, breathable fabrics"] },
  ],
  "headache,dizziness,blurred vision": [
    { disease: "Hypertension", confidence: 0.65, description: "High blood pressure causing headache, dizziness, and visual changes.", riskLevel: "high", firstAid: ["Sit down and rest immediately", "Measure blood pressure if possible", "Seek immediate medical attention", "Do not take any medication without consulting doctor"] },
    { disease: "Migraine", confidence: 0.70, description: "Severe recurring headache often with visual disturbances and sensitivity.", riskLevel: "medium", firstAid: ["Rest in a dark, quiet room", "Apply cold pack to forehead", "Take prescribed migraine medication", "Stay hydrated"] },
  ],
  "fever,neck stiffness,headache": [
    { disease: "Meningitis", confidence: 0.70, description: "Serious infection causing inflammation of brain and spinal cord membranes.", riskLevel: "emergency", firstAid: ["Seek emergency medical help immediately (112)", "Do not wait for symptoms to worsen", "Keep patient comfortable and still", "Note onset time of symptoms for doctors"] },
  ],
  "abdominal pain,bloating,constipation": [
    { disease: "Irritable Bowel Syndrome (IBS)", confidence: 0.70, description: "Chronic gastrointestinal disorder affecting bowel habits.", riskLevel: "low", firstAid: ["Increase fiber intake gradually", "Stay well hydrated", "Exercise regularly", "Manage stress with relaxation techniques"] },
    { disease: "Gastritis", confidence: 0.55, description: "Inflammation of the stomach lining causing pain and discomfort.", riskLevel: "low", firstAid: ["Avoid spicy and acidic foods", "Eat smaller, frequent meals", "Take antacid medication", "Avoid NSAIDs like ibuprofen"] },
  ],
};

// Zod validation schemas (for frontend form validation)
import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
