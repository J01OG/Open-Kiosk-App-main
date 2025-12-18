import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowLeft, Receipt, Printer, Check, CreditCard, Banknote, Tag } from "lucide-react";
import { CartItem } from "@/types/product";
import { useCurrentCurrency } from "@/hooks/useSettings";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { useFirebaseProducts } from "@/hooks/useFirebaseProducts";
import { esp32Printer } from "@/services/esp32PrinterService";
import { useToast } from "@/hooks/use-toast";
import { useFirebaseReports } from "@/hooks/useFirebaseReports";
import { useFirebaseCoupons } from "@/hooks/useFirebaseCoupons";
import { pdfReceiptService } from "@/services/pdfReceiptService";
import { getFirebaseDb } from "@/services/firebase";
import { doc, getDoc } from "firebase/firestore";

interface CheckoutProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (item: CartItem, quantity: number) => void;
  onClearCart: () => void;
  onComplete: () => void;
}

const Checkout = ({ isOpen, onClose, cartItems, onClearCart, onComplete }: CheckoutProps) => {
  const [isCompleted, setIsCompleted] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentProcessed, setPaymentProcessed] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [discount, setDiscount] = useState(0);
  const [couponCode, setCouponCode] = useState("");
  const [couponMessage, setCouponMessage] = useState("");
  const [appliedCouponId, setAppliedCouponId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [cashGiven, setCashGiven] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  
  const currentCurrency = useCurrentCurrency();
  const { settings } = useStoreSettings();
  const { toast } = useToast();
  const { recordSale, generateOrderNumber } = useFirebaseReports();
  const { updateProduct } = useFirebaseProducts();
  const { validateCoupon, incrementUsage } = useFirebaseCoupons();

  useEffect(() => {
    if (isOpen && !orderNumber) {
      const fetchOrderNumber = async () => {
        try {
          const newOrderNumber = await generateOrderNumber();
          setOrderNumber(newOrderNumber);
        } catch (error) {
          const now = new Date();
          setOrderNumber(`${now.getFullYear().toString().slice(-2)}${now.getMonth() + 1}${now.getDate()}${now.getHours()}${now.getMinutes()}${now.getSeconds()}`);
        }
      };
      fetchOrderNumber();
    }
  }, [isOpen, orderNumber, generateOrderNumber]);

  const calculateItemPrice = (item: CartItem) => {
    if (item.product.soldByWeight) {
      return (item.product.price / 1000) * item.quantity;
    }
    return item.product.price * item.quantity;
  };

  const getTotalPrice = () => {
    return cartItems.reduce((total, item) => total + calculateItemPrice(item), 0);
  };

  const handleApplyCoupon = () => {
    if (!couponCode) return;
    const result = validateCoupon(couponCode, cartItems, getTotalPrice());
    
    if (result.isValid) {
        setDiscount(result.discount);
        setAppliedCouponId(result.couponId || null);
        setCouponMessage(`Success: ${result.message}`);
        toast({ title: "Coupon Applied", description: `Saved ${currentCurrency.symbol}${result.discount.toFixed(2)}` });
    } else {
        setDiscount(0);
        setAppliedCouponId(null);
        setCouponMessage(`Error: ${result.message}`);
        toast({ title: "Invalid Coupon", description: result.message, variant: "destructive" });
    }
  };

  const getSubtotal = () => getTotalPrice();
  const getDiscountedSubtotal = () => Math.max(0, getSubtotal() - discount);
  const getTaxAmount = () => getDiscountedSubtotal() * (settings?.taxPercentage || 0) / 100;
  const getFinalTotal = () => getDiscountedSubtotal() + getTaxAmount();

  const handleProceedToPayment = () => {
    setShowPayment(true);
  };

  const handleCashPayment = async () => {
    const amountGiven = parseFloat(cashGiven);
    if (isNaN(amountGiven) || amountGiven < getFinalTotal()) {
      toast({ title: "Invalid Amount", description: "Amount given is less than total.", variant: "destructive" });
      return;
    }
    await processOrder("Cash");
  };

  const handleRazorpayPayment = async () => {
    if (!settings?.razorpayKeyId) {
      toast({ title: "Configuration Error", description: "Razorpay Key ID not set in settings.", variant: "destructive" });
      return;
    }

    const options = {
      key: settings.razorpayKeyId,
      amount: Math.round(getFinalTotal() * 100),
      currency: settings.currency,
      name: settings.name,
      description: `Order #${orderNumber}`,
      handler: async function (response: any) {
        console.log("Payment successful", response);
        await processOrder("Razorpay");
      },
      prefill: {
        contact: "",
        email: ""
      },
      theme: {
        color: "#3399cc"
      }
    };

    const rzp = new (window as any).Razorpay(options);
    rzp.open();
  };

  const validateStock = async () => {
    setIsValidating(true);
    const db = getFirebaseDb();
    const outOfStockItems: string[] = [];

    try {
      for (const item of cartItems) {
        const docRef = doc(db, 'products', item.product.id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const currentStock = docSnap.data().stock || 0;
          if (item.quantity > currentStock) {
            outOfStockItems.push(`${item.product.title} (Available: ${currentStock})`);
          }
        } else {
          outOfStockItems.push(`${item.product.title} (Product not found)`);
        }
      }
    } catch (error) {
      console.error("Error validating stock:", error);
      toast({ title: "Error", description: "Failed to validate stock levels.", variant: "destructive" });
      setIsValidating(false);
      return false;
    }

    setIsValidating(false);

    if (outOfStockItems.length > 0) {
      toast({
        title: "Insufficient Stock",
        description: `Cannot process order. Issues: ${outOfStockItems.join(", ")}`,
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const processOrder = async (method: string) => {
    const isStockValid = await validateStock();
    if (!isStockValid) return;

    setPaymentProcessed(true);
    
    try {
      await recordSale(cartItems, getFinalTotal(), currentCurrency.code, orderNumber, discount, method, appliedCouponId ? couponCode : undefined);
      
      if(appliedCouponId) {
          await incrementUsage(appliedCouponId);
      }

      for (const item of cartItems) {
        const db = getFirebaseDb();
        const docRef = doc(db, 'products', item.product.id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const currentStock = docSnap.data().stock || 0;
            const newStock = Math.max(0, currentStock - item.quantity);
            
            await updateProduct(item.product.id, {
                ...item.product,
                stock: newStock,
                inStock: newStock > 0
            });
        }
      }
    } catch (error) {
      console.error('Error processing order:', error);
      toast({ title: "Error", description: "Failed to process order", variant: "destructive" });
      setPaymentProcessed(false);
      return;
    }

    onClearCart();
    setTimeout(() => {
      setIsCompleted(true);
    }, 1000);

    if (settings?.useThermalPrinter && settings?.comPort) {
      await handleESP32Print();
    } else if (!settings?.useThermalPrinter) {
      await handlePDFPrint();
    }
  };

  const handleESP32Print = async () => {
    setIsPrinting(true);
    try {
      const result = await esp32Printer.printReceipt(cartItems, settings!, orderNumber, discount);
      if (result.success) {
        toast({ title: "Success", description: "Receipt printed successfully!" });
      } else {
        toast({ title: "Print Error", description: result.message, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Print Error", description: "Failed to print receipt.", variant: "destructive" });
    } finally {
      setIsPrinting(false);
    }
  };

  const handlePDFPrint = async () => {
    setIsPrinting(true);
    try {
      pdfReceiptService.generateReceiptPDF(cartItems, settings!, orderNumber, discount);
      toast({ title: "Success", description: "PDF receipt generated successfully!" });
    } catch (error) {
      toast({ title: "PDF Error", description: "Failed to generate PDF receipt.", variant: "destructive" });
    } finally {
      setIsPrinting(false);
    }
  };

  const resetCheckout = () => {
    setIsCompleted(false);
    setShowPayment(false);
    setPaymentProcessed(false);
    setOrderNumber("");
    setDiscount(0);
    setCouponCode("");
    setCouponMessage("");
    setAppliedCouponId(null);
    setCashGiven("");
    setPaymentMethod("cash");
  };

  const handleClose = () => {
    onClose();
    resetCheckout();
  };

  useEffect(() => {
    if (isOpen) {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
      return () => {
        document.body.removeChild(script);
      };
    }
  }, [isOpen]);

  if (isCompleted) {
    return (
      <Sheet open={isOpen} onOpenChange={handleClose}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-600" />
              Order Completed
            </SheetTitle>
          </SheetHeader>
          <div className="flex flex-col h-full justify-center items-center text-center space-y-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Thank you for your purchase!</h3>
              <p className="text-gray-600">Order #{orderNumber} has been completed successfully.</p>
            </div>
            <div className="space-y-3 w-full">
              <Button onClick={() => { onComplete(); resetCheckout(); }} className="w-full">
                Start New Order
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleClose} className="p-0 h-auto">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <Receipt className="w-5 h-5" />
            {showPayment ? 'Payment' : 'Checkout'}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 py-6 space-y-6 overflow-y-auto min-h-0">
          <Card>
            <CardContent className="p-4">
              <h3 className="font-medium mb-4">Order Summary</h3>
              <div className="space-y-3">
                {cartItems.map((item) => (
                  <div key={item.product.id} className="text-sm">
                    <div className="flex justify-between">
                      <span>
                        {item.product.title} 
                        {item.product.soldByWeight ? ` (${item.quantity}g)` : ` x${item.quantity}`}
                      </span>
                      <span>{currentCurrency.symbol}{calculateItemPrice(item).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
                
                <Separator />
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>{currentCurrency.symbol}{getSubtotal().toFixed(2)}</span>
                  </div>
                  
                  {!showPayment && (
                    <div className="space-y-2">
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Tag className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                                <Input 
                                    placeholder="Enter Coupon Code" 
                                    value={couponCode}
                                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                    className="uppercase pl-8"
                                />
                            </div>
                            <Button variant="outline" onClick={handleApplyCoupon}>
                                Apply
                            </Button>
                        </div>
                        {couponMessage && (
                            <p className={`text-xs ${couponMessage.startsWith('Success') ? 'text-green-600' : 'text-red-500'}`}>
                                {couponMessage}
                            </p>
                        )}
                    </div>
                  )}

                  {(discount > 0 || (!showPayment && discount === 0)) && (
                     <div className="flex justify-between text-sm text-green-600 font-medium">
                       <span>Discount {appliedCouponId ? `(${couponCode})` : ''}</span>
                       <span>-{currentCurrency.symbol}{discount.toFixed(2)}</span>
                     </div>
                  )}

                  <div className="flex justify-between text-sm">
                    <span>Tax ({settings?.taxPercentage || 0}%)</span>
                    <span>{currentCurrency.symbol}{getTaxAmount().toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-medium text-lg">
                    <span>Total</span>
                    <span>{currentCurrency.symbol}{getFinalTotal().toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {showPayment && (
            <div className="space-y-4">
               <Tabs value={paymentMethod} onValueChange={setPaymentMethod} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="cash">Cash</TabsTrigger>
                  <TabsTrigger value="online">Online (Razorpay)</TabsTrigger>
                </TabsList>
                
                <TabsContent value="cash">
                   <Card>
                    <CardContent className="p-4 space-y-4">
                      <div className="space-y-2">
                        <Label>Amount Tendered</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-gray-500">{currentCurrency.symbol}</span>
                          <Input 
                            type="number" 
                            className="pl-8" 
                            value={cashGiven}
                            onChange={(e) => setCashGiven(e.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                      {parseFloat(cashGiven) >= getFinalTotal() && (
                         <div className="p-3 bg-green-50 text-green-700 rounded-md flex justify-between">
                           <span>Change to Return:</span>
                           <span className="font-bold">
                             {currentCurrency.symbol}{(parseFloat(cashGiven) - getFinalTotal()).toFixed(2)}
                           </span>
                         </div>
                      )}
                      <Button 
                        onClick={handleCashPayment} 
                        className="w-full" 
                        size="lg"
                        disabled={isValidating}
                      >
                        {isValidating ? "Validating Stock..." : "Confirm Cash Payment"}
                      </Button>
                    </CardContent>
                   </Card>
                </TabsContent>

                <TabsContent value="online">
                  <Card>
                    <CardContent className="p-4 space-y-4 text-center">
                      <CreditCard className="w-12 h-12 mx-auto text-blue-600 mb-2" />
                      <p className="text-sm text-gray-600">Proceed to pay securely via Razorpay</p>
                      <Button 
                        onClick={handleRazorpayPayment} 
                        className="w-full bg-blue-600 hover:bg-blue-700" 
                        size="lg"
                        disabled={isValidating}
                      >
                         {isValidating ? "Validating Stock..." : `Pay ${currentCurrency.symbol}${getFinalTotal().toFixed(2)}`}
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>
               </Tabs>
            </div>
          )}
        </div>

        {!showPayment && (
          <div className="border-t pt-4 space-y-3">
            <Button onClick={handleProceedToPayment} className="w-full" size="lg">
              <Banknote className="w-4 h-4 mr-2" />
              Proceed to Payment
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default Checkout;