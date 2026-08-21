import { db } from "./db";
import { eq, ilike, or, and, sql, desc } from "drizzle-orm";
import { matchSymptoms } from "./chatbot";
import {
  users,
  medicines,
  genericMappings,
  drugInteractions,
  reminders,
  pharmacies,
  pharmacyInventory,
  reservations,
  prescriptions,
  medicineVerifications,
  symptomSessions,
  pharmacyTransfers,
  demandTracking,
  type User,
  type InsertUser,
  type Medicine,
  type InsertMedicine,
  type Reminder,
  type InsertReminder,
  type DrugInteraction,
  type Pharmacy,
  type InsertPharmacy,
  type PharmacyInventory,
  type InsertPharmacyInventory,
  type Reservation,
  type InsertReservation,
  type Prescription,
  type InsertPrescription,
  type MedicineVerification,
  type InsertMedicineVerification,
  type SymptomSession,
  type InsertSymptomSession,
  type PharmacyTransfer,
  type InsertPharmacyTransfer,
  type DemandTracking,
} from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined>;

  searchMedicines(query: string, limit?: number): Promise<Medicine[]>;
  getMedicine(id: number): Promise<Medicine | undefined>;
  getGenericAlternatives(medicineId: number): Promise<{ brandMedicine: Medicine; alternatives: (Medicine & { savingsPercent: string })[] }>;
  createMedicine(med: InsertMedicine): Promise<Medicine>;

  checkInteractions(medicineIds: number[]): Promise<{
    totalChecked: number;
    interactionsFound: number;
    interactions: { medicineA: string; medicineB: string; severity: string; description: string; recommendation: string; source: string }[];
    safeCombinations: { medicineA: string; medicineB: string }[];
  }>;

  getReminders(userId: number): Promise<Reminder[]>;
  createReminder(data: InsertReminder): Promise<Reminder>;
  updateReminder(id: number, userId: number, data: Partial<InsertReminder>): Promise<Reminder | undefined>;
  deleteReminder(id: number, userId: number): Promise<boolean>;

  getPharmacies(lat?: number, lng?: number): Promise<(Pharmacy & { distance?: number })[]>;
  getPharmacy(id: number): Promise<Pharmacy | undefined>;
  getPharmacyInventory(pharmacyId: number): Promise<(PharmacyInventory & { medicine?: Medicine })[]>;
  searchPharmaciesWithMedicine(medicineId: number, lat?: number, lng?: number): Promise<(Pharmacy & { quantity: number; price: string; distance?: number })[]>;
  updateInventory(pharmacyId: number, medicineId: number, data: Partial<InsertPharmacyInventory>): Promise<PharmacyInventory | undefined>;
  createInventoryItem(data: InsertPharmacyInventory): Promise<PharmacyInventory>;

  createReservation(data: InsertReservation): Promise<Reservation>;
  getReservations(userId: number): Promise<Reservation[]>;

  createPrescription(data: InsertPrescription): Promise<Prescription>;
  getPrescriptions(userId: number): Promise<Prescription[]>;

  verifyMedicine(data: InsertMedicineVerification): Promise<MedicineVerification>;
  getVerificationHistory(userId: number): Promise<MedicineVerification[]>;

  analyzeSymptoms(userId: number, symptoms: string[]): Promise<SymptomSession>;
  getSymptomHistory(userId: number): Promise<SymptomSession[]>;

  getPharmacyTransfers(pharmacyId: number): Promise<(PharmacyTransfer & { fromPharmacy?: Pharmacy; toPharmacy?: Pharmacy; medicine?: Medicine })[]>;
  createTransfer(data: InsertPharmacyTransfer): Promise<PharmacyTransfer>;
  updateTransfer(id: number, status: string): Promise<PharmacyTransfer | undefined>;

  getDemandAnalytics(pharmacyId?: number): Promise<{ medicine: Medicine; totalSearches: number; totalReservations: number; trend: string }[]>;

  getUserReservations(userId: number): Promise<(Reservation & { pharmacy?: Pharmacy; medicine?: Medicine })[]>;
  cancelReservation(userId: number, id: number): Promise<Reservation | undefined>;
  getUserPharmacy(userId: number): Promise<Pharmacy | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined> {
    const [updated] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return updated;
  }

  async searchMedicines(query: string, limit = 20): Promise<Medicine[]> {
    if (!query || query.trim().length === 0) {
      return db.select().from(medicines).where(eq(medicines.isActive, true)).limit(limit);
    }
    const searchTerm = `%${query.trim()}%`;
    return db
      .select()
      .from(medicines)
      .where(
        and(
          eq(medicines.isActive, true),
          or(
            ilike(medicines.name, searchTerm),
            ilike(medicines.genericName, searchTerm),
            ilike(medicines.brand, searchTerm),
            ilike(medicines.manufacturer, searchTerm),
            ilike(medicines.category, searchTerm)
          )
        )
      )
      .limit(limit);
  }

  async getMedicine(id: number): Promise<Medicine | undefined> {
    const [med] = await db.select().from(medicines).where(eq(medicines.id, id));
    return med;
  }

  async getGenericAlternatives(medicineId: number): Promise<{
    brandMedicine: Medicine;
    alternatives: (Medicine & { savingsPercent: string })[];
  }> {
    const brandMedicine = await this.getMedicine(medicineId);
    if (!brandMedicine) throw new Error("Medicine not found");

    const mappings = await db
      .select()
      .from(genericMappings)
      .where(eq(genericMappings.brandMedicineId, medicineId));

    const alternatives: (Medicine & { savingsPercent: string })[] = [];
    for (const mapping of mappings) {
      const med = await this.getMedicine(Number(mapping.genericMedicineId));
      if (med) {
        alternatives.push({
          ...med,
          savingsPercent: mapping.priceSavingsPercent?.toString() || "0",
        });
      }
    }

    return { brandMedicine, alternatives };
  }

  async createMedicine(med: InsertMedicine): Promise<Medicine> {
    const [created] = await db.insert(medicines).values(med).returning();
    return created;
  }

  async checkInteractions(medicineIds: number[]): Promise<{
    totalChecked: number;
    interactionsFound: number;
    interactions: { medicineA: string; medicineB: string; severity: string; description: string; recommendation: string; source: string }[];
    safeCombinations: { medicineA: string; medicineB: string }[];
  }> {
    const medsMap = new Map<number, Medicine>();
    for (const id of medicineIds) {
      const med = await this.getMedicine(id);
      if (med) medsMap.set(id, med);
    }

    const validIds = medicineIds.filter((id) => medsMap.has(id));

    const foundInteractions: { medicineA: string; medicineB: string; severity: string; description: string; recommendation: string; source: string }[] = [];
    const safeCombinations: { medicineA: string; medicineB: string }[] = [];
    let totalChecked = 0;

    for (let i = 0; i < validIds.length; i++) {
      for (let j = i + 1; j < validIds.length; j++) {
        totalChecked++;
        const a = validIds[i];
        const b = validIds[j];

        const interactions = await db
          .select()
          .from(drugInteractions)
          .where(
            or(
              and(eq(drugInteractions.medicineAId, a), eq(drugInteractions.medicineBId, b)),
              and(eq(drugInteractions.medicineAId, b), eq(drugInteractions.medicineBId, a))
            )
          );

        if (interactions.length > 0) {
          for (const inter of interactions) {
            foundInteractions.push({
              medicineA: medsMap.get(a)?.name || `Medicine ${a}`,
              medicineB: medsMap.get(b)?.name || `Medicine ${b}`,
              severity: inter.severity,
              description: inter.description,
              recommendation: inter.recommendation || "",
              source: inter.source || "",
            });
          }
        } else {
          safeCombinations.push({
            medicineA: medsMap.get(a)?.name || `Medicine ${a}`,
            medicineB: medsMap.get(b)?.name || `Medicine ${b}`,
          });
        }
      }
    }

    return { totalChecked, interactionsFound: foundInteractions.length, interactions: foundInteractions, safeCombinations };
  }

  async getReminders(userId: number): Promise<Reminder[]> {
    return db.select().from(reminders).where(eq(reminders.userId, userId));
  }

  async createReminder(data: InsertReminder): Promise<Reminder> {
    const [created] = await db.insert(reminders).values(data).returning();
    return created;
  }

  async updateReminder(id: number, userId: number, data: Partial<InsertReminder>): Promise<Reminder | undefined> {
    const [updated] = await db
      .update(reminders)
      .set(data)
      .where(and(eq(reminders.id, id), eq(reminders.userId, userId)))
      .returning();
    return updated;
  }

  async deleteReminder(id: number, userId: number): Promise<boolean> {
    const result = await db
      .delete(reminders)
      .where(and(eq(reminders.id, id), eq(reminders.userId, userId)))
      .returning();
    return result.length > 0;
  }

  async getPharmacies(lat?: number, lng?: number): Promise<(Pharmacy & { distance?: number })[]> {
    const allPharmacies = await db.select().from(pharmacies).where(eq(pharmacies.isActive, true));
    if (lat && lng) {
      return allPharmacies.map(p => ({
        ...p,
        distance: this.calcDistance(lat, lng, parseFloat(p.latitude), parseFloat(p.longitude)),
      })).sort((a, b) => (a.distance || 0) - (b.distance || 0));
    }
    return allPharmacies;
  }

  async getPharmacy(id: number): Promise<Pharmacy | undefined> {
    const [p] = await db.select().from(pharmacies).where(eq(pharmacies.id, id));
    return p;
  }

  async getPharmacyInventory(pharmacyId: number): Promise<(PharmacyInventory & { medicine?: Medicine })[]> {
    const items = await db.select().from(pharmacyInventory).where(eq(pharmacyInventory.pharmacyId, pharmacyId));
    const result: (PharmacyInventory & { medicine?: Medicine })[] = [];
    for (const item of items) {
      const med = await this.getMedicine(item.medicineId);
      result.push({ ...item, medicine: med });
    }
    return result;
  }

  async searchPharmaciesWithMedicine(medicineId: number, lat?: number, lng?: number): Promise<(Pharmacy & { quantity: number; price: string; distance?: number })[]> {
    const invItems = await db.select().from(pharmacyInventory).where(
      and(eq(pharmacyInventory.medicineId, medicineId), sql`${pharmacyInventory.quantity} > 0`)
    );
    const result: (Pharmacy & { quantity: number; price: string; distance?: number })[] = [];
    for (const item of invItems) {
      const pharm = await this.getPharmacy(item.pharmacyId);
      if (pharm && pharm.isActive) {
        const distance = lat && lng ? this.calcDistance(lat, lng, parseFloat(pharm.latitude), parseFloat(pharm.longitude)) : undefined;
        result.push({ ...pharm, quantity: item.quantity, price: item.price || "0", distance });
      }
    }
    if (lat && lng) {
      result.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    }
    return result;
  }

  async updateInventory(pharmacyId: number, medicineId: number, data: Partial<InsertPharmacyInventory>): Promise<PharmacyInventory | undefined> {
    const [updated] = await db.update(pharmacyInventory)
      .set({ ...data, lastUpdated: new Date() })
      .where(and(eq(pharmacyInventory.pharmacyId, pharmacyId), eq(pharmacyInventory.medicineId, medicineId)))
      .returning();
    return updated;
  }

  async createInventoryItem(data: InsertPharmacyInventory): Promise<PharmacyInventory> {
    const [created] = await db.insert(pharmacyInventory).values(data).returning();
    return created;
  }

  async createReservation(data: InsertReservation): Promise<Reservation> {
    const code = "RES-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    const [created] = await db.insert(reservations).values({ ...data, confirmationCode: code }).returning();
    return created;
  }

  async getReservations(userId: number): Promise<Reservation[]> {
    return db.select().from(reservations).where(eq(reservations.userId, userId)).orderBy(desc(reservations.createdAt));
  }

  async createPrescription(data: InsertPrescription): Promise<Prescription> {
    const [created] = await db.insert(prescriptions).values(data).returning();
    return created;
  }

  async getPrescriptions(userId: number): Promise<Prescription[]> {
    return db.select().from(prescriptions).where(eq(prescriptions.userId, userId)).orderBy(desc(prescriptions.createdAt));
  }

  async verifyMedicine(data: InsertMedicineVerification): Promise<MedicineVerification> {
    const knownCodes: Record<string, { isAuthentic: boolean; medicineInfo: any; verificationResult: any }> = {
      "MED-2024-001": {
        isAuthentic: true,
        medicineInfo: { name: "Crocin Advance 500mg", manufacturer: "GSK Consumer Healthcare", batchNumber: "B2024-A1001", manufacturingDate: "2024-03-15", expiryDate: "2026-03-15", packSize: "15 tablets" },
        verificationResult: { confidence: "high", verifiedWith: "Manufacturer Database", reason: "Batch number matches manufacturer records" },
      },
      "MED-2024-002": {
        isAuthentic: true,
        medicineInfo: { name: "Amoxicillin 500mg", manufacturer: "GSK", batchNumber: "B2024-A2002", manufacturingDate: "2024-06-01", expiryDate: "2026-06-01", packSize: "10 capsules" },
        verificationResult: { confidence: "high", verifiedWith: "CDSCO Registry", reason: "Product registered and verified" },
      },
      "FAKE-001": {
        isAuthentic: false,
        medicineInfo: { name: "Unknown Product", manufacturer: "Unregistered", batchNumber: "X-INVALID", packSize: "Unknown" },
        verificationResult: { confidence: "high", verifiedWith: "CDSCO & Manufacturer Database", reason: "Batch number not found in any registered database", actionRequired: "Do not consume. Report to nearest drug inspector." },
      },
    };

    const known = knownCodes[data.code];
    const verificationData: InsertMedicineVerification = {
      ...data,
      isAuthentic: known?.isAuthentic ?? null,
      medicineInfo: known?.medicineInfo ?? null,
      verificationResult: known?.verificationResult ?? {
        confidence: "low",
        reason: "Code not found in verification database. This may be a new or unregistered product.",
        actionRequired: "Verify with the manufacturer directly or consult your pharmacist.",
      },
    };

    const [created] = await db.insert(medicineVerifications).values(verificationData).returning();
    return created;
  }

  async getVerificationHistory(userId: number): Promise<MedicineVerification[]> {
    return db.select().from(medicineVerifications).where(eq(medicineVerifications.userId, userId)).orderBy(desc(medicineVerifications.createdAt));
  }

  async analyzeSymptoms(userId: number, symptoms: string[]): Promise<SymptomSession> {
    // Use the chatbot engine for analysis (65+ conditions)
    const result = matchSymptoms(symptoms);

    const sessionData: InsertSymptomSession = {
      userId,
      inputSymptoms: symptoms,
      riskLevel: result.riskLevel,
      predictions: result.predictions,
    };

    const [created] = await db.insert(symptomSessions).values(sessionData).returning();
    return created;
  }

  async getSymptomHistory(userId: number): Promise<SymptomSession[]> {
    return db.select().from(symptomSessions).where(eq(symptomSessions.userId, userId)).orderBy(desc(symptomSessions.createdAt));
  }

  async getPharmacyTransfers(pharmacyId: number): Promise<(PharmacyTransfer & { fromPharmacy?: Pharmacy; toPharmacy?: Pharmacy; medicine?: Medicine })[]> {
    const transfers = await db.select().from(pharmacyTransfers).where(
      or(eq(pharmacyTransfers.fromPharmacyId, pharmacyId), eq(pharmacyTransfers.toPharmacyId, pharmacyId))
    ).orderBy(desc(pharmacyTransfers.createdAt));

    const result: (PharmacyTransfer & { fromPharmacy?: Pharmacy; toPharmacy?: Pharmacy; medicine?: Medicine })[] = [];
    for (const t of transfers) {
      const fromP = await this.getPharmacy(t.fromPharmacyId);
      const toP = await this.getPharmacy(t.toPharmacyId);
      const med = await this.getMedicine(t.medicineId);
      result.push({ ...t, fromPharmacy: fromP, toPharmacy: toP, medicine: med });
    }
    return result;
  }

  async createTransfer(data: InsertPharmacyTransfer): Promise<PharmacyTransfer> {
    const [created] = await db.insert(pharmacyTransfers).values(data).returning();
    return created;
  }

  async updateTransfer(id: number, status: string): Promise<PharmacyTransfer | undefined> {
    const [updated] = await db.update(pharmacyTransfers).set({ status }).where(eq(pharmacyTransfers.id, id)).returning();
    return updated;
  }

  async getDemandAnalytics(pharmacyId?: number): Promise<{ medicine: Medicine; totalSearches: number; totalReservations: number; trend: string }[]> {
    const allDemand = pharmacyId
      ? await db.select().from(demandTracking).where(eq(demandTracking.pharmacyId, pharmacyId))
      : await db.select().from(demandTracking);

    const grouped = new Map<number, { searches: number; reservations: number; periods: Map<string, number> }>();
    for (const d of allDemand) {
      const existing = grouped.get(d.medicineId) || { searches: 0, reservations: 0, periods: new Map() };
      existing.searches += d.searchCount;
      existing.reservations += d.reservationCount;
      existing.periods.set(d.period, (existing.periods.get(d.period) || 0) + d.searchCount);
      grouped.set(d.medicineId, existing);
    }

    const result: { medicine: Medicine; totalSearches: number; totalReservations: number; trend: string }[] = [];
    for (const [medId, data] of grouped) {
      const med = await this.getMedicine(medId);
      if (!med) continue;

      const periods = Array.from(data.periods.entries()).sort((a, b) => a[0].localeCompare(b[0]));
      let trend = "stable";
      if (periods.length >= 2) {
        const last = periods[periods.length - 1][1];
        const prev = periods[periods.length - 2][1];
        if (last > prev * 1.1) trend = "rising";
        else if (last < prev * 0.9) trend = "falling";
      }

      result.push({ medicine: med, totalSearches: data.searches, totalReservations: data.reservations, trend });
    }

    return result.sort((a, b) => b.totalSearches - a.totalSearches);
  }

  private calcDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  async getUserReservations(userId: number): Promise<(Reservation & { pharmacy?: Pharmacy; medicine?: Medicine; expiresAt?: string | null })[]> {
    const userReservations = await db.select().from(reservations)
      .where(eq(reservations.userId, userId))
      .orderBy(desc(reservations.createdAt));

    const result: (Reservation & { pharmacy?: Pharmacy; medicine?: Medicine; expiresAt?: string | null })[] = [];
    for (const r of userReservations) {
      const pharmacy = await this.getPharmacy(r.pharmacyId);
      const medicine = await this.getMedicine(r.medicineId);
      result.push({ ...r, pharmacy: pharmacy || undefined, medicine: medicine || undefined, expiresAt: r.pickupBy || null });
    }
    return result;
  }

  async cancelReservation(userId: number, id: number): Promise<Reservation | undefined> {
    const [existing] = await db.select().from(reservations)
      .where(and(eq(reservations.id, id), eq(reservations.userId, userId)));
    if (!existing) return undefined;

    const [updated] = await db.update(reservations)
      .set({ status: "cancelled" })
      .where(and(eq(reservations.id, id), eq(reservations.userId, userId)))
      .returning();
    return updated;
  }

  async getUserPharmacy(userId: number): Promise<Pharmacy | undefined> {
    const [pharmacy] = await db.select().from(pharmacies)
      .where(eq(pharmacies.ownerUserId, userId));
    return pharmacy;
  }
}

export const storage = new DatabaseStorage();
