import { useState, useEffect, Fragment, useCallback } from "react";


import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import {
  Home,
  Plus,
  Pencil,
  Trash2,
  Layers,
  Ruler,
  History,
  Settings2,
} from "lucide-react";
import UnitBillingConfig from "@/features/units/components/UnitBillingConfig";
import UnitHistoryPanel from "@/features/units/components/UnitHistoryPanel";
import { useToast } from "@/shared/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { cn } from "@/shared/lib/utils";
import { useCurrency } from "@/shared/hooks/useCurrency";

interface Unit {
  id: string;
  property_id: string;
  unit_number: string;
  label: string | null;
  unit_type: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  square_feet: number | null;
  description: string | null;
  monthly_rent: number | null;
  house_deposit: number | null;
  water_deposit: number | null;
  floor_number: number | null;
  furnished: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface UnitManagementProps {
  propertyId: string;
  propertyName: string;
  houseLabelPrefix?: string;
  onUnitsChange?: () => void;
}

const unitStatuses = [
  { value: "vacant", label: "Vacant" },
  { value: "occupied", label: "Occupied" },
  { value: "maintenance", label: "Maintenance" },
  { value: "reserved", label: "Reserved" },
];

const statusStyles: Record<string, string> = {
  vacant: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  occupied: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  maintenance: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  reserved: "bg-purple-500/10 text-purple-600 border-purple-500/20",
};

export function UnitManagement({ propertyId, propertyName, houseLabelPrefix, onUnitsChange }: UnitManagementProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { formatCurrency } = useCurrency();
  
  const [units, setUnits] = useState<Unit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [expandedBillingUnitId, setExpandedBillingUnitId] = useState<string | null>(null);
  const [expandedHistoryUnitId, setExpandedHistoryUnitId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form state
  const [unitNumber, setUnitNumber] = useState("");
  const [unitLabel, setUnitLabel] = useState("");
  const [unitType, setUnitType] = useState("standard");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [squareFeet, setSquareFeet] = useState("");
  const [description, setDescription] = useState("");
  const [monthlyRent, setMonthlyRent] = useState("");
  const [houseDeposit, setHouseDeposit] = useState("");
  const [waterDeposit, setWaterDeposit] = useState("");
  const [floorNumber, setFloorNumber] = useState("");
  const [furnished, setFurnished] = useState("unfurnished");
  const [status, setStatus] = useState("vacant");

  // Bulk create state
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkPrefix, setBulkPrefix] = useState("R");
  const [bulkStart, setBulkStart] = useState("1");
  const [bulkCount, setBulkCount] = useState("10");
  const [bulkRent, setBulkRent] = useState("");
  const [bulkCreating, setBulkCreating] = useState(false);

  const fetchUnits = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('units')
      .select("*")
      .eq("property_id", propertyId)
      .order("unit_number");

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load units",
        variant: "destructive",
      });
    } else {
      setUnits((data as unknown as Unit[]) || []);
    }
    setIsLoading(false);
  }, [propertyId, toast]);

  useEffect(() => {
    fetchUnits();
  }, [propertyId, fetchUnits]);

  const resetForm = () => {
    setUnitNumber("");
    setUnitLabel("");
    setUnitType("standard");
    setBedrooms("");
    setBathrooms("");
    setSquareFeet("");
    setDescription("");
    setMonthlyRent("");
    setHouseDeposit("");
    setWaterDeposit("");
    setFloorNumber("");
    setFurnished("unfurnished");
    setStatus("vacant");
    setSelectedUnit(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (unit: Unit) => {
    setSelectedUnit(unit);
    setUnitNumber(unit.unit_number);
    setUnitLabel(unit.label || "");
    setUnitType(unit.unit_type || "standard");
    setBedrooms(unit.bedrooms?.toString() || "");
    setBathrooms(unit.bathrooms?.toString() || "");
    setSquareFeet(unit.square_feet?.toString() || "");
    setDescription(unit.description || "");
    setMonthlyRent(unit.monthly_rent?.toString() || "");
    setHouseDeposit(unit.house_deposit?.toString() || "");
    setWaterDeposit(unit.water_deposit?.toString() || "");
    setFloorNumber(unit.floor_number?.toString() || "");
    setFurnished(unit.furnished || "unfurnished");
    setStatus(unit.status);
    setIsDialogOpen(true);
  };

  const openDeleteDialog = (unit: Unit) => {
    setSelectedUnit(unit);
    setIsDeleteDialogOpen(true);
  };

  const handleSave = async () => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "You must be signed in to manage units.",
        variant: "destructive",
      });
      return;
    }

    if (!unitNumber.trim()) {
      toast({
        title: "Error",
        description: "House number is required",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    const unitData = {
      property_id:    propertyId,
      unit_number:    unitNumber.trim(),
      label:          unitLabel.trim() || unitNumber.trim(),
      unit_type:      unitType,
      bedrooms:       bedrooms ? parseInt(bedrooms) : null,
      bathrooms:      bathrooms ? parseFloat(bathrooms) : null,
      square_feet:    squareFeet ? parseInt(squareFeet) : null,
      description:    description.trim() || null,
      monthly_rent:   monthlyRent ? parseFloat(monthlyRent) : null,
      house_deposit:  houseDeposit ? parseFloat(houseDeposit) : null,
      water_deposit:  waterDeposit ? parseFloat(waterDeposit) : null,
      floor_number:   floorNumber ? parseInt(floorNumber) : null,
      furnished,
      status,
    };

    const syncRentCharge = async (unitId: string, rent: number | null) => {
      if (!rent || rent <= 0) return;

      const { data: existingCharge, error: chargeLookupError } = await supabase
        .from("unit_charge_configs")
        .select("id")
        .eq("unit_id", unitId)
        .eq("charge_type", "rent")
        .maybeSingle();
      if (chargeLookupError) throw chargeLookupError;

      const chargePayload = {
        unit_id: unitId,
        property_id: propertyId,
        manager_id: user.id,
        charge_type: "rent",
        charge_label: "Monthly Rent",
        amount: rent,
        is_active: true,
        is_metered: false,
        billing_cycle: "monthly",
        auto_generate: true,
      };

      const { error: chargeError } = existingCharge
        ? await supabase.from("unit_charge_configs").update(chargePayload).eq("id", existingCharge.id)
        : await supabase.from("unit_charge_configs").insert(chargePayload);
      if (chargeError) throw chargeError;
    };

    if (selectedUnit) {
      // Update
      const { error } = await supabase
        .from('units')
        .update(unitData)
        .eq("id", selectedUnit.id);

      if (error) {
        toast({
          title: "Error",
          description: error.message || "Failed to update unit",
          variant: "destructive",
        });
      } else {
        try {
          await syncRentCharge(selectedUnit.id, unitData.monthly_rent);
        } catch (chargeError) {
          toast({
            title: "Unit Updated",
            description: chargeError instanceof Error ? `Saved unit, but rent charge sync failed: ${chargeError.message}` : "Saved unit, but rent charge sync failed.",
            variant: "destructive",
          });
        }
        toast({
          title: "Unit Updated",
          description: `Unit ${unitNumber} has been updated.`,
        });
        setIsDialogOpen(false);
        resetForm();
        fetchUnits();
        onUnitsChange?.();
      }
    } else {
      // Create
      const { data: createdUnit, error } = await supabase
        .from('units')
        .insert(unitData)
        .select("id")
        .single();

      if (error) {
        toast({
          title: "Error",
          description: error.message.includes("unique") 
            ? "A unit with this number already exists" 
            : "Failed to create unit",
          variant: "destructive",
        });
      } else {
        try {
          if (createdUnit?.id) await syncRentCharge(createdUnit.id, unitData.monthly_rent);
        } catch (chargeError) {
          toast({
            title: "Unit Created",
            description: chargeError instanceof Error ? `Created unit, but rent charge sync failed: ${chargeError.message}` : "Created unit, but rent charge sync failed.",
            variant: "destructive",
          });
        }
        toast({
          title: "Unit Created",
          description: `Unit ${unitNumber} has been added to ${propertyName}.`,
        });
        setIsDialogOpen(false);
        resetForm();
        fetchUnits();
        onUnitsChange?.();
      }
    }

    setIsSaving(false);
  };

  const handleDelete = async () => {
    if (!selectedUnit) return;

    const { error } = await supabase
      .from('units')
      .update({ status: 'inactive' })
      .eq("id", selectedUnit.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to deactivate unit",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Unit Deactivated",
        description: `Unit ${selectedUnit.unit_number} has been deactivated and moved to history.`,
      });
      setIsDeleteDialogOpen(false);
      setSelectedUnit(null);
      fetchUnits();
      onUnitsChange?.();
    }
  };

  const vacantCount = units.filter((u) => u.status === "vacant").length;
  const occupiedCount = units.filter((u) => u.status === "occupied").length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            House Management
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {units.length} houses • {vacantCount} vacant • {occupiedCount} occupied
            {houseLabelPrefix && <span className="ml-1">(Prefix: <strong>{houseLabelPrefix}</strong>)</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setBulkOpen(true)}>
            <Layers className="h-4 w-4 mr-2" />
            Bulk create
          </Button>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add House
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">Loading units...</div>
        ) : units.length === 0 ? (
          <div className="text-center py-12">
            <Home className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No houses added yet</p>
            <Button variant="outline" className="mt-4" onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add First House
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>House No.</TableHead>
                <TableHead>Bedrooms</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Rent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {units.map((unit) => (
                <Fragment key={unit.id}>
                  <TableRow>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "h-8 w-8 rounded-lg flex items-center justify-center text-xs font-medium",
                          unit.status === "occupied" ? "bg-blue-500/10 text-blue-600" :
                          unit.status === "vacant" ? "bg-emerald-500/10 text-emerald-600" :
                          "bg-muted text-muted-foreground"
                        )}>
                          <Home className="h-4 w-4" />
                        </div>
                        <span className="font-medium">{unit.unit_number}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {unit.bedrooms ? (
                        <span className="text-sm">{unit.bedrooms} BR / {unit.bathrooms || 1} BA</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {unit.square_feet ? (
                        <span className="text-sm flex items-center gap-1">
                          <Ruler className="h-3 w-3 text-muted-foreground" />
                          {unit.square_feet.toLocaleString()} sqft
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {unit.monthly_rent ? (
                        <span className="font-medium text-emerald-600 flex items-center gap-1">
                          {formatCurrency(unit.monthly_rent)}/mo
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn("capitalize", statusStyles[unit.status] || statusStyles.vacant)}
                      >
                        {unit.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {unit.description ? (
                        <span className="text-sm text-muted-foreground line-clamp-1 max-w-[150px]">
                          {unit.description}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Unit history"
                          onClick={() => {
                            setExpandedHistoryUnitId(expandedHistoryUnitId === unit.id ? null : unit.id);
                            setExpandedBillingUnitId(null);
                          }}
                          className={expandedHistoryUnitId === unit.id ? 'text-primary bg-primary/10' : ''}
                        >
                          <History className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Configure charges"
                          onClick={() => {
                            setExpandedBillingUnitId(expandedBillingUnitId === unit.id ? null : unit.id);
                            setExpandedHistoryUnitId(null);
                          }}
                          className={expandedBillingUnitId === unit.id ? 'text-primary bg-primary/10' : ''}
                        >
                          <Settings2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(unit)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => openDeleteDialog(unit)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {expandedBillingUnitId === unit.id && (
                    <TableRow>
                      <TableCell colSpan={8} className="p-3 bg-muted/20">
                        <UnitBillingConfig
                          unitId={unit.id}
                          unitLabel={unit.unit_number}
                          propertyId={propertyId}
                          monthlyRent={unit.monthly_rent ?? undefined}
                        />
                      </TableCell>
                    </TableRow>
                  )}
                  {expandedHistoryUnitId === unit.id && (
                    <TableRow>
                      <TableCell colSpan={8} className="p-3 bg-muted/10">
                        <UnitHistoryPanel
                          unitId={unit.id}
                          unitLabel={unit.unit_number}
                          propertyId={propertyId}
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {selectedUnit ? "Edit House" : "Add New House"}
            </DialogTitle>
            <DialogDescription>
              {selectedUnit 
                ? `Update the details for house ${selectedUnit.unit_number}`
                : `Add a new house to ${propertyName}`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="unitNumber">House Number *</Label>
                <Input
                  id="unitNumber"
                  value={unitNumber}
                  onChange={(e) => setUnitNumber(e.target.value)}
                  placeholder={houseLabelPrefix ? `e.g., ${houseLabelPrefix}-001` : "e.g., HSE-001, A1"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unitLabel">Display Label (optional)</Label>
                <Input
                  id="unitLabel"
                  value={unitLabel}
                  onChange={(e) => setUnitLabel(e.target.value)}
                  placeholder="e.g., R1, Apt 2B"
                />
                <p className="text-xs text-muted-foreground">Shown on invoices & statements</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Unit type</Label>
                <Select value={unitType} onValueChange={setUnitType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[
                      { value: 'bedsitter', label: 'Bedsitter' },
                      { value: 'studio', label: 'Studio' },
                      { value: 'one_bedroom', label: '1 Bedroom' },
                      { value: 'two_bedroom', label: '2 Bedrooms' },
                      { value: 'three_bedroom', label: '3 Bedrooms' },
                      { value: 'shop', label: 'Shop / Retail' },
                      { value: 'office', label: 'Office' },
                      { value: 'penthouse', label: 'Penthouse' },
                      { value: 'standard', label: 'Standard' },
                    ].map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {unitStatuses.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-2">
                <Label htmlFor="bedrooms">Bedrooms</Label>
                <Input id="bedrooms" type="number" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} placeholder="2" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bathrooms">Bathrooms</Label>
                <Input id="bathrooms" type="number" step="0.5" value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} placeholder="1" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="floorNumber">Floor</Label>
                <Input id="floorNumber" type="number" value={floorNumber} onChange={(e) => setFloorNumber(e.target.value)} placeholder="1" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="squareFeet">Size (sqft)</Label>
                <Input id="squareFeet" type="number" value={squareFeet} onChange={(e) => setSquareFeet(e.target.value)} placeholder="850" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="monthlyRent">Monthly Rent (KES)</Label>
                <Input id="monthlyRent" type="number"
                value={monthlyRent}
                onChange={(e) => setMonthlyRent(e.target.value)}
                placeholder="e.g., 25000"
              />
              </div>
              <div className="space-y-2">
                <Label htmlFor="houseDeposit">House Deposit (KES)</Label>
                <Input id="houseDeposit" type="number" value={houseDeposit} onChange={(e) => setHouseDeposit(e.target.value)} placeholder="e.g., 25000" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="waterDeposit">Water Deposit (KES)</Label>
                <Input id="waterDeposit" type="number" value={waterDeposit} onChange={(e) => setWaterDeposit(e.target.value)} placeholder="e.g., 1000" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Furnished status</Label>
              <Select value={furnished} onValueChange={setFurnished}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="furnished">Fully furnished</SelectItem>
                  <SelectItem value="semi_furnished">Semi-furnished</SelectItem>
                  <SelectItem value="unfurnished">Unfurnished</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Corner unit with balcony, freshly painted"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : selectedUnit ? "Update House" : "Add House"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate House</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate house {selectedUnit?.unit_number}? 
              The house will be moved to history and can be reactivated later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk create dialog */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk create units</DialogTitle>
            <DialogDescription>
              Create multiple units at once with sequential numbering. e.g. Prefix "R", start 1, count 21 → R1 to R21
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Prefix</Label>
                <Input value={bulkPrefix} onChange={e => setBulkPrefix(e.target.value.toUpperCase())} placeholder="R" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Start number</Label>
                <Input type="number" min="1" value={bulkStart} onChange={e => setBulkStart(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">How many</Label>
                <Input type="number" min="1" max="100" value={bulkCount} onChange={e => setBulkCount(e.target.value)} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Monthly rent (KES)</Label>
                <Input type="number" value={bulkRent} onChange={e => setBulkRent(e.target.value)} placeholder="e.g. 12000" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Unit type</Label>
                <Select value={unitType} onValueChange={setUnitType}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[{value:'bedsitter',label:'Bedsitter'},{value:'one_bedroom',label:'1 Bedroom'},{value:'two_bedroom',label:'2 Bedrooms'},{value:'studio',label:'Studio'},{value:'standard',label:'Standard'}].map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {bulkPrefix && bulkStart && bulkCount && (
              <div className="p-3 rounded-lg bg-muted/40 text-xs text-muted-foreground">
                Preview: {bulkPrefix}{bulkStart} → {bulkPrefix}{parseInt(bulkStart) + parseInt(bulkCount) - 1} ({bulkCount} units)
                {bulkRent ? ` at KES ${Number(bulkRent).toLocaleString()}/month each` : ''}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(false)}>Cancel</Button>
            <Button
              disabled={bulkCreating || !bulkPrefix || !bulkCount}
              onClick={async () => {
                setBulkCreating(true);
                try {
                  const { data, error } = await supabase.rpc('bulk_create_units', {
                    p_property_id:  propertyId,
                    p_manager_id:   user?.id,
                    p_prefix:       bulkPrefix,
                    p_start_number: parseInt(bulkStart),
                    p_count:        parseInt(bulkCount),
                    p_monthly_rent: bulkRent ? parseFloat(bulkRent) : 0,
                    p_unit_type:    unitType,
                    p_bedrooms:     1,
                  });
                  if (error) throw error;
                  toast({ title: `${data} units created`, description: `${bulkPrefix}${bulkStart} to ${bulkPrefix}${parseInt(bulkStart) + parseInt(bulkCount) - 1}` });
                  setBulkOpen(false);
                  fetchUnits();
                  onUnitsChange?.();
} catch (err: unknown) {
  toast({ title: 'Bulk create failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
                }
                setBulkCreating(false);
              }}
            >
              {bulkCreating ? 'Creating…' : `Create ${bulkCount} units`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
