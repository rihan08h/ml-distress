import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Reminder } from "@shared/schema";
import {
  Bell,
  Plus,
  Clock,
  Pill,
  Calendar,
  Trash2,
  Edit,
  Loader2,
  BellOff,
} from "lucide-react";

const defaultForm = {
  medicineName: "",
  dosage: "",
  frequency: "daily",
  times: ["08:00"],
  startDate: new Date().toISOString().split("T")[0],
  endDate: "",
  notes: "",
};

export default function RemindersPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(defaultForm);

  const { data: reminders, isLoading } = useQuery<Reminder[]>({
    queryKey: ["/api/reminders"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/reminders", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      setDialogOpen(false);
      setForm(defaultForm);
      setEditingId(null);
      toast({ title: "Reminder created" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/reminders/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      setDialogOpen(false);
      setForm(defaultForm);
      setEditingId(null);
      toast({ title: "Reminder updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/reminders/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      toast({ title: "Reminder deleted" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const res = await apiRequest("PATCH", `/api/reminders/${id}`, { isActive });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
    },
  });

  const openCreate = () => {
    setForm(defaultForm);
    setEditingId(null);
    setDialogOpen(true);
  };

  const openEdit = (reminder: Reminder) => {
    setForm({
      medicineName: reminder.medicineName,
      dosage: reminder.dosage || "",
      frequency: reminder.frequency,
      times: (reminder.times as string[]) || ["08:00"],
      startDate: reminder.startDate,
      endDate: reminder.endDate || "",
      notes: reminder.notes || "",
    });
    setEditingId(reminder.id);
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      medicineName: form.medicineName,
      dosage: form.dosage || undefined,
      frequency: form.frequency,
      times: form.times.filter(Boolean),
      startDate: form.startDate,
      endDate: form.endDate || undefined,
      notes: form.notes || undefined,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const addTime = () => {
    setForm({ ...form, times: [...form.times, "12:00"] });
  };

  const removeTime = (idx: number) => {
    setForm({ ...form, times: form.times.filter((_, i) => i !== idx) });
  };

  const updateTime = (idx: number, val: string) => {
    const newTimes = [...form.times];
    newTimes[idx] = val;
    setForm({ ...form, times: newTimes });
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const activeReminders = reminders?.filter((r) => r.isActive) ?? [];
  const inactiveReminders = reminders?.filter((r) => !r.isActive) ?? [];

  const getFrequencyLabel = (freq: string) => {
    switch (freq) {
      case "daily": return "Daily";
      case "twice_daily": return "Twice daily";
      case "thrice_daily": return "3 times daily";
      case "weekly": return "Weekly";
      case "as_needed": return "As needed";
      default: return freq;
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-reminders-title">
            Medicine Reminders
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Never miss a dose. Track your medication schedule.
          </p>
        </div>
        <Button onClick={openCreate} data-testid="button-add-reminder">
          <Plus className="w-4 h-4 mr-1.5" />
          Add Reminder
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : reminders && reminders.length > 0 ? (
        <div className="space-y-6">
          {activeReminders.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">Active ({activeReminders.length})</h2>
              {activeReminders.map((reminder) => (
                <Card key={reminder.id} data-testid={`reminder-card-${reminder.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Pill className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="font-semibold text-sm" data-testid={`text-reminder-name-${reminder.id}`}>
                              {reminder.medicineName}
                            </h3>
                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                              {reminder.dosage && (
                                <span className="text-xs text-muted-foreground">{reminder.dosage}</span>
                              )}
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                {getFrequencyLabel(reminder.frequency)}
                              </span>
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Calendar className="w-3 h-3" />
                                {reminder.startDate}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {(reminder.times as string[])?.map((time, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {time}
                                </Badge>
                              ))}
                            </div>
                            {reminder.notes && (
                              <p className="text-xs text-muted-foreground mt-2 italic">{reminder.notes}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Switch
                              checked={reminder.isActive ?? true}
                              onCheckedChange={(checked) =>
                                toggleMutation.mutate({ id: reminder.id, isActive: checked })
                              }
                              data-testid={`switch-reminder-${reminder.id}`}
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => openEdit(reminder)}
                              data-testid={`button-edit-reminder-${reminder.id}`}
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => deleteMutation.mutate(reminder.id)}
                              data-testid={`button-delete-reminder-${reminder.id}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {inactiveReminders.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">Paused ({inactiveReminders.length})</h2>
              {inactiveReminders.map((reminder) => (
                <Card key={reminder.id} className="opacity-60" data-testid={`reminder-card-${reminder.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                        <BellOff className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm">{reminder.medicineName}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {getFrequencyLabel(reminder.frequency)} &middot; Paused
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Switch
                          checked={false}
                          onCheckedChange={() =>
                            toggleMutation.mutate({ id: reminder.id, isActive: true })
                          }
                          data-testid={`switch-reminder-${reminder.id}`}
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteMutation.mutate(reminder.id)}
                          data-testid={`button-delete-reminder-${reminder.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-16">
          <Bell className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="font-medium text-muted-foreground">No reminders yet</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            Create your first medicine reminder to stay on top of your medication schedule.
          </p>
          <Button onClick={openCreate} variant="outline" className="mt-4" data-testid="button-add-first-reminder">
            <Plus className="w-4 h-4 mr-1.5" />
            Add Reminder
          </Button>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Reminder" : "New Reminder"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="medicineName">Medicine Name</Label>
              <Input
                id="medicineName"
                placeholder="e.g., Amoxicillin 500mg"
                value={form.medicineName}
                onChange={(e) => setForm({ ...form, medicineName: e.target.value })}
                required
                data-testid="input-reminder-medicine"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="dosage">Dosage</Label>
                <Input
                  id="dosage"
                  placeholder="e.g., 1 tablet"
                  value={form.dosage}
                  onChange={(e) => setForm({ ...form, dosage: e.target.value })}
                  data-testid="input-reminder-dosage"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="frequency">Frequency</Label>
                <Select
                  value={form.frequency}
                  onValueChange={(v) => setForm({ ...form, frequency: v })}
                >
                  <SelectTrigger data-testid="select-reminder-frequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="twice_daily">Twice daily</SelectItem>
                    <SelectItem value="thrice_daily">3 times daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="as_needed">As needed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label>Reminder Times</Label>
                <Button type="button" variant="ghost" size="sm" onClick={addTime} data-testid="button-add-time">
                  <Plus className="w-3 h-3 mr-1" />
                  Add time
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {form.times.map((time, idx) => (
                  <div key={idx} className="flex items-center gap-1">
                    <Input
                      type="time"
                      value={time}
                      onChange={(e) => updateTime(idx, e.target.value)}
                      className="w-32"
                      data-testid={`input-reminder-time-${idx}`}
                    />
                    {form.times.length > 1 && (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => removeTime(idx)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  required
                  data-testid="input-reminder-start"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="endDate">End Date (optional)</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  data-testid="input-reminder-end"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any special instructions..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="resize-none"
                rows={2}
                data-testid="input-reminder-notes"
              />
            </div>

            <DialogFooter>
              <Button type="submit" disabled={isSaving} data-testid="button-save-reminder">
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    Saving...
                  </>
                ) : editingId ? (
                  "Update Reminder"
                ) : (
                  "Create Reminder"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
