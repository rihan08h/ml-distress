import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Pharmacy, Medicine, PharmacyInventory, Reservation } from "@shared/schema";

type PharmacyWithDistance = Pharmacy & { distance?: number; quantity?: number; price?: string };

interface NearbyPharmacy {
  id: number;
  name: string;
  address: string;
  phone: string | null;
  latitude: string;
  longitude: string;
  openingHours: string | null;
  website: string | null;
  brand: string | null;
  distance: number;
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MapPin,
  Phone,
  Clock,
  Star,
  Search,
  Pill,
  Package,
  CalendarDays,
  CheckCircle2,
  Navigation,
  X,
  Minus,
  Plus,
  Globe,
  ExternalLink,
  Locate,
} from "lucide-react";

interface InventoryWithMedicine extends PharmacyInventory {
  medicineName?: string;
}

export default function PharmaciesPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  const [selectedPharmacy, setSelectedPharmacy] = useState<Pharmacy | null>(null);
  const [reservingItem, setReservingItem] = useState<InventoryWithMedicine | null>(null);
  const [reserveQuantity, setReserveQuantity] = useState(1);
  const [confirmationCode, setConfirmationCode] = useState<string | null>(null);
  const [showMedicineResults, setShowMedicineResults] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationName, setLocationName] = useState("");
  const [nearbyRadius, setNearbyRadius] = useState("3000");
  const [activeTab, setActiveTab] = useState<"platform" | "nearby">("nearby");
  const [locationSearch, setLocationSearch] = useState("");
  const [debouncedLocationSearch, setDebouncedLocationSearch] = useState("");
  const [showLocationResults, setShowLocationResults] = useState(false);
  const locationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedLocationSearch(locationSearch), 400);
    return () => clearTimeout(timer);
  }, [locationSearch]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (locationRef.current && !locationRef.current.contains(e.target as Node)) {
        setShowLocationResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  interface GeoResult { name: string; lat: number; lng: number; }

  const { data: geoResults } = useQuery<GeoResult[]>({
    queryKey: ["/api/geocode", debouncedLocationSearch],
    queryFn: async () => {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(debouncedLocationSearch)}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: debouncedLocationSearch.length >= 2,
  });

  function selectLocation(result: GeoResult) {
    setUserLocation({ lat: result.lat, lng: result.lng });
    const shortName = result.name.split(",").slice(0, 2).join(",");
    setLocationName(shortName);
    setLocationSearch(shortName);
    setShowLocationResults(false);
  }

  function useGPS() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLocationName("Current Location (GPS)");
          setLocationSearch("Current Location (GPS)");
        },
        () => {
          toast({ title: "Location access denied", description: "Please type your city or area name instead.", variant: "destructive" });
        }
      );
    }
  }

  const locQuery = userLocation ? `?lat=${userLocation.lat}&lng=${userLocation.lng}` : "";

  const { data: nearbyPharmacies, isLoading: nearbyLoading } = useQuery<NearbyPharmacy[]>({
    queryKey: ["/api/pharmacies/nearby", userLocation?.lat, userLocation?.lng, nearbyRadius],
    queryFn: async () => {
      const res = await fetch(`/api/pharmacies/nearby?lat=${userLocation!.lat}&lng=${userLocation!.lng}&radius=${nearbyRadius}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!userLocation,
    staleTime: 60000,
  });

  const { data: allPharmacies, isLoading: pharmaciesLoading } = useQuery<PharmacyWithDistance[]>({
    queryKey: ["/api/pharmacies", locQuery],
  });

  const { data: searchResults } = useQuery<Medicine[]>({
    queryKey: ["/api/medicines", `?q=${searchQuery}`],
    enabled: searchQuery.length >= 2,
  });

  const { data: filteredPharmacies } = useQuery<PharmacyWithDistance[]>({
    queryKey: ["/api/pharmacies/medicine", selectedMedicine?.id, locQuery],
    queryFn: async () => {
      const res = await fetch(`/api/pharmacies/medicine/${selectedMedicine!.id}${locQuery}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!selectedMedicine,
  });

  const { data: inventory, isLoading: inventoryLoading } = useQuery<InventoryWithMedicine[]>({
    queryKey: ["/api/pharmacies", selectedPharmacy?.id, "inventory"],
    enabled: !!selectedPharmacy,
  });

  const reserveMutation = useMutation({
    mutationFn: async (data: { pharmacyId: number; medicineId: number; quantity: number }) => {
      const res = await apiRequest("POST", "/api/reservations", data);
      return await res.json();
    },
    onSuccess: (data: Reservation) => {
      setConfirmationCode(data.confirmationCode ?? null);
      queryClient.invalidateQueries({ queryKey: ["/api/pharmacies", selectedPharmacy?.id, "inventory"] });
      toast({
        title: "Reservation Confirmed",
        description: `Your medicine has been reserved. Code: ${data.confirmationCode}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Reservation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const pharmacies = selectedMedicine ? filteredPharmacies : allPharmacies;

  const renderStars = (rating: string | null) => {
    const value = rating ? parseFloat(rating) : 0;
    const full = Math.floor(value);
    const half = value - full >= 0.5;
    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`w-3.5 h-3.5 ${
              i < full
                ? "fill-amber-400 text-amber-400"
                : i === full && half
                  ? "fill-amber-400/50 text-amber-400"
                  : "text-muted-foreground/30"
            }`}
          />
        ))}
        {rating && <span className="text-xs text-muted-foreground ml-1">{rating}</span>}
      </div>
    );
  };

  const openInMaps = (lat: string, lng: string, name: string) => {
    window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}&query_place_id=${encodeURIComponent(name)}`, "_blank");
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-pharmacies-title">
          Pharmacy Locator
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Find nearby pharmacies and check medicine availability.
        </p>
      </div>

      <div className="flex gap-2">
        <Button
          variant={activeTab === "nearby" ? "default" : "outline"}
          size="sm"
          data-testid="button-tab-nearby"
          onClick={() => setActiveTab("nearby")}
          className={activeTab === "nearby" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}
        >
          <Locate className="w-4 h-4 mr-1.5" />
          Nearby Pharmacies
        </Button>
        <Button
          variant={activeTab === "platform" ? "default" : "outline"}
          size="sm"
          data-testid="button-tab-platform"
          onClick={() => setActiveTab("platform")}
          className={activeTab === "platform" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}
        >
          <Package className="w-4 h-4 mr-1.5" />
          MediSafe Pharmacies
        </Button>
      </div>

      {activeTab === "nearby" ? (
        <>
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1" ref={locationRef}>
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    data-testid="input-location-search"
                    placeholder="Type your city or area (e.g. Hyderabad, Koramangala)..."
                    className="pl-9"
                    value={locationSearch}
                    onChange={(e) => {
                      setLocationSearch(e.target.value);
                      setShowLocationResults(true);
                    }}
                    onFocus={() => setShowLocationResults(true)}
                  />
                  {showLocationResults && debouncedLocationSearch.length >= 2 && geoResults && geoResults.length > 0 && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-md max-h-56 overflow-y-auto">
                      {geoResults.map((result, i) => (
                        <button
                          key={i}
                          data-testid={`button-location-${i}`}
                          className="w-full text-left px-3 py-2.5 text-sm hover:bg-accent flex items-center gap-2 border-b last:border-0"
                          onClick={() => selectLocation(result)}
                        >
                          <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                          <span className="truncate">{result.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-shrink-0 h-10"
                  data-testid="button-use-gps"
                  onClick={useGPS}
                >
                  <Locate className="w-4 h-4 mr-1.5" />
                  Use GPS
                </Button>
              </div>
              {locationName && (
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant="secondary" className="gap-1.5">
                    <Navigation className="w-3 h-3" />
                    {locationName}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">Search radius:</span>
            <Select value={nearbyRadius} onValueChange={setNearbyRadius}>
              <SelectTrigger className="w-32" data-testid="select-radius">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1000">1 km</SelectItem>
                <SelectItem value="2000">2 km</SelectItem>
                <SelectItem value="3000">3 km</SelectItem>
                <SelectItem value="5000">5 km</SelectItem>
                <SelectItem value="10000">10 km</SelectItem>
              </SelectContent>
            </Select>
            {nearbyPharmacies && userLocation && (
              <span className="text-sm text-muted-foreground">
                {nearbyPharmacies.length} {nearbyPharmacies.length === 1 ? "pharmacy" : "pharmacies"} found
              </span>
            )}
          </div>

          {!userLocation ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Locate className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm font-medium mb-1">Set your location</p>
                <p className="text-sm text-muted-foreground">
                  Type your city or area name above, or tap "Use GPS" to find nearby pharmacies.
                </p>
              </CardContent>
            </Card>
          ) : nearbyLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-40 w-full" />
              ))}
            </div>
          ) : !nearbyPharmacies || nearbyPharmacies.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <MapPin className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  No pharmacies found within {parseInt(nearbyRadius) / 1000} km. Try increasing the search radius.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {nearbyPharmacies.map((pharmacy) => (
                <Card
                  key={pharmacy.id}
                  className="hover-elevate"
                  data-testid={`card-nearby-pharmacy-${pharmacy.id}`}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold truncate" data-testid={`text-nearby-name-${pharmacy.id}`}>
                          {pharmacy.name}
                        </h3>
                        {pharmacy.brand && (
                          <span className="text-xs text-muted-foreground">{pharmacy.brand}</span>
                        )}
                      </div>
                      <Badge variant="outline" className="text-emerald-600 border-emerald-600/30 flex-shrink-0">
                        <Navigation className="w-3 h-3 mr-1" />
                        {pharmacy.distance < 1 ? `${Math.round(pharmacy.distance * 1000)}m` : `${pharmacy.distance.toFixed(1)} km`}
                      </Badge>
                    </div>

                    <div className="space-y-1.5 text-sm text-muted-foreground">
                      {pharmacy.address && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{pharmacy.address}</span>
                        </div>
                      )}
                      {pharmacy.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                          <a href={`tel:${pharmacy.phone}`} className="hover:underline">{pharmacy.phone}</a>
                        </div>
                      )}
                      {pharmacy.openingHours && (
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{pharmacy.openingHours}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7"
                        data-testid={`button-directions-${pharmacy.id}`}
                        onClick={() => openInMaps(pharmacy.latitude, pharmacy.longitude, pharmacy.name)}
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Directions
                      </Button>
                      {pharmacy.website && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs h-7"
                          onClick={() => window.open(pharmacy.website!, "_blank")}
                        >
                          <Globe className="w-3 h-3 mr-1" />
                          Website
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <Card>
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  data-testid="input-medicine-search"
                  placeholder="Search for a medicine to filter pharmacies..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowMedicineResults(true);
                    if (e.target.value.length < 2) {
                      setSelectedMedicine(null);
                    }
                  }}
                  onFocus={() => setShowMedicineResults(true)}
                />

                {showMedicineResults && searchQuery.length >= 2 && searchResults && searchResults.length > 0 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-md max-h-48 overflow-y-auto">
                    {searchResults.map((med) => (
                      <button
                        key={med.id}
                        data-testid={`button-select-medicine-${med.id}`}
                        className="w-full text-left px-3 py-2 text-sm hover-elevate flex items-center gap-2"
                        onClick={() => {
                          setSelectedMedicine(med);
                          setSearchQuery(med.name);
                          setShowMedicineResults(false);
                        }}
                      >
                        <Pill className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                        <span className="truncate">{med.name}</span>
                        {med.genericName && (
                          <span className="text-xs text-muted-foreground ml-auto flex-shrink-0">
                            {med.genericName}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedMedicine && (
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant="secondary" className="gap-1">
                    <Pill className="w-3 h-3" />
                    Filtering by: {selectedMedicine.name}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    data-testid="button-clear-filter"
                    onClick={() => {
                      setSelectedMedicine(null);
                      setSearchQuery("");
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {pharmaciesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-48 w-full" />
              ))}
            </div>
          ) : !pharmacies || pharmacies.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <MapPin className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  {selectedMedicine
                    ? "No pharmacies found stocking this medicine."
                    : "No pharmacies found nearby."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pharmacies.map((pharmacy) => (
                <Card
                  key={pharmacy.id}
                  className="hover-elevate cursor-pointer"
                  data-testid={`card-pharmacy-${pharmacy.id}`}
                  onClick={() => {
                    setSelectedPharmacy(pharmacy);
                    setReservingItem(null);
                    setConfirmationCode(null);
                  }}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold truncate" data-testid={`text-pharmacy-name-${pharmacy.id}`}>
                          {pharmacy.name}
                        </h3>
                        {renderStars(pharmacy.rating)}
                      </div>
                      <Badge
                        variant={pharmacy.isOpen ? "default" : "secondary"}
                        className={pharmacy.isOpen ? "bg-emerald-600 text-white no-default-hover-elevate no-default-active-elevate" : ""}
                        data-testid={`badge-status-${pharmacy.id}`}
                      >
                        {pharmacy.isOpen ? "Open" : "Closed"}
                      </Badge>
                    </div>

                    <div className="space-y-1.5 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{pharmacy.address}</span>
                      </div>
                      {pharmacy.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>{pharmacy.phone}</span>
                        </div>
                      )}
                      {pharmacy.operatingHours && (
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>
                            {(pharmacy.operatingHours as { open: string; close: string }).open} -{" "}
                            {(pharmacy.operatingHours as { open: string; close: string }).close}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Navigation className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{pharmacy.distance !== undefined ? `${pharmacy.distance.toFixed(1)} km away` : "Distance unavailable"}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <Dialog
        open={!!selectedPharmacy}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedPharmacy(null);
            setReservingItem(null);
            setConfirmationCode(null);
          }
        }}
      >
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedPharmacy && (
            <>
              <DialogHeader>
                <DialogTitle data-testid="text-dialog-pharmacy-name">{selectedPharmacy.name}</DialogTitle>
                <DialogDescription className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5" />
                  {selectedPharmacy.address}
                </DialogDescription>
              </DialogHeader>

              {confirmationCode ? (
                <div className="text-center py-6 space-y-3">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-semibold">Reservation Confirmed</h3>
                  <p className="text-sm text-muted-foreground">Show this code at the pharmacy</p>
                  <div
                    className="text-2xl font-mono font-bold tracking-widest text-emerald-600 dark:text-emerald-400"
                    data-testid="text-confirmation-code"
                  >
                    {confirmationCode}
                  </div>
                  <Button
                    variant="outline"
                    data-testid="button-done-reservation"
                    onClick={() => {
                      setConfirmationCode(null);
                      setReservingItem(null);
                    }}
                  >
                    Done
                  </Button>
                </div>
              ) : reservingItem ? (
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm">
                    Reserve: {reservingItem.medicineName ?? `Medicine #${reservingItem.medicineId}`}
                  </h3>
                  <div className="flex items-center justify-between gap-4 p-3 rounded-md bg-muted/50">
                    <span className="text-sm text-muted-foreground">Quantity</span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        data-testid="button-decrease-quantity"
                        onClick={() => setReserveQuantity((q) => Math.max(1, q - 1))}
                        disabled={reserveQuantity <= 1}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="w-8 text-center font-medium" data-testid="text-reserve-quantity">
                        {reserveQuantity}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        data-testid="button-increase-quantity"
                        onClick={() => setReserveQuantity((q) => Math.min(reservingItem.quantity, q + 1))}
                        disabled={reserveQuantity >= reservingItem.quantity}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  {reservingItem.price && (
                    <div className="flex items-center justify-between text-sm p-3 rounded-md bg-muted/50">
                      <span className="text-muted-foreground">Total Price</span>
                      <span className="font-semibold">
                        ₹{(parseFloat(reservingItem.price) * reserveQuantity).toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      data-testid="button-cancel-reserve"
                      onClick={() => {
                        setReservingItem(null);
                        setReserveQuantity(1);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                      data-testid="button-confirm-reserve"
                      disabled={reserveMutation.isPending}
                      onClick={() => {
                        reserveMutation.mutate({
                          pharmacyId: selectedPharmacy.id,
                          medicineId: reservingItem.medicineId,
                          quantity: reserveQuantity,
                        });
                      }}
                    >
                      {reserveMutation.isPending ? "Reserving..." : "Confirm Reservation"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Package className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Inventory
                  </h3>
                  {inventoryLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : !inventory || inventory.length === 0 ? (
                    <div className="text-center py-6">
                      <Package className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No inventory data available.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {inventory.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 p-3 rounded-md bg-muted/50"
                          data-testid={`inventory-item-${item.id}`}
                        >
                          <div className="w-8 h-8 rounded-md bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                            <Pill className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {item.medicineName ?? `Medicine #${item.medicineId}`}
                            </p>
                            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                              <span className="text-xs text-muted-foreground">
                                Qty: {item.quantity}
                              </span>
                              {item.price && (
                                <span className="text-xs text-muted-foreground">
                                  ₹{item.price}
                                </span>
                              )}
                              {item.expiryDate && (
                                <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                                  <CalendarDays className="w-3 h-3" />
                                  {item.expiryDate}
                                </span>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            data-testid={`button-reserve-${item.id}`}
                            disabled={item.quantity <= 0}
                            onClick={(e) => {
                              e.stopPropagation();
                              setReservingItem(item);
                              setReserveQuantity(1);
                            }}
                          >
                            Reserve
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
