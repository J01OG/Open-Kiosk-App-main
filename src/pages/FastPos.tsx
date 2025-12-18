// src/pages/FastPos.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, ShoppingCart, Trash2, RotateCcw, Wallet, Home, Plus, Minus, Calculator } from "lucide-react";

import { useFirebaseProducts } from "@/hooks/useFirebaseProducts";
import { useFirebaseReports } from "@/hooks/useFirebaseReports";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { useToast } from "@/hooks/use-toast";
import { Product, CartItem } from "@/types/product";

const FastPos = () => {
  const navigate = useNavigate();
  const { products, loading: productsLoading } = useFirebaseProducts();
  const { recordSale, recordCashTransaction, getCashTransactions, processReturn, getOrderByNumber } = useFirebaseReports();
  const { settings } = useStoreSettings();
  const { toast } = useToast();

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [inputQty, setInputQty] = useState<string>("1");
  const [inputPrice, setInputPrice] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
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
  const [returnItems, setReturnItems] = useState<Record<string, number>>({}); // productId -> qty to return

  // Filter Products
  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.id.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 100); // Limit display for performance
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
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const clearCart = () => setCart([]);

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

    // Temporarily modify product price if overridden
    const productToAdd = { ...selectedProduct, price: price };
    addToCart(productToAdd, qty);
    setIsDialogOpen(false);
    setSearchQuery(""); // Auto clear search for fast entry
    document.getElementById('pos-search')?.focus();
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    const total = calculateTotal();
    try {
      await recordSale(cart, total, settings?.currency || 'INR', undefined, 0, 'Cash');
      clearCart();
      toast({ title: "Order Completed", description: `Total: ${total.toFixed(2)}` });
    } catch (e) {
      // Error handled in hook
    }
  };

  // --- Cash Management Logic ---
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

  // --- Return Logic ---
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
      <div className="flex-1 flex flex-col p-4 gap-4 max-w-[60%] border-r border-gray-300 bg-white">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <Home className="w-5 h-5" />
          </Button>
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
            <Input 
              id="pos-search"
              placeholder="Search products (Name, ID)..." 
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto rounded-md border">
          <Table>
            <TableHeader className="bg-gray-50 sticky top-0 z-10">
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="w-[100px]">Price</TableHead>
                <TableHead className="w-[100px]">Stock</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map(product => (
                <TableRow 
                  key={product.id} 
                  className="cursor-pointer hover:bg-blue-50"
                  onClick={() => handleProductClick(product)}
                >
                  <TableCell className="font-medium">
                    {product.title}
                    {product.soldByWeight && <Badge variant="secondary" className="ml-2">Weight</Badge>}
                  </TableCell>
                  <TableCell>
                    {settings?.currency || '₹'}{product.price}/{product.soldByWeight ? 'kg' : 'unit'}
                  </TableCell>
                  <TableCell>
                    <span className={(product.stock || 0) < 5 ? "text-red-500 font-bold" : ""}>
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
           <h2 className="font-bold text-lg flex items-center gap-2">
             <ShoppingCart className="w-5 h-5" /> Current Order
           </h2>
           <div className="flex gap-2">
             <Button variant="outline" size="sm" onClick={() => { setCashModalOpen(true); fetchCashLogs(); }}>
               <Wallet className="w-4 h-4 mr-2" /> Cash
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
               <Calculator className="w-16 h-16 mx-auto mb-4 opacity-20" />
               <p>No items added</p>
             </div>
           ) : (
             <div className="space-y-3">
               {cart.map((item, idx) => (
                 <Card key={`${item.product.id}-${idx}`} className="bg-white">
                   <CardContent className="p-3 flex justify-between items-center">
                     <div className="flex-1">
                       <h4 className="font-medium line-clamp-1">{item.product.title}</h4>
                       <div className="text-sm text-gray-500">
                         {item.quantity} {item.product.soldByWeight ? 'g' : 'x'} @ {item.product.price}
                       </div>
                     </div>
                     <div className="font-bold mr-4">
                       {(item.product.soldByWeight 
                         ? (item.product.price / 1000 * item.quantity) 
                         : item.product.price * item.quantity).toFixed(2)}
                     </div>
                     <Button variant="ghost" size="sm" className="text-red-500" onClick={() => removeFromCart(item.product.id)}>
                       <Trash2 className="w-4 h-4" />
                     </Button>
                   </CardContent>
                 </Card>
               ))}
             </div>
           )}
        </ScrollArea>

        {/* Checkout Section */}
        <div className="bg-white p-4 border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
           <div className="flex justify-between mb-2 text-sm text-gray-600">
             <span>Items</span>
             <span>{cart.length}</span>
           </div>
           <div className="flex justify-between mb-4 text-2xl font-bold">
             <span>Total</span>
             <span>{settings?.currency || '₹'} {calculateTotal().toFixed(2)}</span>
           </div>
           
           <div className="grid grid-cols-2 gap-3">
             <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" onClick={clearCart}>
               Clear
             </Button>
             <Button className="bg-green-600 hover:bg-green-700 h-12 text-lg" onClick={handleCheckout}>
               Confirm Pay
             </Button>
           </div>
        </div>
      </div>

      {/* --- Dialogs --- */}

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