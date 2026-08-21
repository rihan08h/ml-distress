import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  decimal,
  timestamp,
  jsonb,
  serial,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  role: varchar("role", { length: 20 }).notNull().default("patient"),
  subscriptionTier: varchar("subscription_tier", { length: 20 }).notNull().default("free"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const medicines = pgTable("medicines", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 500 }).notNull(),
  genericName: varchar("generic_name", { length: 255 }),
  brand: varchar("brand", { length: 255 }),
  manufacturer: varchar("manufacturer", { length: 255 }),
  composition: jsonb("composition").$type<{ ingredient: string; strength: string }[]>().default([]),
  dosageForm: varchar("dosage_form", { length: 50 }),
  dosageInstructions: jsonb("dosage_instructions").$type<{ adults?: string; children?: string; withFood?: string }>(),
  sideEffects: jsonb("side_effects").$type<{ common?: string[]; rare?: string[]; seekHelpIf?: string[] }>().default({}),
  contraindications: jsonb("contraindications").$type<string[]>().default([]),
  storageInfo: text("storage_info"),
  priceMrp: decimal("price_mrp", { precision: 10, scale: 2 }),
  packSize: varchar("pack_size", { length: 50 }),
  prescriptionRequired: boolean("prescription_required").default(false),
  category: varchar("category", { length: 100 }),
  isActive: boolean("is_active").default(true),
});

export const insertMedicineSchema = createInsertSchema(medicines).omit({
  id: true,
});

export type InsertMedicine = z.infer<typeof insertMedicineSchema>;
export type Medicine = typeof medicines.$inferSelect;

export const genericMappings = pgTable("generic_mappings", {
  id: serial("id").primaryKey(),
  brandMedicineId: integer("brand_medicine_id").notNull(),
  genericMedicineId: integer("generic_medicine_id").notNull(),
  compositionMatchPercent: decimal("composition_match_percent", { precision: 5, scale: 2 }).default("100.00"),
  priceSavingsPercent: decimal("price_savings_percent", { precision: 5, scale: 2 }),
});

export const insertGenericMappingSchema = createInsertSchema(genericMappings).omit({
  id: true,
});

export type InsertGenericMapping = z.infer<typeof insertGenericMappingSchema>;
export type GenericMapping = typeof genericMappings.$inferSelect;

export const drugInteractions = pgTable("drug_interactions", {
  id: serial("id").primaryKey(),
  medicineAId: integer("medicine_a_id").notNull(),
  medicineBId: integer("medicine_b_id").notNull(),
  severity: varchar("severity", { length: 20 }).notNull(),
  description: text("description").notNull(),
  recommendation: text("recommendation"),
  source: varchar("source", { length: 100 }),
});

export const insertDrugInteractionSchema = createInsertSchema(drugInteractions).omit({
  id: true,
});

export type InsertDrugInteraction = z.infer<typeof insertDrugInteractionSchema>;
export type DrugInteraction = typeof drugInteractions.$inferSelect;

export const reminders = pgTable("reminders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  medicineId: integer("medicine_id"),
  medicineName: varchar("medicine_name", { length: 500 }).notNull(),
  dosage: varchar("dosage", { length: 100 }),
  frequency: varchar("frequency", { length: 50 }).notNull(),
  times: jsonb("times").$type<string[]>().default([]),
  startDate: varchar("start_date", { length: 20 }).notNull(),
  endDate: varchar("end_date", { length: 20 }),
  isActive: boolean("is_active").default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertReminderSchema = createInsertSchema(reminders).omit({
  id: true,
  createdAt: true,
});

export type InsertReminder = z.infer<typeof insertReminderSchema>;
export type Reminder = typeof reminders.$inferSelect;

export const pharmacies = pgTable("pharmacies", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address").notNull(),
  phone: varchar("phone", { length: 20 }),
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  rating: decimal("rating", { precision: 2, scale: 1 }),
  isOpen: boolean("is_open").default(true),
  operatingHours: jsonb("operating_hours").$type<{ open: string; close: string }>(),
  licenseNumber: varchar("license_number", { length: 50 }),
  ownerUserId: integer("owner_user_id"),
  isActive: boolean("is_active").default(true),
});

export const insertPharmacySchema = createInsertSchema(pharmacies).omit({ id: true });
export type InsertPharmacy = z.infer<typeof insertPharmacySchema>;
export type Pharmacy = typeof pharmacies.$inferSelect;

export const pharmacyInventory = pgTable("pharmacy_inventory", {
  id: serial("id").primaryKey(),
  pharmacyId: integer("pharmacy_id").notNull(),
  medicineId: integer("medicine_id").notNull(),
  quantity: integer("quantity").notNull().default(0),
  price: decimal("price", { precision: 10, scale: 2 }),
  expiryDate: varchar("expiry_date", { length: 20 }),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const insertPharmacyInventorySchema = createInsertSchema(pharmacyInventory).omit({ id: true, lastUpdated: true });
export type InsertPharmacyInventory = z.infer<typeof insertPharmacyInventorySchema>;
export type PharmacyInventory = typeof pharmacyInventory.$inferSelect;

export const reservations = pgTable("reservations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  pharmacyId: integer("pharmacy_id").notNull(),
  medicineId: integer("medicine_id").notNull(),
  quantity: integer("quantity").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("confirmed"),
  confirmationCode: varchar("confirmation_code", { length: 20 }),
  pickupBy: varchar("pickup_by", { length: 30 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertReservationSchema = createInsertSchema(reservations).omit({ id: true, createdAt: true });
export type InsertReservation = z.infer<typeof insertReservationSchema>;
export type Reservation = typeof reservations.$inferSelect;

export const prescriptions = pgTable("prescriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  rawText: text("raw_text"),
  detectedMedicines: jsonb("detected_medicines").$type<{
    extractedName: string;
    matchedMedicineId?: number;
    matchedName?: string;
    dosage?: string;
    duration?: string;
    instructions?: string;
    confidence: number;
  }[]>().default([]),
  ocrConfidence: decimal("ocr_confidence", { precision: 3, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPrescriptionSchema = createInsertSchema(prescriptions).omit({ id: true, createdAt: true });
export type InsertPrescription = z.infer<typeof insertPrescriptionSchema>;
export type Prescription = typeof prescriptions.$inferSelect;

export const medicineVerifications = pgTable("medicine_verifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  code: varchar("code", { length: 100 }).notNull(),
  codeType: varchar("code_type", { length: 20 }).notNull(),
  isAuthentic: boolean("is_authentic"),
  medicineInfo: jsonb("medicine_info").$type<{
    name?: string;
    manufacturer?: string;
    batchNumber?: string;
    manufacturingDate?: string;
    expiryDate?: string;
    packSize?: string;
  }>(),
  verificationResult: jsonb("verification_result").$type<{
    confidence: string;
    verifiedWith?: string;
    reason?: string;
    actionRequired?: string;
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMedicineVerificationSchema = createInsertSchema(medicineVerifications).omit({ id: true, createdAt: true });
export type InsertMedicineVerification = z.infer<typeof insertMedicineVerificationSchema>;
export type MedicineVerification = typeof medicineVerifications.$inferSelect;

export const symptomSessions = pgTable("symptom_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  inputSymptoms: jsonb("input_symptoms").$type<string[]>().default([]),
  riskLevel: varchar("risk_level", { length: 20 }),
  predictions: jsonb("predictions").$type<{
    disease: string;
    confidence: number;
    description?: string;
    firstAid?: string[];
  }[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSymptomSessionSchema = createInsertSchema(symptomSessions).omit({ id: true, createdAt: true });
export type InsertSymptomSession = z.infer<typeof insertSymptomSessionSchema>;
export type SymptomSession = typeof symptomSessions.$inferSelect;

export const pharmacyTransfers = pgTable("pharmacy_transfers", {
  id: serial("id").primaryKey(),
  fromPharmacyId: integer("from_pharmacy_id").notNull(),
  toPharmacyId: integer("to_pharmacy_id").notNull(),
  medicineId: integer("medicine_id").notNull(),
  quantity: integer("quantity").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  reason: varchar("reason", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPharmacyTransferSchema = createInsertSchema(pharmacyTransfers).omit({ id: true, createdAt: true });
export type InsertPharmacyTransfer = z.infer<typeof insertPharmacyTransferSchema>;
export type PharmacyTransfer = typeof pharmacyTransfers.$inferSelect;

export const demandTracking = pgTable("demand_tracking", {
  id: serial("id").primaryKey(),
  medicineId: integer("medicine_id").notNull(),
  pharmacyId: integer("pharmacy_id"),
  searchCount: integer("search_count").notNull().default(0),
  reservationCount: integer("reservation_count").notNull().default(0),
  period: varchar("period", { length: 20 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDemandTrackingSchema = createInsertSchema(demandTracking).omit({ id: true, createdAt: true });
export type InsertDemandTracking = z.infer<typeof insertDemandTrackingSchema>;
export type DemandTracking = typeof demandTracking.$inferSelect;

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
