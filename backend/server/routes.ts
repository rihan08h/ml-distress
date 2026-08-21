import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import { storage } from "./storage";
import { registerSchema, loginSchema } from "@shared/schema";
import { createHash, randomBytes } from "crypto";
import { processChatMessage, EXPANDED_SYMPTOM_LIST } from "./chatbot";

function hashPassword(password: string, salt: string): string {
  return createHash("sha256").update(password + salt).digest("hex");
}

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const MemoryStore = (await import("memorystore")).default(session);

  app.use(
    session({
      secret: process.env.SESSION_SECRET || "medisafe-dev-secret-key",
      resave: false,
      saveUninitialized: false,
      store: new MemoryStore({ checkPeriod: 86400000 }),
      cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: "lax",
        secure: false,
      },
    })
  );

  function requireAuth(req: Request, res: Response, next: Function) {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  }

  app.post("/api/auth/register", async (req, res) => {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0].message });
      }

      const existing = await storage.getUserByEmail(parsed.data.email);
      if (existing) {
        return res.status(409).json({ message: "Email already exists" });
      }

      const salt = randomBytes(16).toString("hex");
      const hashedPassword = hashPassword(parsed.data.password, salt);

      const user = await storage.createUser({
        email: parsed.data.email,
        password: `${salt}:${hashedPassword}`,
        fullName: parsed.data.fullName,
        phone: parsed.data.phone || null,
        role: "patient",
        subscriptionTier: "free",
      });

      req.session.userId = user.id;
      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error: any) {
      console.error("Register error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0].message });
      }

      const user = await storage.getUserByEmail(parsed.data.email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const [salt, storedHash] = user.password.split(":");
      const inputHash = hashPassword(parsed.data.password, salt);
      if (inputHash !== storedHash) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      req.session.userId = user.id;
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) return res.status(500).json({ message: "Logout failed" });
      res.json({ message: "Logged out" });
    });
  });

  app.get("/api/medicines", async (req, res) => {
    try {
      const query = (req.query.q as string) || "";
      const limit = parseInt(req.query.limit as string) || 20;
      const results = await storage.searchMedicines(query, limit);
      res.json(results);
    } catch (error: any) {
      console.error("Search error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/medicines/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid medicine ID" });
      const medicine = await storage.getMedicine(id);
      if (!medicine) return res.status(404).json({ message: "Medicine not found" });
      res.json(medicine);
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/medicines/:id/generics", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid medicine ID" });
      const medicine = await storage.getMedicine(id);
      if (!medicine) return res.status(404).json({ message: "Medicine not found" });
      const result = await storage.getGenericAlternatives(id);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/safety/interactions", requireAuth, async (req, res) => {
    try {
      const { medicineIds } = req.body;
      if (!medicineIds || !Array.isArray(medicineIds) || medicineIds.length < 2) {
        return res.status(400).json({ message: "At least 2 medicine IDs required" });
      }
      const validIds = medicineIds.filter((id: any) => typeof id === "number" && !isNaN(id) && id > 0);
      if (validIds.length < 2) {
        return res.status(400).json({ message: "At least 2 valid medicine IDs required" });
      }
      const result = await storage.checkInteractions(validIds);
      res.json(result);
    } catch (error: any) {
      console.error("Interaction check error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/reminders", requireAuth, async (req, res) => {
    try {
      const result = await storage.getReminders(req.session.userId!);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/reminders", requireAuth, async (req, res) => {
    try {
      const { medicineName, startDate, frequency } = req.body;
      if (!medicineName || typeof medicineName !== "string" || medicineName.trim().length === 0) {
        return res.status(400).json({ message: "Medicine name is required" });
      }
      if (!startDate || typeof startDate !== "string") {
        return res.status(400).json({ message: "Start date is required" });
      }
      const reminder = await storage.createReminder({
        userId: req.session.userId!,
        medicineName: medicineName.trim(),
        medicineId: req.body.medicineId || null,
        dosage: req.body.dosage || null,
        frequency: frequency || "daily",
        times: Array.isArray(req.body.times) ? req.body.times : [],
        startDate,
        endDate: req.body.endDate || null,
        notes: req.body.notes || null,
        isActive: true,
      });
      res.status(201).json(reminder);
    } catch (error: any) {
      console.error("Create reminder error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/reminders/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid reminder ID" });
      const updated = await storage.updateReminder(id, req.session.userId!, req.body);
      if (!updated) return res.status(404).json({ message: "Reminder not found" });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/reminders/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid reminder ID" });
      const deleted = await storage.deleteReminder(id, req.session.userId!);
      if (!deleted) return res.status(404).json({ message: "Reminder not found" });
      res.json({ message: "Deleted" });
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Geocode a location name to coordinates using OpenStreetMap Nominatim
  app.get("/api/geocode", async (req, res) => {
    try {
      const q = req.query.q as string;
      if (!q || q.length < 2) return res.status(400).json({ message: "Search query required" });

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&countrycodes=in`,
        { headers: { "User-Agent": "MediSafe/1.0" } }
      );
      if (!response.ok) return res.status(502).json({ message: "Geocoding service unavailable" });

      const data = await response.json() as any[];
      const results = data.map((item: any) => ({
        name: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
      }));
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ message: "Geocoding failed" });
    }
  });

  // Nearby real-world pharmacies from OpenStreetMap
  app.get("/api/pharmacies/nearby", async (req, res) => {
    try {
      const lat = parseFloat(req.query.lat as string);
      const lng = parseFloat(req.query.lng as string);
      const radius = parseInt(req.query.radius as string) || 3000;
      if (isNaN(lat) || isNaN(lng)) return res.status(400).json({ message: "lat and lng are required" });

      const query = `[out:json][timeout:10];node["amenity"="pharmacy"](around:${radius},${lat},${lng});out body;`;
      const response = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(query)}`,
      });

      if (!response.ok) {
        return res.status(502).json({ message: "Could not fetch nearby pharmacies" });
      }

      const data: any = await response.json();
      const R = 6371;
      const toRad = (deg: number) => deg * Math.PI / 180;

      const pharmacies = (data.elements || []).map((el: any) => {
        const dLat = toRad(el.lat - lat);
        const dLon = toRad(el.lon - lng);
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat)) * Math.cos(toRad(el.lat)) * Math.sin(dLon / 2) ** 2;
        const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return {
          id: el.id,
          name: el.tags?.name || "Pharmacy",
          address: [el.tags?.["addr:street"], el.tags?.["addr:housenumber"], el.tags?.["addr:city"], el.tags?.["addr:postcode"]].filter(Boolean).join(", ") || el.tags?.["addr:full"] || "",
          phone: el.tags?.phone || el.tags?.["contact:phone"] || null,
          latitude: String(el.lat),
          longitude: String(el.lon),
          openingHours: el.tags?.opening_hours || null,
          website: el.tags?.website || el.tags?.["contact:website"] || null,
          brand: el.tags?.brand || null,
          distance: Math.round(distance * 100) / 100,
        };
      }).sort((a: any, b: any) => a.distance - b.distance);

      res.json(pharmacies);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch nearby pharmacies" });
    }
  });

  // Pharmacy routes
  app.get("/api/pharmacies", async (req, res) => {
    try {
      const lat = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
      const lng = req.query.lng ? parseFloat(req.query.lng as string) : undefined;
      const result = await storage.getPharmacies(lat, lng);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/pharmacies/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid pharmacy ID" });
      const pharmacy = await storage.getPharmacy(id);
      if (!pharmacy) return res.status(404).json({ message: "Pharmacy not found" });
      res.json(pharmacy);
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/pharmacies/:id/inventory", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid pharmacy ID" });
      const inventory = await storage.getPharmacyInventory(id);
      res.json(inventory);
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/pharmacies/medicine/:medicineId", async (req, res) => {
    try {
      const medicineId = parseInt(req.params.medicineId);
      if (isNaN(medicineId)) return res.status(400).json({ message: "Invalid medicine ID" });
      const lat = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
      const lng = req.query.lng ? parseFloat(req.query.lng as string) : undefined;
      const result = await storage.searchPharmaciesWithMedicine(medicineId, lat, lng);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/reservations", requireAuth, async (req, res) => {
    try {
      const { pharmacyId, medicineId, quantity } = req.body;
      if (!pharmacyId || !medicineId || !quantity) {
        return res.status(400).json({ message: "pharmacyId, medicineId, and quantity required" });
      }
      const reservation = await storage.createReservation({
        userId: req.session.userId!,
        pharmacyId,
        medicineId,
        quantity,
        status: "confirmed",
        pickupBy: req.body.pickupBy || null,
        confirmationCode: null,
      });
      res.status(201).json(reservation);
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/reservations", requireAuth, async (req, res) => {
    try {
      const result = await storage.getReservations(req.session.userId!);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Prescription scanner (simulated OCR)
  app.post("/api/prescriptions/parse", requireAuth, async (req, res) => {
    try {
      const { rawText } = req.body;
      if (!rawText || typeof rawText !== "string" || rawText.trim().length === 0) {
        return res.status(400).json({ message: "Prescription text is required" });
      }

      const allMeds = await storage.searchMedicines("", 100);
      const lines = rawText.split(/[\n,;]+/).map(l => l.trim()).filter(l => l.length > 0);
      const detected: {
        extractedName: string;
        matchedMedicineId?: number;
        matchedName?: string;
        dosage?: string;
        duration?: string;
        instructions?: string;
        confidence: number;
      }[] = [];

      for (const line of lines) {
        const lower = line.toLowerCase();
        let bestMatch: { med: typeof allMeds[0]; score: number } | null = null;

        for (const med of allMeds) {
          const medName = med.name.toLowerCase();
          const genericName = (med.genericName || "").toLowerCase();
          const brand = (med.brand || "").toLowerCase();

          let score = 0;
          if (lower.includes(medName) || medName.includes(lower.split(/\s+/)[0])) score = 0.95;
          else if (lower.includes(genericName) || genericName.includes(lower.split(/\s+/)[0])) score = 0.85;
          else if (brand && (lower.includes(brand) || brand.includes(lower.split(/\s+/)[0]))) score = 0.80;
          else {
            const words = lower.split(/\s+/);
            for (const word of words) {
              if (word.length >= 4 && (medName.includes(word) || genericName.includes(word))) {
                score = Math.max(score, 0.60);
              }
            }
          }

          if (score > 0 && (!bestMatch || score > bestMatch.score)) {
            bestMatch = { med, score };
          }
        }

        const dosageMatch = line.match(/(\d+\s*(?:mg|ml|mcg|g)\s*(?:x\s*\d+)?)/i);
        const durationMatch = line.match(/(?:for\s+)?(\d+\s*(?:days?|weeks?|months?))/i);
        const instructionMatch = line.match(/(before|after|with)\s+(food|meals?|breakfast|dinner|lunch)/i);

        detected.push({
          extractedName: line,
          matchedMedicineId: bestMatch?.med.id,
          matchedName: bestMatch?.med.name,
          dosage: dosageMatch?.[1],
          duration: durationMatch?.[1],
          instructions: instructionMatch?.[0],
          confidence: bestMatch?.score || 0.2,
        });
      }

      const avgConfidence = detected.length > 0
        ? detected.reduce((sum, d) => sum + d.confidence, 0) / detected.length
        : 0;

      const prescription = await storage.createPrescription({
        userId: req.session.userId!,
        rawText,
        detectedMedicines: detected,
        ocrConfidence: avgConfidence.toFixed(2),
      });

      res.status(201).json(prescription);
    } catch (error: any) {
      console.error("Prescription parse error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/prescriptions", requireAuth, async (req, res) => {
    try {
      const result = await storage.getPrescriptions(req.session.userId!);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Medicine verification
  app.post("/api/verify", requireAuth, async (req, res) => {
    try {
      const { code, codeType } = req.body;
      if (!code || typeof code !== "string" || code.trim().length === 0) {
        return res.status(400).json({ message: "Verification code is required" });
      }
      const result = await storage.verifyMedicine({
        userId: req.session.userId!,
        code: code.trim(),
        codeType: codeType || "barcode",
        isAuthentic: null,
        medicineInfo: null,
        verificationResult: null,
      });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/verify/history", requireAuth, async (req, res) => {
    try {
      const result = await storage.getVerificationHistory(req.session.userId!);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Emergency medicine finder
  app.get("/api/emergency/search", requireAuth, async (req, res) => {
    try {
      const medicineId = parseInt(req.query.medicineId as string);
      if (isNaN(medicineId)) return res.status(400).json({ message: "Valid medicineId required" });
      const lat = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
      const lng = req.query.lng ? parseFloat(req.query.lng as string) : undefined;
      const result = await storage.searchPharmaciesWithMedicine(medicineId, lat, lng);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Symptom checker (premium)
  app.post("/api/symptoms/analyze", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(401).json({ message: "User not found" });

      if (user.subscriptionTier !== "premium") {
        return res.status(403).json({ message: "Premium subscription required", requiresUpgrade: true });
      }

      const { symptoms } = req.body;
      if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
        return res.status(400).json({ message: "At least one symptom is required" });
      }

      const result = await storage.analyzeSymptoms(req.session.userId!, symptoms);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/symptoms/history", requireAuth, async (req, res) => {
    try {
      const result = await storage.getSymptomHistory(req.session.userId!);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Chatbot conversation endpoint (available to all authenticated users)
  app.post("/api/symptoms/chat", requireAuth, async (req, res) => {
    try {
      const { message } = req.body;
      if (!message || typeof message !== "string" || message.trim().length === 0) {
        return res.status(400).json({ message: "Message is required" });
      }
      if (message.length > 1000) {
        return res.status(400).json({ message: "Message too long" });
      }
      const response = processChatMessage(req.session.userId!, message.trim());
      res.json(response);
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get expanded symptom list from chatbot engine
  app.get("/api/symptoms/list", async (_req, res) => {
    res.json(EXPANDED_SYMPTOM_LIST);
  });

  // User reservations
  app.get("/api/reservations", requireAuth, async (req, res) => {
    try {
      const userReservations = await storage.getUserReservations(req.session.userId!);
      res.json(userReservations);
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/reservations/:id/cancel", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid reservation ID" });
      const updated = await storage.cancelReservation(req.session.userId!, id);
      if (!updated) return res.status(404).json({ message: "Reservation not found" });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get user's own pharmacy (for portal)
  app.get("/api/portal/my-pharmacy", requireAuth, async (req, res) => {
    try {
      const pharmacy = await storage.getUserPharmacy(req.session.userId!);
      res.json(pharmacy || null);
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Subscription upgrade
  app.post("/api/subscription/upgrade", requireAuth, async (req, res) => {
    try {
      const { tier } = req.body;
      if (!tier || !["premium"].includes(tier)) {
        return res.status(400).json({ message: "Valid tier required" });
      }
      const updated = await storage.updateUser(req.session.userId!, { subscriptionTier: tier });
      if (!updated) return res.status(404).json({ message: "User not found" });
      const { password, ...userWithoutPassword } = updated;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Pharmacy portal routes
  app.get("/api/portal/inventory/:pharmacyId", requireAuth, async (req, res) => {
    try {
      const pharmacyId = parseInt(req.params.pharmacyId as string);
      if (isNaN(pharmacyId)) return res.status(400).json({ message: "Invalid pharmacy ID" });
      const inventory = await storage.getPharmacyInventory(pharmacyId);
      res.json(inventory);
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/portal/inventory/:pharmacyId/:medicineId", requireAuth, async (req, res) => {
    try {
      const pharmacyId = parseInt(req.params.pharmacyId as string);
      const medicineId = parseInt(req.params.medicineId as string);
      if (isNaN(pharmacyId) || isNaN(medicineId)) return res.status(400).json({ message: "Invalid IDs" });
      const updated = await storage.updateInventory(pharmacyId, medicineId, req.body);
      if (!updated) return res.status(404).json({ message: "Inventory item not found" });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/portal/inventory", requireAuth, async (req, res) => {
    try {
      const { pharmacyId, medicineId, quantity, price, expiryDate } = req.body;
      if (!pharmacyId || !medicineId) return res.status(400).json({ message: "pharmacyId and medicineId required" });
      const item = await storage.createInventoryItem({
        pharmacyId,
        medicineId,
        quantity: quantity || 0,
        price: price || null,
        expiryDate: expiryDate || null,
      });
      res.status(201).json(item);
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/portal/transfers/:pharmacyId", requireAuth, async (req, res) => {
    try {
      const pharmacyId = parseInt(req.params.pharmacyId as string);
      if (isNaN(pharmacyId)) return res.status(400).json({ message: "Invalid pharmacy ID" });
      const transfers = await storage.getPharmacyTransfers(pharmacyId);
      res.json(transfers);
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/portal/transfers", requireAuth, async (req, res) => {
    try {
      const { fromPharmacyId, toPharmacyId, medicineId, quantity, reason } = req.body;
      if (!fromPharmacyId || !toPharmacyId || !medicineId || !quantity) {
        return res.status(400).json({ message: "All transfer fields required" });
      }
      const transfer = await storage.createTransfer({
        fromPharmacyId,
        toPharmacyId,
        medicineId,
        quantity,
        status: "pending",
        reason: reason || null,
      });
      res.status(201).json(transfer);
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/portal/transfers/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid transfer ID" });
      const { status } = req.body;
      if (!status) return res.status(400).json({ message: "Status required" });
      const updated = await storage.updateTransfer(id, status);
      if (!updated) return res.status(404).json({ message: "Transfer not found" });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/portal/analytics", requireAuth, async (req, res) => {
    try {
      const pharmacyId = req.query.pharmacyId ? parseInt(req.query.pharmacyId as string) : undefined;
      const analytics = await storage.getDemandAnalytics(pharmacyId);
      res.json(analytics);
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/portal/pharmacies", async (req, res) => {
    try {
      const result = await storage.getPharmacies();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  return httpServer;
}
