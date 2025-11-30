import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Minus, Plus, Trash2, ShoppingCart, MessageSquare } from "lucide-react";
import { CartItem } from "@/types/product";
import { useCurrentCurrency } from "@/hooks/useSettings";
import { useState } from "react";
import Checkout from "./Checkout";

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onUpdateNote?: (productId: string, note: string) => void;
  onClearCart: () => void;
}

const Cart = ({ isOpen, onClose, cartItems, onUpdateQuantity, onUpdateNote, onClearCart }: CartProps) => {
  const currentCurrency = useCurrentCurrency();
  const [showCheckout, setShowCheckout] = useState(false);

  const calculateItemPrice = (item: CartItem) => {
    if (item.product.soldByWeight) {
      return (item.product.price / 1000) * item.quantity;
    }
    return item.product.price * item.quantity;
  };

  const getTotalPrice = () => {
    return cartItems.reduce((total, item) => total + calculateItemPrice(item), 0);
  };

  const handleCheckout = () => {
    onClose();
    setTimeout(() => {
      setShowCheckout(true);
    }, 220);
  };

  const handleCheckoutComplete = () => {
    onClearCart();
    setShowCheckout(false);
  };

  if (cartItems.length === 0) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center">
              <ShoppingCart className="w-5 h-5 mr-2" />
              Shopping Cart
            </SheetTitle>
          </SheetHeader>
          <div className="flex flex-col items-center justify-center h-64">
            <ShoppingCart className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-gray-500 text-center">Your cart is empty</p>
            <p className="text-sm text-gray-400 text-center mt-2">Add some products to get started</p>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-lg flex flex-col">
          <SheetHeader>
            <SheetTitle className="flex items-center justify-between">
              <span className="flex items-center">
                <ShoppingCart className="w-5 h-5 mr-2" />
                Shopping Cart
              </span>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{cartItems.length} items</Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClearCart}
                  className="text-red-600 hover:text-red-700"
                >
                  Clear Cart
                </Button>
              </div>
            </SheetTitle>
          </SheetHeader>
          
          <div className="flex-1 overflow-y-auto py-4 min-h-0">
            <div className="space-y-4">
              {cartItems.map((item) => (
                <div key={item.product.id} className="flex flex-col gap-3 p-4 border rounded-lg bg-white">
                  <div className="flex items-start gap-4">
                    {item.product.image ? (
                      <img
                        src={item.product.image}
                        alt={item.product.title}
                        className="w-16 h-16 object-cover rounded-md"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-200 rounded-md flex items-center justify-center">
                        <ShoppingCart className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm line-clamp-2">{item.product.title}</h4>
                      <p className="text-sm text-gray-500">
                        {currentCurrency.symbol}{item.product.price.toFixed(2)}
                        {item.product.soldByWeight ? "/kg" : ""}
                      </p>
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-2">
                          {!item.product.soldByWeight && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                                disabled={item.quantity <= 1}
                                className="h-8 w-8 p-0"
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <span className="text-sm font-medium min-w-[2rem] text-center">
                                {item.quantity}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                                disabled={item.quantity >= (item.product.stock || 0)} // <--- FIXED: Disable if max stock reached
                                className="h-8 w-8 p-0"
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </>
                          )}
                          {item.product.soldByWeight && (
                             <span className="text-sm font-medium px-2 py-1 bg-gray-100 rounded">
                               {item.quantity}g
                             </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">
                            {currentCurrency.symbol}{calculateItemPrice(item).toFixed(2)}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onUpdateQuantity(item.product.id, 0)}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-gray-400" />
                    <Input 
                      placeholder="Add note (e.g. less spicy)..." 
                      className="h-8 text-xs"
                      value={item.notes || ''}
                      onChange={(e) => onUpdateNote && onUpdateNote(item.product.id, e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="border-t pt-4 space-y-4">
            <div className="flex items-center justify-between text-lg font-semibold">
              <span>Total:</span>
              <span>{currentCurrency.symbol}{getTotalPrice().toFixed(2)}</span>
            </div>
            <Button 
              className="w-full" 
              size="lg"
              onClick={handleCheckout}
            >
              Proceed to Checkout
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Checkout
        isOpen={showCheckout}
        onClose={() => setShowCheckout(false)}
        cartItems={cartItems}
        onComplete={handleCheckoutComplete}
        onUpdateQuantity={() => {}}
        onClearCart={() => {}}
      />
    </>
  );
};

export default Cart;