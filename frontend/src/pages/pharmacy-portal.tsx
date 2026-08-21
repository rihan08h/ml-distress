import { useState, createContext, useContext } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Pharmacy, PharmacyInventory, Medicine, PharmacyTransfer } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Package,
  AlertTriangle,
  ArrowLeftRight,
  BarChart3,
  Plus,
  Pencil,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";

const PharmacyIdContext = createContext<number>(1);
function usePharmacyId() { return useContext(PharmacyIdContext); }

type InventoryWithMedicine = PharmacyInventory & { medicine?: Medicine };
type TransferWithDetails = PharmacyTransfer & {
  fromPharmacy?: Pharmacy;
  toPharmacy?: Pharmacy;
  medicine?: Medicine;
};
type DemandItem = {
  medicine: Medicine;
  totalSearches: number;
  totalReservations: number;
  trend: "rising" | "falling" | "stable";
};

function DashboardTab() {
  const PHARMACY_ID = usePharmacyId();
  const { data: inventory, isLoading: invLoading } = useQuery<InventoryWithMedicine[]>({
    queryKey: ["/api/portal/inventory", PHARMACY_ID],
  });

  const { data: transfers, isLoading: txLoading } = useQuery<TransferWithDetails[]>({
    queryKey: ["/api/portal/transfers", PHARMACY_ID],
  });

  const totalItems = inventory?.length ?? 0;
  const lowStockItems = inventory?.filter((i) => i.quantity < 20) ?? [];
  const activeTransfers = transfers?.filter((t) => t.status === "pending") ?? [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Total Inventory Items</p>
                <p className="text-2xl font-bold mt-1" data-testid="text-total-inventory">
                  {invLoading ? <Skeleton className="h-8 w-16" /> : totalItems}
                </p>
              </div>
              <div className="w-10 h-10 rounded-md bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                <Package className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Low Stock Alerts</p>
                <p className="text-2xl font-bold mt-1" data-testid="text-low-stock-count">
                  {invLoading ? <Skeleton className="h-8 w-16" /> : lowStockItems.length}
                </p>
              </div>
              <div className="w-10 h-10 rounded-md bg-red-500/10 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Active Transfers</p>
                <p className="text-2xl font-bold mt-1" data-testid="text-active-transfers">
                  {txLoading ? <Skeleton className="h-8 w-16" /> : activeTransfers.length}
                </p>
              </div>
              <div className="w-10 h-10 rounded-md bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <ArrowLeftRight className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Low Stock Items</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {invLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : lowStockItems.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No low stock items</p>
            ) : (
              <div className="space-y-2">
                {lowStockItems.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 p-3 rounded-md bg-muted/50"
                    data-testid={`low-stock-item-${item.id}`}
                  >
                    <span className="text-sm font-medium truncate">
                      {item.medicine?.name ?? `Medicine #${item.medicineId}`}
                    </span>
                    <Badge variant="destructive">{item.quantity} left</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Transfers</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {txLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : !transfers || transfers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No transfers yet</p>
            ) : (
              <div className="space-y-2">
                {transfers.slice(0, 5).map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between gap-2 p-3 rounded-md bg-muted/50"
                    data-testid={`transfer-preview-${tx.id}`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {tx.medicine?.name ?? `Medicine #${tx.medicineId}`}
                      </p>
                      <p className="text-xs text-muted-foreground">Qty: {tx.quantity}</p>
                    </div>
                    <TransferStatusBadge status={tx.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function TransferStatusBadge({ status }: { status: string }) {
  const variant = status === "approved" ? "default" : status === "rejected" ? "destructive" : "secondary";
  return (
    <Badge variant={variant} data-testid={`badge-status-${status}`}>
      {status}
    </Badge>
  );
}

function InventoryTab() {
  const PHARMACY_ID = usePharmacyId();
  const { toast } = useToast();
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryWithMedicine | null>(null);
  const [updateQty, setUpdateQty] = useState("");
  const [updatePrice, setUpdatePrice] = useState("");
  const [addMedicineId, setAddMedicineId] = useState("");
  const [addQty, setAddQty] = useState("");
  const [addPrice, setAddPrice] = useState("");
  const [addExpiry, setAddExpiry] = useState("");

  const { data: inventory, isLoading } = useQuery<InventoryWithMedicine[]>({
    queryKey: ["/api/portal/inventory", PHARMACY_ID],
  });

  const updateMutation = useMutation({
    mutationFn: async ({ medicineId, quantity, price }: { medicineId: number; quantity: number; price: string }) => {
      await apiRequest("PATCH", `/api/portal/inventory/${PHARMACY_ID}/${medicineId}`, { quantity, price });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/inventory", PHARMACY_ID] });
      setUpdateDialogOpen(false);
      toast({ title: "Stock updated successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to update stock", description: err.message, variant: "destructive" });
    },
  });

  const addMutation = useMutation({
    mutationFn: async (data: { pharmacyId: number; medicineId: number; quantity: number; price: string; expiryDate: string }) => {
      await apiRequest("POST", "/api/portal/inventory", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/inventory", PHARMACY_ID] });
      setAddDialogOpen(false);
      setAddMedicineId("");
      setAddQty("");
      setAddPrice("");
      setAddExpiry("");
      toast({ title: "Item added successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to add item", description: err.message, variant: "destructive" });
    },
  });

  const openUpdateDialog = (item: InventoryWithMedicine) => {
    setSelectedItem(item);
    setUpdateQty(String(item.quantity));
    setUpdatePrice(item.price ?? "");
    setUpdateDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-lg font-semibold">Inventory Management</h2>
        <Button onClick={() => setAddDialogOpen(true)} data-testid="button-add-item">
          <Plus className="w-4 h-4 mr-2" />
          Add Item
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Medicine</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(!inventory || inventory.length === 0) ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No inventory items found
                  </TableCell>
                </TableRow>
              ) : (
                inventory.map((item) => (
                  <TableRow key={item.id} data-testid={`inventory-row-${item.id}`}>
                    <TableCell className="font-medium">
                      {item.medicine?.name ?? `Medicine #${item.medicineId}`}
                    </TableCell>
                    <TableCell>{item.medicine?.category ?? "-"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 flex-wrap">
                        {item.quantity}
                        {item.quantity < 20 && (
                          <Badge variant="destructive" data-testid={`badge-low-stock-${item.id}`}>
                            Low Stock
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{item.price ? `$${item.price}` : "-"}</TableCell>
                    <TableCell>{item.expiryDate ?? "-"}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openUpdateDialog(item)}
                        data-testid={`button-update-stock-${item.id}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Stock</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              {selectedItem?.medicine?.name ?? `Medicine #${selectedItem?.medicineId}`}
            </p>
            <div className="space-y-2">
              <Label htmlFor="update-qty">Quantity</Label>
              <Input
                id="update-qty"
                type="number"
                value={updateQty}
                onChange={(e) => setUpdateQty(e.target.value)}
                data-testid="input-update-quantity"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="update-price">Price</Label>
              <Input
                id="update-price"
                type="text"
                value={updatePrice}
                onChange={(e) => setUpdatePrice(e.target.value)}
                data-testid="input-update-price"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                if (selectedItem) {
                  updateMutation.mutate({
                    medicineId: selectedItem.medicineId,
                    quantity: parseInt(updateQty) || 0,
                    price: updatePrice,
                  });
                }
              }}
              disabled={updateMutation.isPending}
              data-testid="button-confirm-update"
            >
              {updateMutation.isPending ? "Updating..." : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Inventory Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="add-medicine-id">Medicine ID</Label>
              <Input
                id="add-medicine-id"
                type="number"
                value={addMedicineId}
                onChange={(e) => setAddMedicineId(e.target.value)}
                data-testid="input-add-medicine-id"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-qty">Quantity</Label>
              <Input
                id="add-qty"
                type="number"
                value={addQty}
                onChange={(e) => setAddQty(e.target.value)}
                data-testid="input-add-quantity"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-price">Price</Label>
              <Input
                id="add-price"
                type="text"
                value={addPrice}
                onChange={(e) => setAddPrice(e.target.value)}
                data-testid="input-add-price"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-expiry">Expiry Date</Label>
              <Input
                id="add-expiry"
                type="text"
                placeholder="YYYY-MM-DD"
                value={addExpiry}
                onChange={(e) => setAddExpiry(e.target.value)}
                data-testid="input-add-expiry"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                addMutation.mutate({
                  pharmacyId: PHARMACY_ID,
                  medicineId: parseInt(addMedicineId) || 0,
                  quantity: parseInt(addQty) || 0,
                  price: addPrice,
                  expiryDate: addExpiry,
                });
              }}
              disabled={addMutation.isPending}
              data-testid="button-confirm-add"
            >
              {addMutation.isPending ? "Adding..." : "Add Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NetworkTab() {
  const PHARMACY_ID = usePharmacyId();
  const { toast } = useToast();
  const [toPharmacyId, setToPharmacyId] = useState("");
  const [transferMedicineId, setTransferMedicineId] = useState("");
  const [transferQty, setTransferQty] = useState("");
  const [transferReason, setTransferReason] = useState("");

  const { data: pharmacies, isLoading: pharmaciesLoading } = useQuery<Pharmacy[]>({
    queryKey: ["/api/portal/pharmacies"],
  });

  const { data: transfers, isLoading: transfersLoading } = useQuery<TransferWithDetails[]>({
    queryKey: ["/api/portal/transfers", PHARMACY_ID],
  });

  const { data: inventory } = useQuery<InventoryWithMedicine[]>({
    queryKey: ["/api/portal/inventory", PHARMACY_ID],
  });

  const transferMutation = useMutation({
    mutationFn: async (data: { fromPharmacyId: number; toPharmacyId: number; medicineId: number; quantity: number; reason: string }) => {
      await apiRequest("POST", "/api/portal/transfers", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/transfers", PHARMACY_ID] });
      setToPharmacyId("");
      setTransferMedicineId("");
      setTransferQty("");
      setTransferReason("");
      toast({ title: "Transfer request created" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to create transfer", description: err.message, variant: "destructive" });
    },
  });

  const otherPharmacies = pharmacies?.filter((p) => p.id !== PHARMACY_ID) ?? [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Pharmacy Network</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {pharmaciesLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : otherPharmacies.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No other pharmacies in network</p>
            ) : (
              <div className="space-y-2">
                {otherPharmacies.map((pharmacy) => (
                  <div
                    key={pharmacy.id}
                    className="flex items-center justify-between gap-2 p-3 rounded-md bg-muted/50"
                    data-testid={`pharmacy-item-${pharmacy.id}`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{pharmacy.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{pharmacy.address}</p>
                    </div>
                    <Badge variant={pharmacy.isOpen ? "default" : "secondary"}>
                      {pharmacy.isOpen ? "Open" : "Closed"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Create Transfer Request</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            <div className="space-y-2">
              <Label>Target Pharmacy</Label>
              <Select value={toPharmacyId} onValueChange={setToPharmacyId}>
                <SelectTrigger data-testid="select-target-pharmacy">
                  <SelectValue placeholder="Select pharmacy" />
                </SelectTrigger>
                <SelectContent>
                  {otherPharmacies.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Medicine</Label>
              <Select value={transferMedicineId} onValueChange={setTransferMedicineId}>
                <SelectTrigger data-testid="select-transfer-medicine">
                  <SelectValue placeholder="Select medicine" />
                </SelectTrigger>
                <SelectContent>
                  {(inventory ?? []).map((item) => (
                    <SelectItem key={item.medicineId} value={String(item.medicineId)}>
                      {item.medicine?.name ?? `Medicine #${item.medicineId}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="transfer-qty">Quantity</Label>
              <Input
                id="transfer-qty"
                type="number"
                value={transferQty}
                onChange={(e) => setTransferQty(e.target.value)}
                data-testid="input-transfer-quantity"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="transfer-reason">Reason</Label>
              <Input
                id="transfer-reason"
                type="text"
                placeholder="e.g., Stock shortage"
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                data-testid="input-transfer-reason"
              />
            </div>

            <Button
              className="w-full"
              onClick={() => {
                transferMutation.mutate({
                  fromPharmacyId: PHARMACY_ID,
                  toPharmacyId: parseInt(toPharmacyId) || 0,
                  medicineId: parseInt(transferMedicineId) || 0,
                  quantity: parseInt(transferQty) || 0,
                  reason: transferReason,
                });
              }}
              disabled={transferMutation.isPending || !toPharmacyId || !transferMedicineId || !transferQty}
              data-testid="button-submit-transfer"
            >
              {transferMutation.isPending ? "Submitting..." : "Submit Transfer Request"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Transfer History</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {transfersLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medicine</TableHead>
                  <TableHead>To Pharmacy</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(!transfers || transfers.length === 0) ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No transfers found
                    </TableCell>
                  </TableRow>
                ) : (
                  transfers.map((tx) => (
                    <TableRow key={tx.id} data-testid={`transfer-row-${tx.id}`}>
                      <TableCell>{tx.medicine?.name ?? `Medicine #${tx.medicineId}`}</TableCell>
                      <TableCell>{tx.toPharmacy?.name ?? `Pharmacy #${tx.toPharmacyId}`}</TableCell>
                      <TableCell>{tx.quantity}</TableCell>
                      <TableCell>{tx.reason ?? "-"}</TableCell>
                      <TableCell>
                        <TransferStatusBadge status={tx.status} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AnalyticsTab() {
  const PHARMACY_ID = usePharmacyId();
  const { data: demandData, isLoading } = useQuery<DemandItem[]>({
    queryKey: [`/api/portal/analytics?pharmacyId=${PHARMACY_ID}`],
  });

  const getTrendIcon = (trend: string) => {
    if (trend === "rising") return <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
    if (trend === "falling") return <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  const getTrendLabel = (trend: string) => {
    if (trend === "rising") return "Rising";
    if (trend === "falling") return "Falling";
    return "Stable";
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Demand Analytics</h2>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : !demandData || demandData.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <BarChart3 className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No analytics data available yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Top Medicines by Search Count</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              {[...demandData]
                .sort((a, b) => b.totalSearches - a.totalSearches)
                .slice(0, 10)
                .map((item, index) => {
                  const maxCount = demandData.reduce((max, d) => Math.max(max, d.totalSearches), 1);
                  const barWidth = Math.max((item.totalSearches / maxCount) * 100, 4);
                  return (
                    <div key={item.medicine?.id ?? index} data-testid={`analytics-search-${item.medicine?.id}`}>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-sm font-medium truncate">{item.medicine?.name}</span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {getTrendIcon(item.trend)}
                          <span className="text-sm text-muted-foreground">{item.totalSearches}</span>
                        </div>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-emerald-500 h-2 rounded-full transition-all"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Top Medicines by Reservations</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              {[...demandData]
                .sort((a, b) => b.totalReservations - a.totalReservations)
                .slice(0, 10)
                .map((item) => {
                  const maxCount = demandData.reduce((max, d) => Math.max(max, d.totalReservations), 1);
                  const barWidth = Math.max((item.totalReservations / maxCount) * 100, 4);
                  return (
                    <div key={item.medicine?.id ?? Math.random()} data-testid={`analytics-reservation-${item.medicine?.id}`}>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-sm font-medium truncate">{item.medicine?.name}</span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-muted-foreground">{getTrendLabel(item.trend)}</span>
                          <span className="text-sm text-muted-foreground">{item.totalReservations}</span>
                        </div>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function PharmacyPortalPage() {
  const { data: myPharmacy, isLoading } = useQuery<Pharmacy | null>({
    queryKey: ["/api/portal/my-pharmacy"],
  });

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Fallback to pharmacy ID 1 if user has no pharmacy assigned
  const pharmacyId = myPharmacy?.id ?? 1;

  return (
    <PharmacyIdContext.Provider value={pharmacyId}>
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-pharmacy-portal-title">
          Pharmacy Portal
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {myPharmacy ? `Managing: ${myPharmacy.name}` : "Manage your pharmacy inventory, network, and analytics."}
        </p>
      </div>

      <Tabs defaultValue="dashboard" data-testid="tabs-pharmacy-portal">
        <TabsList className="flex-wrap">
          <TabsTrigger value="dashboard" data-testid="tab-dashboard">
            <Package className="w-4 h-4 mr-2" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="inventory" data-testid="tab-inventory">
            <Package className="w-4 h-4 mr-2" />
            Inventory
          </TabsTrigger>
          <TabsTrigger value="network" data-testid="tab-network">
            <ArrowLeftRight className="w-4 h-4 mr-2" />
            Network
          </TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <DashboardTab />
        </TabsContent>
        <TabsContent value="inventory">
          <InventoryTab />
        </TabsContent>
        <TabsContent value="network">
          <NetworkTab />
        </TabsContent>
        <TabsContent value="analytics">
          <AnalyticsTab />
        </TabsContent>
      </Tabs>
    </div>
    </PharmacyIdContext.Provider>
  );
}
