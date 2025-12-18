import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Search, ShoppingCart, Trash2, RotateCcw, Wallet, Home, Tag, CreditCard, Banknote, Split } from "lucide-react";

import { useFirebaseProducts } from "@/hooks/useFirebaseProducts";
import { useFirebaseReports } from "@/hooks/useFirebaseReports";
import { useFirebaseCoupons } from "@/hooks/useFirebaseCoupons";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { useToast } from "@/hooks/use-toast";
import { Product, CartItem } from "@/types/product";

// Color patterns for list items
const ROW_COLORS = [
  "bg-blue-50 hover:bg-blue-100",
  "bg-green-50 hover:bg-green-100",
  "bg-purple-50 hover:bg-purple-100",
  "bg-orange-50 hover:bg-orange-100",
  "bg-pink-50 hover:bg-pink-100",
  "bg-teal-50 hover:bg-teal-100",
];

const FastPos = () => {
  const navigate = useNavigate();
  const { products } = useFirebaseProducts();
  const { recordSale, recordCashTransaction, getCashTransactions, processReturn, getOrderByNumber } = useFirebaseReports();
  const { validateCoupon, incrementUsage } = useFirebaseCoupons();
  const { settings } = useStoreSettings();
  const { toast } = useToast();

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [inputQty, setInputQty] = useState<string>("1");
  const [inputPrice, setInputPrice] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Coupon State
  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [appliedCouponId, setAppliedCouponId] = useState<string | null>(null);
  const [couponMessage, setCouponMessage] = useState("");

  // Payment State
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI' | 'SPLIT'>('CASH');
  const [splitCash, setSplitCash] = useState("");
  const [splitUpi, setSplitUpi] = useState("");
  
  // Money Management State
  const [cashModalOpen, setCashModalOpen] = useState(false);
  const [cashType, setCashType] = useState<'IN' | 'OUT'>('IN');
  const [cashAmount, setCashAmount] = useState("");
  const [cashReason, setCashReason] = useState("");
  const [dailyCashLogs, setDailyCashLogs] = useState<any[]>([]);

  // Return State
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnOrderNum, setReturnOrderNum] = useState("");
  const [returnOrderData, setReturnOrderData] = useState<any>(null);
  const [returnItems, setReturnItems] = useState<Record<string, number>>({});

  // Filter Products
  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.id.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 100); 
  }, [products, searchQuery]);

  // --- Cart Logic ---
  const addToCart = (product: Product, qty: number, priceOverride?: number) => {
    if ((product.stock || 0) < qty && !product.soldByWeight) {
       toast({ title: "Stock Warning", description: "Insufficient stock", variant: "destructive" });
       return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id 
          ? { ...item, quantity: item.quantity + qty }
          : item
        );
      }
      return [...prev, { product, quantity: qty }];
    });
    
    // Reset coupon when cart changes
    if(appliedCouponId) {
        setDiscount(0);
        setAppliedCouponId(null);
        setCouponMessage("Cart updated, please re-apply coupon if valid.");
        setCouponCode("");
    }
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
    if(appliedCouponId) {
        setDiscount(0);
        setAppliedCouponId(null);
        setCouponCode("");
    }
  };

  const clearCart = () => {
    setCart([]);
    setDiscount(0);
    setAppliedCouponId(null);
    setCouponCode("");
    setCouponMessage("");
  };

  const calculateTotal = () => {
    return cart.reduce((acc, item) => {
      const price = item.product.soldByWeight 
        ? (item.product.price / 1000) * item.quantity
        : item.product.price * item.quantity;
      return acc + price;
    }, 0);
  };

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setInputQty(product.soldByWeight ? "" : "1");
    setInputPrice(product.price.toString());
    setIsDialogOpen(true);
  };

  const confirmAddItem = () => {
    if (!selectedProduct) return;
    const qty = parseFloat(inputQty);
    const price = parseFloat(inputPrice);
    
    if (isNaN(qty) || qty <= 0) {
      toast({ title: "Invalid Quantity", variant: "destructive" });
      return;
    }

    const productToAdd = { ...selectedProduct, price: price };
    addToCart(productToAdd, qty);
    setIsDialogOpen(false);
    setSearchQuery(""); 
    document.getElementById('pos-search')?.focus();
  };

  // --- Coupon Logic ---
  const applyCoupon = () => {
      if(!couponCode) return;
      const result = validateCoupon(couponCode, cart, calculateTotal());
      if(result.isValid) {
          setDiscount(result.discount);
          setAppliedCouponId(result.couponId || null);
          setCouponMessage("Coupon Applied!");
          toast({ title: "Success", description: `Saved ${result.discount.toFixed(2)}` });
      } else {
          setDiscount(0);
          setAppliedCouponId(null);
          setCouponMessage(result.message || "Invalid Coupon");
          toast({ title: "Error", description: result.message, variant: "destructive" });
      }
  };

  // --- Payment Logic ---
  const openPaymentModal = () => {
      if (cart.length === 0) return;
      setSplitCash("");
      setSplitUpi("");
      setPaymentMode('CASH');
      setPaymentModalOpen(true);
  };

  const getFinalTotal = () => Math.max(0, calculateTotal() - discount);

  const handleSplitCalculation = (type: 'CASH' | 'UPI', value: string) => {
      const total = getFinalTotal();
      const val = parseFloat(value) || 0;
      
      if(type === 'CASH') {
          setSplitCash(value);
          setSplitUpi((Math.max(0, total - val)).toFixed(2));
      } else {
          setSplitUpi(value);
          setSplitCash((Math.max(0, total - val)).toFixed(2));
      }
  };

  const processPayment = async () => {
    const total = getFinalTotal();
    let paymentDetails = undefined;
    
    if(paymentMode === 'SPLIT') {
        const cash = parseFloat(splitCash) || 0;
        const upi = parseFloat(splitUpi) || 0;
        if(Math.abs((cash + upi) - total) > 0.5) { // 0.5 margin for rounding
            toast({ title: "Mismatch", description: "Split amounts do not match total", variant: "destructive" });
            return;
        }
        paymentDetails = { cash, upi };
    }

    try {
      await recordSale(
          cart, 
          total, 
          settings?.currency || 'INR', 
          undefined, 
          discount, 
          paymentMode === 'SPLIT' ? 'Split (Cash+UPI)' : paymentMode,
          appliedCouponId ? couponCode : undefined,
          paymentDetails
      );
      
      if(appliedCouponId) {
          await incrementUsage(appliedCouponId);
      }
      
      clearCart();
      setPaymentModalOpen(false);
      toast({ title: "Order Completed", description: `Total: ${total.toFixed(2)}` });
    } catch (e) {
      // Error handled in hook
    }
  };


  // --- Money & Return Logic (Existing) ---
  const handleCashTransaction = async () => {
    const amount = parseFloat(cashAmount);
    if (!amount || !cashReason) return;
    
    const success = await recordCashTransaction(cashType, amount, cashReason);
    if (success) {
      setCashAmount("");
      setCashReason("");
      fetchCashLogs();
    }
  };

  const fetchCashLogs = async () => {
    const logs = await getCashTransactions(new Date().toISOString().split('T')[0]);
    setDailyCashLogs(logs);
  };

  const searchReturnOrder = async () => {
    const order = await getOrderByNumber(returnOrderNum);
    if (order) {
      setReturnOrderData(order);
      setReturnItems({});
    } else {
      toast({ title: "Order Not Found", variant: "destructive" });
      setReturnOrderData(null);
    }
  };

  const handleReturnProcess = async () => {
    if (!returnOrderData) return;
    const itemsToReturn: CartItem[] = [];
    let refundTotal = 0;

    Object.entries(returnItems).forEach(([prodId, qty]) => {
      if (qty > 0) {
        const originalItem = returnOrderData.items.find((i: any) => i.productId === prodId);
        if (originalItem) {
          itemsToReturn.push({
            product: { id: prodId, title: originalItem.title, price: originalItem.price } as Product,
            quantity: qty
          });
          const unitPrice = originalItem.total / originalItem.quantity;
          refundTotal += unitPrice * qty;
        }
      }
    });

    if (itemsToReturn.length === 0) return;
    await processReturn(returnOrderData.orderNumber, itemsToReturn, refundTotal);
    setReturnModalOpen(false);
    setReturnOrderData(null);
    setReturnOrderNum("");
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Left Pane: Product List */}
      <div className="flex-1 flex flex-col p-4 gap-4 max-w-[60%] border-r border-gray-300 bg-white shadow-xl z-10">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <Home className="w-5 h-5" />
          </Button>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-500" />
            <Input 
              id="pos-search"
              placeholder="Search products (Name, ID)..." 
              className="pl-10 h-12 text-lg"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto rounded-md border">
          <Table>
            <TableHeader className="bg-gray-100 sticky top-0 z-10 shadow-sm">
              <TableRow>
                <TableHead className="font-bold text-gray-700">Product</TableHead>
                <TableHead className="w-[120px] font-bold text-gray-700">Price</TableHead>
                <TableHead className="w-[100px] font-bold text-gray-700">Stock</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product, index) => (
                <TableRow 
                  key={product.id} 
                  className={`cursor-pointer transition-colors ${ROW_COLORS[index % ROW_COLORS.length]}`}
                  onClick={() => handleProductClick(product)}
                >
                  <TableCell className="font-medium text-base py-3">
                    {product.title}
                    {product.soldByWeight && <Badge variant="secondary" className="ml-2 bg-white/50">Weight</Badge>}
                  </TableCell>
                  <TableCell className="text-base font-semibold text-gray-800">
                    {settings?.currency || '₹'}{product.price}/{product.soldByWeight ? 'kg' : 'unit'}
                  </TableCell>
                  <TableCell>
                    <span className={`font-bold px-2 py-1 rounded ${
                        (product.stock || 0) < 5 ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700"
                    }`}>
                      {product.stock}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Right Pane: Cart & Actions */}
      <div className="w-[40%] flex flex-col bg-gray-50 h-full">
        {/* Top Bar Actions */}
        <div className="p-4 bg-white border-b flex justify-between items-center shadow-sm">
           <h2 className="font-bold text-lg flex items-center gap-2 text-gray-800">
             <ShoppingCart className="w-5 h-5 text-blue-600" /> Current Order
           </h2>
           <div className="flex gap-2">
             <Button variant="outline" size="sm" onClick={() => { setCashModalOpen(true); fetchCashLogs(); }}>
               <Wallet className="w-4 h-4 mr-2 text-orange-500" /> Cash
             </Button>
             <Button variant="destructive" size="sm" onClick={() => setReturnModalOpen(true)}>
               <RotateCcw className="w-4 h-4 mr-2" /> Return
             </Button>
           </div>
        </div>

        {/* Cart Items */}
        <ScrollArea className="flex-1 p-4">
           {cart.length === 0 ? (
             <div className="text-center text-gray-400 mt-20">
               <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShoppingCart className="w-10 h-10 text-gray-400" />
               </div>
               <p className="text-lg font-medium">No items added</p>
               <p className="text-sm">Scan or click products to add</p>
             </div>
           ) : (
             <div className="space-y-3">
               {cart.map((item, idx) => (
                 <Card key={`${item.product.id}-${idx}`} className="bg-white border-l-4 border-l-blue-500 shadow-sm">
                   <CardContent className="p-3 flex justify-between items-center">
                     <div className="flex-1">
                       <h4 className="font-semibold text-gray-800 line-clamp-1">{item.product.title}</h4>
                       <div className="text-sm text-gray-500 mt-1">
                         <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-700 font-medium">
                            {item.quantity} {item.product.soldByWeight ? 'g' : 'x'}
                         </span>
                         <span className="mx-2 text-gray-300">|</span>
                         @ {item.product.price}
                       </div>
                     </div>
                     <div className="text-right mr-4">
                         <div className="font-bold text-lg text-gray-800">
                           {(item.product.soldByWeight 
                             ? (item.product.price / 1000 * item.quantity) 
                             : item.product.price * item.quantity).toFixed(2)}
                         </div>
                     </div>
                     <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => removeFromCart(item.product.id)}>
                       <Trash2 className="w-5 h-5" />
                     </Button>
                   </CardContent>
                 </Card>
               ))}
             </div>
           )}
        </ScrollArea>

        {/* Footer Section */}
        <div className="bg-white p-4 border-t shadow-[0_-4px_15px_-3px_rgba(0,0,0,0.1)] z-20">
           {/* Coupon Input */}
           <div className="flex gap-2 mb-4">
               <div className="relative flex-1">
                   <Tag className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                   <Input 
                        placeholder="Coupon Code" 
                        value={couponCode} 
                        onChange={e => setCouponCode(e.target.value.toUpperCase())}
                        className="pl-9 uppercase"
                   />
               </div>
               <Button variant="secondary" onClick={applyCoupon}>Apply</Button>
           </div>
           {couponMessage && (
               <div className={`text-xs mb-3 font-medium ${appliedCouponId ? 'text-green-600' : 'text-red-500'}`}>
                   {couponMessage}
               </div>
           )}

           {/* Totals */}
           <div className="space-y-2 mb-4">
               <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>{settings?.currency} {calculateTotal().toFixed(2)}</span>
               </div>
               {discount > 0 && (
                   <div className="flex justify-between text-green-600 font-medium">
                        <span>Discount</span>
                        <span>-{settings?.currency} {discount.toFixed(2)}</span>
                   </div>
               )}
               <div className="flex justify-between text-3xl font-bold text-gray-900 mt-2">
                    <span>Total</span>
                    <span>{settings?.currency} {getFinalTotal().toFixed(2)}</span>
               </div>
           </div>
           
           {/* Actions */}
           <div className="grid grid-cols-3 gap-3">
             <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 h-12" onClick={clearCart}>
               Clear
             </Button>
             <Button className="bg-blue-600 hover:bg-blue-700 h-12 col-span-2 text-lg font-bold shadow-lg shadow-blue-200" onClick={openPaymentModal}>
               Confirm Pay
             </Button>
           </div>
        </div>
      </div>

      {/* --- Dialogs --- */}

      {/* Payment Selection Dialog */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="sm:max-w-md">
           <DialogHeader>
               <DialogTitle className="text-xl">Select Payment Mode</DialogTitle>
           </DialogHeader>
           
           <div className="grid gap-6 py-4">
               <div className="text-center bg-gray-50 p-4 rounded-lg">
                   <p className="text-sm text-gray-500">Amount to Pay</p>
                   <p className="text-3xl font-bold text-blue-600">{settings?.currency} {getFinalTotal().toFixed(2)}</p>
               </div>

               <RadioGroup value={paymentMode} onValueChange={(v: any) => setPaymentMode(v)} className="grid grid-cols-3 gap-4">
                  <div>
                      <RadioGroupItem value="CASH" id="mode-cash" className="peer sr-only" />
                      <Label htmlFor="mode-cash" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent peer-data-[state=checked]:border-blue-600 peer-data-[state=checked]:text-blue-600 cursor-pointer">
                          <Banknote className="mb-2 h-6 w-6" />
                          Cash
                      </Label>
                  </div>
                  <div>
                      <RadioGroupItem value="UPI" id="mode-upi" className="peer sr-only" />
                      <Label htmlFor="mode-upi" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent peer-data-[state=checked]:border-blue-600 peer-data-[state=checked]:text-blue-600 cursor-pointer">
                          <CreditCard className="mb-2 h-6 w-6" />
                          UPI
                      </Label>
                  </div>
                  <div>
                      <RadioGroupItem value="SPLIT" id="mode-split" className="peer sr-only" />
                      <Label htmlFor="mode-split" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent peer-data-[state=checked]:border-blue-600 peer-data-[state=checked]:text-blue-600 cursor-pointer">
                          <Split className="mb-2 h-6 w-6" />
                          Combo
                      </Label>
                  </div>
               </RadioGroup>

               {paymentMode === 'SPLIT' && (
                   <div className="space-y-4 border-t pt-4">
                       <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-2">
                               <Label>Cash Amount</Label>
                               <Input 
                                    type="number" 
                                    value={splitCash} 
                                    onChange={e => handleSplitCalculation('CASH', e.target.value)}
                                    placeholder="0.00" 
                               />
                           </div>
                           <div className="space-y-2">
                               <Label>UPI Amount</Label>
                               <Input 
                                    type="number" 
                                    value={splitUpi} 
                                    onChange={e => handleSplitCalculation('UPI', e.target.value)}
                                    placeholder="0.00" 
                               />
                           </div>
                       </div>
                   </div>
               )}
           </div>

           <DialogFooter>
               <Button onClick={processPayment} className="w-full h-12 text-lg">Complete Order</Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Quantity/Price Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedProduct?.title}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">
                {selectedProduct?.soldByWeight ? "Weight (g)" : "Quantity"}
              </Label>
              <Input
                value={inputQty}
                onChange={(e) => setInputQty(e.target.value)}
                className="col-span-3"
                type="number"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Price</Label>
              <Input
                value={inputPrice}
                onChange={(e) => setInputPrice(e.target.value)}
                className="col-span-3"
                type="number"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={confirmAddItem}>Add to Order</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cash Management Dialog */}
      <Dialog open={cashModalOpen} onOpenChange={setCashModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cash Management</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="add">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="add">Transaction</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            <TabsContent value="add" className="space-y-4">
               <div className="flex gap-4 pt-4">
                 <Button 
                    variant={cashType === 'IN' ? "default" : "outline"} 
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => setCashType('IN')}
                 >
                   Cash In
                 </Button>
                 <Button 
                    variant={cashType === 'OUT' ? "default" : "outline"} 
                    className="flex-1 bg-red-600 hover:bg-red-700"
                    onClick={() => setCashType('OUT')}
                 >
                   Cash Out
                 </Button>
               </div>
               <div className="space-y-2">
                 <Label>Amount</Label>
                 <Input type="number" value={cashAmount} onChange={e => setCashAmount(e.target.value)} placeholder="0.00" />
               </div>
               <div className="space-y-2">
                 <Label>Reason</Label>
                 <Input value={cashReason} onChange={e => setCashReason(e.target.value)} placeholder="e.g. Opening float, Vendor payment" />
               </div>
               <Button className="w-full" onClick={handleCashTransaction}>Record Transaction</Button>
            </TabsContent>
            <TabsContent value="history">
               <ScrollArea className="h-[300px]">
                 <Table>
                   <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Amount</TableHead><TableHead>Reason</TableHead></TableRow></TableHeader>
                   <TableBody>
                     {dailyCashLogs.map((log: any) => (
                       <TableRow key={log.id}>
                         <TableCell className={log.type === 'IN' ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>{log.type}</TableCell>
                         <TableCell>{log.amount}</TableCell>
                         <TableCell>{log.reason}</TableCell>
                       </TableRow>
                     ))}
                   </TableBody>
                 </Table>
               </ScrollArea>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Return Modal */}
      <Dialog open={returnModalOpen} onOpenChange={setReturnModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Return Order</DialogTitle></DialogHeader>
          <div className="flex gap-2">
            <Input 
              placeholder="Scan/Enter Order Number" 
              value={returnOrderNum} 
              onChange={e => setReturnOrderNum(e.target.value)} 
            />
            <Button onClick={searchReturnOrder}>Search</Button>
          </div>
          
          {returnOrderData && (
            <div className="space-y-4 mt-4">
              <div className="text-sm text-gray-500">Order found: {returnOrderData.date} | Total: {returnOrderData.total}</div>
              <ScrollArea className="h-[200px] border rounded p-2">
                {returnOrderData.items.map((item: any) => (
                  <div key={item.productId} className="flex justify-between items-center py-2 border-b last:border-0">
                    <div className="flex-1">
                      <div className="font-medium">{item.title}</div>
                      <div className="text-xs text-gray-500">Qty: {item.quantity} | Price: {item.total}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label>Return:</Label>
                      <Input 
                        type="number" 
                        className="w-16 h-8" 
                        max={item.quantity} 
                        min={0}
                        value={returnItems[item.productId] || 0}
                        onChange={(e) => setReturnItems(prev => ({...prev, [item.productId]: parseFloat(e.target.value) || 0}))}
                      />
                    </div>
                  </div>
                ))}
              </ScrollArea>
              <Button variant="destructive" className="w-full" onClick={handleReturnProcess}>Confirm Return & Restore Stock</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FastPos;