import { Link } from "react-router-dom";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { MapPin, ChevronDown, Eye, Layers, Pencil, Trash2 } from "lucide-react";
import { CATEGORY_BY_KEY } from "@/shared/constants/propertyTypes";

interface Property {
  id: string;
  name: string;
  address: string;
  house_number: string | null;
  units: number;
  occupied: number;
  revenue: number;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  category_key?: string;
  property_type?: string;
  number_of_floors?: number;
  rent_per_house?: number;
  house_label_prefix?: string;
  payment_details?: string;
}

interface Tenant {
  id: string;
  name: string;
  email: string;
  unit: string | null;
  property_id: string | null;
  status: string;
}

interface PropertyCardProps {
  property: Property;
  index: number;
  tenants: Tenant[];
  isSelected: boolean;
  formatCurrency: (amount: number) => string;
  onEdit: (property: Property) => void;
  onDelete: (property: Property) => void;
}

const getCategoryLabel = (property: Property): string => {
  const catKey = property.category_key || property.property_type || "residential_flat";
  const cat = CATEGORY_BY_KEY[catKey];
  if (cat) return cat.name;
  const legacyLabels: Record<string, string> = {
    flat: "Flat / Apartment Block",
    villa: "Villa",
    bungalow: "Bungalow / Maisonette",
    mixed_use: "Mixed Use",
    apartment: "Flat / Apartment Block",
    townhouse: "Townhouse",
    commercial: "Office / Commercial",
  };
  return legacyLabels[catKey] || catKey;
};

export const PropertyCard = ({
  property,
  index,
  tenants,
  isSelected,
  formatCurrency,
  onEdit,
  onDelete,
}: PropertyCardProps) => {
  const occupancyRate = property.units > 0 ? (property.occupied / property.units) * 100 : 0;
  const propertyTenants = tenants.filter((t) => t.property_id === property.id);
  const propertyType = (property as { property_type?: string }).property_type || "flat";
  const floors = (property as { number_of_floors?: number }).number_of_floors || 1;
  const rentPerHouse = (property as { rent_per_house?: number }).rent_per_house || 0;

  return (
    <Card
      className={`overflow-hidden transition-all duration-200 animate-fade-in hover:shadow-md ${isSelected ? "ring-2 ring-primary" : ""}`}
      style={{ animationDelay: `${index * 30}ms` }}
    >
      <CardContent className="p-0">
        <div className="flex items-stretch">
          <div className="w-24 h-24 flex-shrink-0 overflow-hidden">
            <img
              src={property.image_url || "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=200&h=200&fit=crop"}
              alt={property.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 p-3 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link to={`/properties/${property.id}`} className="font-heading font-semibold text-foreground text-sm hover:text-primary transition-colors truncate block">
                  {property.name}
                </Link>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  {property.address}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0">
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem asChild>
                    <Link to={`/properties/${property.id}`} className="flex items-center gap-2">
                      <Eye className="h-4 w-4" /> View Details
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to={`/properties/${property.id}?tab=units`} className="flex items-center gap-2">
                      <Layers className="h-4 w-4" /> Manage Houses
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEdit(property)}>
                    <Pencil className="h-4 w-4 mr-2" /> Edit Property
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDelete(property)} className="text-destructive focus:text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" /> Deactivate
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {getCategoryLabel(property)}
              </Badge>
              <span className="text-xs text-muted-foreground">{property.units} units</span>
              <span className="text-xs text-muted-foreground">{propertyTenants.length} tenants</span>
              <span className={`text-xs font-medium ${occupancyRate >= 80 ? "text-emerald-600" : occupancyRate >= 50 ? "text-amber-600" : "text-red-500"}`}>
                {occupancyRate.toFixed(0)}% occupied
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-t border-border text-xs">
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground">{floors} floor{floors !== 1 ? "s" : ""}</span>
            {rentPerHouse > 0 && (
              <span className="text-muted-foreground">Rent: {formatCurrency(rentPerHouse)}</span>
            )}
          </div>
          <span className="font-medium text-foreground">{formatCurrency(property.revenue)}</span>
        </div>
      </CardContent>
    </Card>
  );
};
