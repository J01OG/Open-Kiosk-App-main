import { useState } from "react";
import { Plus, Trash2, Edit, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { useFirebaseCoupons } from "@/hooks/useFirebaseCoupons";
import { useFirebaseProducts } from "@/hooks/useFirebaseProducts";
import { Coupon, DiscountType } from "@/types/coupon";
import { Badge } from "@/components/ui/badge";

export default function AdminCoupons() {
  const { coupons, addCoupon, updateCoupon, deleteCoupon } = useFirebaseCoupons();
  const { products } = useFirebaseProducts();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

  // Form State
  const [code, setCode] = useState("");
  const [type, setType] = useState<DiscountType>("PERCENTAGE");
  const [value, setValue] = useState("");
  const [minPurchase, setMinPurchase] = useState("");
  const [maxDiscount, setMaxDiscount] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [applyToAll, setApplyToAll] = useState(true);

  const resetForm = () => {
    setCode("");
    setType("PERCENTAGE");
    setValue("");
    setMinPurchase("");
    setMaxDiscount("");
    setExpiryDate("");
    setIsActive(true);
    setSelectedProducts([]);
    setApplyToAll(true);
    setEditingCoupon(null);
  };

  const handleEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setCode(coupon.code);
    setType(coupon.type);
    setValue(coupon.value.toString());
    setMinPurchase(coupon.minPurchase?.toString() || "");
    setMaxDiscount(coupon.maxDiscount?.toString() || "");
    setExpiryDate(coupon.expiryDate || "");
    setIsActive(coupon.isActive);
    setSelectedProducts(coupon.applicableProductIds || []);
    setApplyToAll(!coupon.applicableProductIds || coupon.applicableProductIds.length === 0);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!code || !value) return;

    const couponData = {
      code: code.trim().toUpperCase(),
      type,
      value: parseFloat(value),
      minPurchase: minPurchase ? parseFloat(minPurchase) : undefined,
      maxDiscount: maxDiscount ? parseFloat(maxDiscount) : undefined,
      expiryDate: expiryDate || undefined,
      isActive,
      applicableProductIds: applyToAll ? [] : selectedProducts
    };

    if (editingCoupon) {
      await updateCoupon(editingCoupon.id, couponData);
    } else {
      await addCoupon(couponData);
    }
    setIsDialogOpen(false);
    resetForm();
  };

  const toggleProductSelection = (productId: string) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Coupon Management</h2>
        <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Create Coupon
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Coupons</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Min Purchase</TableHead>
                <TableHead>Used</TableHead>
                <TableHead>Applicability</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coupons.map((coupon) => (
                <TableRow key={coupon.id}>
                  <TableCell className="font-mono font-bold flex items-center gap-2">
                    <Tag className="w-4 h-4 text-blue-500" />
                    {coupon.code}
                  </TableCell>
                  <TableCell>
                    {coupon.type === 'PERCENTAGE' ? `${coupon.value}%` : `Flat ${coupon.value}`}
                  </TableCell>
                  <TableCell>{coupon.minPurchase || '-'}</TableCell>
                  <TableCell>{coupon.usageCount || 0}</TableCell>
                  <TableCell>
                    {(!coupon.applicableProductIds || coupon.applicableProductIds.length === 0) 
                      ? <Badge variant="secondary">All Products</Badge>
                      : <Badge variant="outline">{coupon.applicableProductIds.length} Products</Badge>
                    }
                  </TableCell>
                  <TableCell>{coupon.expiryDate || 'Never'}</TableCell>
                  <TableCell>
                    <Switch 
                      checked={coupon.isActive} 
                      onCheckedChange={(checked) => updateCoupon(coupon.id, { isActive: checked })}
                    />
                  </TableCell>
                  <TableCell className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(coupon)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-500" onClick={() => deleteCoupon(coupon.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {coupons.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-4 text-muted-foreground">
                    No coupons found. Create one to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingCoupon ? "Edit Coupon" : "Create New Coupon"}</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Coupon Code</Label>
              <Input 
                value={code} 
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. SUMMER25" 
              />
            </div>
            
            <div className="space-y-2">
              <Label>Discount Type</Label>
              <Select value={type} onValueChange={(v: DiscountType) => setType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                  <SelectItem value="FIXED">Fixed Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Value</Label>
              <Input 
                type="number" 
                value={value} 
                onChange={(e) => setValue(e.target.value)} 
                placeholder={type === 'PERCENTAGE' ? "e.g. 10" : "e.g. 100"} 
              />
            </div>

            <div className="space-y-2">
              <Label>Min Purchase (Optional)</Label>
              <Input 
                type="number" 
                value={minPurchase} 
                onChange={(e) => setMinPurchase(e.target.value)} 
                placeholder="0" 
              />
            </div>

            <div className="space-y-2">
              <Label>Max Discount (Optional)</Label>
              <Input 
                type="number" 
                value={maxDiscount} 
                onChange={(e) => setMaxDiscount(e.target.value)} 
                placeholder="Limit for % discount" 
              />
            </div>

            <div className="space-y-2">
              <Label>Expiry Date (Optional)</Label>
              <Input 
                type="date" 
                value={expiryDate} 
                onChange={(e) => setExpiryDate(e.target.value)} 
              />
            </div>

            <div className="col-span-2 space-y-4 border rounded-md p-4 mt-2">
               <div className="flex items-center space-x-2">
                 <Switch 
                   id="apply-all" 
                   checked={applyToAll} 
                   onCheckedChange={setApplyToAll} 
                 />
                 <Label htmlFor="apply-all" className="font-semibold">Apply to All Products</Label>
               </div>

               {!applyToAll && (
                 <div className="space-y-2">
                   <Label>Select Applicable Products</Label>
                   <Input placeholder="Filter products..." className="mb-2 h-8 text-sm" />
                   <ScrollArea className="h-[200px] border rounded-md p-2">
                     {products.map(product => (
                       <div key={product.id} className="flex items-center space-x-2 py-1.5 border-b last:border-0">
                         <Checkbox 
                           id={`prod-${product.id}`}
                           checked={selectedProducts.includes(product.id)}
                           onCheckedChange={() => toggleProductSelection(product.id)}
                         />
                         <Label htmlFor={`prod-${product.id}`} className="text-sm cursor-pointer flex-1">
                           {product.title} <span className="text-gray-400 text-xs">({product.price})</span>
                         </Label>
                       </div>
                     ))}
                   </ScrollArea>
                 </div>
               )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save Coupon</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}