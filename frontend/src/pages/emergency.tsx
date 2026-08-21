import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Medicine, Pharmacy } from "@shared/schema";
import {
  Search,
  Phone,
  MapPin,
  Clock,
  AlertTriangle,
  Package,
  Loader2,
  Ambulance,
  ShieldAlert,
  HeartPulse,
  Locate,
  Navigation,
} from "lucide-react";

type PharmacyResult = Pharmacy & {
  quantity: number;
  price: string | null;
  distance?: number;
};

const HELPLINES = [
  { label: "Ambulance", number: "112", icon: Ambulance },
  { label: "Poison Control", number: "1800-11-6117", icon: ShieldAlert },
  { label: "Medical Helpline", number: "108", icon: HeartPulse },
];

const RADIUS_STEPS = ["5km", "10km", "25km"];

export default function EmergencyPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [radiusIndex, setRadiusIndex] = useState(0);
  const [searchingRadius, setSearchingRadius] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationName, setLocationName] = useState("");
  const [locationSearch, setLocationSearch] = useState("");
  const [debouncedLocationSearch, setDebouncedLocationSearch] = useState("");
  const [showLocationResults, setShowLocationResults] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const locationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedLocationSearch(locationSearch), 400);
    return () => clearTimeout(timer);
  }, [locationSearch]);

  useEffect(() => {
    function handleClickOutsideLocation(e: MouseEvent) {
      if (locationRef.current && !locationRef.current.contains(e.target as Node)) {
        setShowLocationResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutsideLocation);
    return () => document.removeEventListener("mousedown", handleClickOutsideLocation);
  }, []);

  interface GeoResult { name: string; lat: number; lng: number; }

  const { data: geoResults } = useQuery<GeoResult[]>({
    queryKey: ["/api/geocode", debouncedLocationSearch],
    queryFn: async () => {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(debouncedLocationSearch)}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: debouncedLocationSearch.length >= 2 && !locationName,
  });

  function selectEmergencyLocation(result: GeoResult) {
    setUserLocation({ lat: result.lat, lng: result.lng });
    const shortName = result.name.split(",").slice(0, 2).join(",");
    setLocationName(shortName);
    setLocationSearch(shortName);
    setShowLocationResults(false);
  }

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const locParams = userLocation ? `&lat=${userLocation.lat}&lng=${userLocation.lng}` : "";

  const { data: suggestions, isLoading: suggestionsLoading } = useQuery<Medicine[]>({
    queryKey: ["/api/medicines?q=" + debouncedSearch],
    enabled: debouncedSearch.length >= 2 && !selectedMedicine,
  });

  const {
    data: results,
    isLoading: resultsLoading,
    isFetched: resultsFetched,
  } = useQuery<PharmacyResult[]>({
    queryKey: ["/api/emergency/search", selectedMedicine?.id, userLocation?.lat, userLocation?.lng],
    queryFn: async () => {
      const res = await fetch(`/api/emergency/search?medicineId=${selectedMedicine!.id}${locParams}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!selectedMedicine,
  });

  useEffect(() => {
    if (!selectedMedicine) return;
    setSearchingRadius(true);
    setRadiusIndex(0);
    const t1 = setTimeout(() => setRadiusIndex(1), 1200);
    const t2 = setTimeout(() => setRadiusIndex(2), 2400);
    const t3 = setTimeout(() => setSearchingRadius(false), 3600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [selectedMedicine]);

  const reserveMutation = useMutation({
    mutationFn: async (data: { pharmacyId: number; medicineId: number }) => {
      await apiRequest("POST", "/api/reservations", {
        ...data,
        quantity: 1,
        userId: 0,
        status: "confirmed",
      });
    },
    onSuccess: () => {
      toast({ title: "Reserved!", description: "Medicine has been reserved for pickup." });
      if (selectedMedicine) {
        queryClient.invalidateQueries({
          queryKey: ["/api/emergency/search", selectedMedicine.id],
        });
      }
    },
    onError: (err: Error) => {
      toast({ title: "Reservation failed", description: err.message, variant: "destructive" });
    },
  });

  function handleSelectMedicine(medicine: Medicine) {
    setSelectedMedicine(medicine);
    setSearchTerm(medicine.name);
    setShowSuggestions(false);
  }

  function handleClearSearch() {
    setSearchTerm("");
    setSelectedMedicine(null);
    setDebouncedSearch("");
  }

  const sortedResults = results
    ? [...results].sort((a, b) => {
        if (a.isOpen && !b.isOpen) return -1;
        if (!a.isOpen && b.isOpen) return 1;
        return b.quantity - a.quantity;
      })
    : [];

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-md bg-red-500/15 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
        </div>
        <div>
          <h1
            className="text-2xl font-bold tracking-tight text-red-700 dark:text-red-400"
            data-testid="text-emergency-title"
          >
            Emergency Medicine Finder
          </h1>
          <p className="text-sm text-muted-foreground">Find medicines at nearby pharmacies urgently</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" data-testid="section-helplines">
        {HELPLINES.map((h) => (
          <a key={h.number} href={`tel:${h.number}`} className="block">
            <Card className="hover-elevate border-red-200 dark:border-red-900/40">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-md bg-red-500/10 flex items-center justify-center flex-shrink-0">
                  <h.icon className="w-4 h-4 text-red-600 dark:text-red-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{h.label}</p>
                  <p
                    className="text-base font-bold text-red-700 dark:text-red-400"
                    data-testid={`text-helpline-${h.number}`}
                  >
                    {h.number}
                  </p>
                </div>
              </CardContent>
            </Card>
          </a>
        ))}
      </div>

      <Card>
        <CardContent className="p-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">Your location (for distance calculation)</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1" ref={locationRef}>
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                data-testid="input-emergency-location"
                placeholder="Type your city or area..."
                className="pl-9 h-9 text-sm"
                value={locationSearch}
                onChange={(e) => {
                  setLocationSearch(e.target.value);
                  setLocationName("");
                  setShowLocationResults(true);
                }}
                onFocus={() => setShowLocationResults(true)}
              />
              {showLocationResults && debouncedLocationSearch.length >= 2 && geoResults && geoResults.length > 0 && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-md max-h-48 overflow-y-auto">
                  {geoResults.map((result, i) => (
                    <button
                      key={i}
                      data-testid={`button-emergency-location-${i}`}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center gap-2"
                      onClick={() => selectEmergencyLocation(result)}
                    >
                      <MapPin className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                      <span className="truncate">{result.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button variant="outline" size="sm" className="h-9" onClick={() => {
              if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                  (pos) => {
                    setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                    setLocationName("GPS Location");
                    setLocationSearch("GPS Location");
                  },
                  () => toast({ title: "GPS unavailable", description: "Type your location instead.", variant: "destructive" })
                );
              }
            }}>
              <Locate className="w-3.5 h-3.5 mr-1" /> GPS
            </Button>
          </div>
          {locationName && (
            <div className="mt-2">
              <Badge variant="secondary" className="gap-1 text-xs">
                <Navigation className="w-3 h-3" /> {locationName}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-amber-300 dark:border-amber-800/50">
        <CardContent className="p-4 sm:p-6">
          <div className="relative" ref={suggestionsRef}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-600 dark:text-amber-400" />
            <Input
              data-testid="input-medicine-search"
              placeholder="Search for a medicine urgently..."
              className="pl-10 pr-20 text-lg h-12 border-amber-300 dark:border-amber-700 focus-visible:ring-amber-400"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setSelectedMedicine(null);
                setShowSuggestions(true);
              }}
              onFocus={() => {
                if (debouncedSearch.length >= 2 && !selectedMedicine) setShowSuggestions(true);
              }}
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2"
                onClick={handleClearSearch}
                data-testid="button-clear-search"
              >
                Clear
              </Button>
            )}

            {showSuggestions && debouncedSearch.length >= 2 && !selectedMedicine && (
              <Card className="absolute z-50 top-full left-0 right-0 mt-1 max-h-64 overflow-y-auto">
                <CardContent className="p-1">
                  {suggestionsLoading ? (
                    <div className="space-y-2 p-2">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-10 w-full" />
                      ))}
                    </div>
                  ) : !suggestions?.length ? (
                    <p className="p-3 text-sm text-muted-foreground" data-testid="text-no-suggestions">
                      No medicines found
                    </p>
                  ) : (
                    suggestions.map((med) => (
                      <button
                        key={med.id}
                        className="w-full text-left p-3 rounded-md hover-elevate cursor-pointer flex items-center gap-2"
                        onClick={() => handleSelectMedicine(med)}
                        data-testid={`suggestion-medicine-${med.id}`}
                      >
                        <Package className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{med.name}</p>
                          {med.genericName && (
                            <p className="text-xs text-muted-foreground truncate">{med.genericName}</p>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedMedicine && (searchingRadius || resultsLoading) && (
        <Card className="border-amber-300/50 dark:border-amber-800/30">
          <CardContent className="p-6 flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
            <div className="flex items-center gap-2" data-testid="text-radius-indicator">
              {RADIUS_STEPS.map((step, i) => (
                <Badge
                  key={step}
                  variant={i <= radiusIndex ? "default" : "secondary"}
                  className={i <= radiusIndex ? "bg-amber-500 text-white no-default-hover-elevate no-default-active-elevate" : ""}
                >
                  {step}
                </Badge>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Searching within {RADIUS_STEPS[radiusIndex]}...
            </p>
          </CardContent>
        </Card>
      )}

      {selectedMedicine && !searchingRadius && !resultsLoading && resultsFetched && (
        <>
          {sortedResults.length === 0 ? (
            <Card className="border-red-300 dark:border-red-900/50">
              <CardContent className="p-8 text-center space-y-3" data-testid="section-empty-state">
                <AlertTriangle className="w-10 h-10 text-red-500 mx-auto" />
                <p className="font-semibold text-red-700 dark:text-red-400">
                  No pharmacies found with this medicine.
                </p>
                <p className="text-sm text-muted-foreground">
                  Call the emergency helpline for assistance.
                </p>
                <a href="tel:108">
                  <Button variant="destructive" className="mt-2" data-testid="button-call-helpline">
                    <Phone className="w-4 h-4 mr-2" />
                    Call Medical Helpline (108)
                  </Button>
                </a>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground" data-testid="text-result-count">
                {sortedResults.length} pharmacy{sortedResults.length !== 1 ? "ies" : ""} found with{" "}
                <span className="font-medium text-foreground">{selectedMedicine.name}</span>
              </p>
              {sortedResults.map((result) => {
                const isOpen = result.isOpen;
                return (
                  <Card
                    key={result.id}
                    className={
                      isOpen
                        ? "border-emerald-300 dark:border-emerald-800/50"
                        : "opacity-60 border-muted"
                    }
                    data-testid={`card-pharmacy-${result.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold" data-testid={`text-pharmacy-name-${result.id}`}>
                              {result.name}
                            </p>
                            <Badge
                              variant={isOpen ? "default" : "secondary"}
                              className={
                                isOpen
                                  ? "bg-emerald-500 text-white no-default-hover-elevate no-default-active-elevate"
                                  : ""
                              }
                              data-testid={`badge-status-${result.id}`}
                            >
                              {isOpen ? "Open" : "Closed"}
                            </Badge>
                          </div>

                          <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
                            <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                            <span data-testid={`text-pharmacy-address-${result.id}`}>
                              {result.address}
                            </span>
                          </div>

                          {result.phone && (
                            <a
                              href={`tel:${result.phone}`}
                              className="inline-flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400 hover:underline"
                              data-testid={`link-phone-${result.id}`}
                            >
                              <Phone className="w-3.5 h-3.5" />
                              {result.phone}
                            </a>
                          )}

                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {result.distance ? result.distance.toFixed(1) : "—"} km away
                            </span>
                            <span
                              className="text-xs font-medium flex items-center gap-1"
                              data-testid={`text-quantity-${result.id}`}
                            >
                              <Package className="w-3 h-3" />
                              {result.quantity} in stock
                            </span>
                          </div>
                        </div>

                        <div className="flex-shrink-0">
                          <Button
                            variant="destructive"
                            disabled={!isOpen || reserveMutation.isPending}
                            onClick={() =>
                              reserveMutation.mutate({
                                pharmacyId: result.id,
                                medicineId: selectedMedicine.id,
                              })
                            }
                            data-testid={`button-reserve-${result.id}`}
                          >
                            {reserveMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                              <Clock className="w-4 h-4 mr-2" />
                            )}
                            Reserve Now
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {!selectedMedicine && !searchTerm && (
        <Card className="bg-red-500/5 border-red-200 dark:border-red-900/30">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">In a medical emergency,</span> call{" "}
              <a href="tel:112" className="font-bold text-red-600 dark:text-red-400 hover:underline">
                112
              </a>{" "}
              immediately. Use this tool to locate medicines at nearby pharmacies.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
