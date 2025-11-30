import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import Cart from "@/components/Cart";
import VoiceSearchButton from "@/components/VoiceSearchButton";
import OnScreenKeyboard from "@/components/OnScreenKeyboard";
import { CartItem, Product } from "@/types/product";
import { useFirebaseProducts } from "@/hooks/useFirebaseProducts";
import { useSettings } from "@/hooks/useSettings";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const INITIAL_LOAD_LIMIT = 50;

const Shop = () => {
  const navigate = useNavigate();
  const { products, loading } = useFirebaseProducts();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [displayedProducts, setDisplayedProducts] = useState<Product[]>([]);
  const [displayLimit, setDisplayLimit] = useState(INITIAL_LOAD_LIMIT);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const { currentCurrency } = useSettings();

  // Weight Selection State
  const [weightDialogOpen, setWeightDialogOpen] = useState(false);
  const [selectedWeightedProduct, setSelectedWeightedProduct] = useState<Product | null>(null);
  const [weightInput, setWeightInput] = useState("");

  useEffect(() => {
    if (products) {
      const sortedByMostSold = [...products].sort((a, b) => {
        const stockA = a.stock || 0;
        const stockB = b.stock || 0;
        if (stockA > 0 && stockB > 0) return stockA - stockB;
        if (stockA > 0 && stockB === 0) return -1;
        if (stockA === 0 && stockB > 0) return 1;
        return 0;
      });

      const filtered = sortedByMostSold.filter(product =>
        product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredProducts(filtered);
    }
  }, [products, searchQuery]);

  useEffect(() => {
    setDisplayedProducts(filteredProducts.slice(0, displayLimit));
  }, [filteredProducts, displayLimit]);

  const loadMore = () => {
    setDisplayLimit(prev => prev + 50);
  };

  const hasMoreProducts = displayLimit < filteredProducts.length;

  const handleProductClick = (product: Product) => {
    if (product.soldByWeight) {
      setSelectedWeightedProduct(product);
      setWeightInput("");
      setWeightDialogOpen(true);
    } else {
      addToCart(product, 1);
    }
  };

  const confirmWeight = () => {
    if (selectedWeightedProduct && weightInput) {
      const grams = parseFloat(weightInput);
      if (grams > 0) {
        addToCart(selectedWeightedProduct, grams);
      }
    }
    setWeightDialogOpen(false);
    setSelectedWeightedProduct(null);
    setWeightInput("");
  };

  const addToCart = async (product: Product, qty: number) => {
    if ((product.stock || 0) <= 0) return;

    setCartItems(prevItems => {
      const existingItem = prevItems.find(item => item.product.id === product.id);
      if (existingItem) {
        const newQuantity = existingItem.quantity + qty;
        if (newQuantity <= (product.stock || 0)) {
          return prevItems.map(item =>
            item.product.id === product.id
              ? { ...item, quantity: newQuantity }
              : item
          );
        }
        return prevItems;
      } else {
        return [...prevItems, { product, quantity: qty }];
      }
    });
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCartItems(prevItems => prevItems.filter(item => item.product.id !== productId));
    } else {
      setCartItems(prevItems =>
        prevItems.map(item => {
          if (item.product.id === productId) {
            const maxQuantity = item.product.stock || 0;
            const finalQuantity = Math.min(quantity, maxQuantity);
            return { ...item, quantity: finalQuantity };
          }
          return item;
        })
      );
    }
  };

  const updateCartNote = (productId: string, note: string) => {
    setCartItems(prevItems =>
      prevItems.map(item => 
        item.product.id === productId ? { ...item, notes: note } : item
      )
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const getTotalItems = () => {
    return cartItems.length; 
  };

  const handleVoiceTranscript = (transcript: string) => {
    setSearchQuery(transcript);
  };

  const handleKeyPress = (key: string) => {
    if (key === 'BACKSPACE') {
      setSearchQuery(prev => prev.slice(0, -1));
    } else if (key === 'CLEAR') {
      setSearchQuery('');
    } else if (key === ' ') {
      setSearchQuery(prev => prev + ' ');
    } else if (key.length === 1) {
      setSearchQuery(prev => prev + key);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-4 text-gray-600">Loading products...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsKeyboardVisible(true)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <VoiceSearchButton onTranscript={handleVoiceTranscript} />
            <div>
              <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCartOpen(true)}
              className="relative"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Cart
              {getTotalItems() > 0 && (
                <Badge variant="destructive" className="ml-2 px-1 min-w-[1.2rem] h-5">
                  {getTotalItems()}
                </Badge>
              )}
            </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {displayedProducts.map((product) => (
            <Card key={product.id} className="h-full">
              <CardContent className="p-4">
                <div className="space-y-3">
                  {product.image && (
                    <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
                      <img
                        src={product.image}
                        alt={product.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  
                  <div>
                    <h3 className="font-semibold text-sm line-clamp-2">{product.title}</h3>
                    <p className="text-gray-600 text-xs line-clamp-2 mt-1">{product.description}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-green-600 text-sm">
                        {currentCurrency.symbol}{product.price.toFixed(2)}
                        {product.soldByWeight ? "/kg" : ""}
                      </span>
                      <Badge variant={(product.stock || 0) > 0 ? "default" : "destructive"} className="text-xs">
                        {(product.stock || 0) > 0 
                          ? (product.soldByWeight ? `${product.stock}g in stock` : `${product.stock} in stock`)
                          : "Out of Stock"}
                      </Badge>
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => handleProductClick(product)}
                    disabled={(product.stock || 0) <= 0}
                    className="w-full text-sm py-2"
                    size="sm"
                  >
                    {(product.stock || 0) <= 0 ? "Out of Stock" : "Add to Cart"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {hasMoreProducts && (
          <div className="flex justify-center mt-8">
            <Button onClick={loadMore} variant="outline" size="lg">
              Show More Products ({filteredProducts.length - displayLimit} remaining)
            </Button>
          </div>
        )}

        <div className="text-center mt-4 text-gray-500 text-sm">
          Showing {displayedProducts.length} of {filteredProducts.length} products
        </div>
      </div>

      {/* Weight Selection Dialog */}
      <Dialog open={weightDialogOpen} onOpenChange={setWeightDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enter Weight</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="weight" className="text-right">
                Grams
              </Label>
              <Input
                id="weight"
                type="number"
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
                placeholder="e.g. 500"
                className="col-span-3"
                autoFocus
              />
            </div>
            <p className="text-sm text-gray-500 text-center">
              Price: {currentCurrency.symbol}
              {((selectedWeightedProduct?.price || 0) / 1000 * (parseFloat(weightInput) || 0)).toFixed(2)}
            </p>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={confirmWeight}>Add to Cart</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Cart
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={updateCartQuantity}
        onUpdateNote={updateCartNote}
        onClearCart={clearCart}
      />

      <OnScreenKeyboard
        isVisible={isKeyboardVisible}
        onKeyPress={handleKeyPress}
        onClose={() => setIsKeyboardVisible(false)}
      />
    </div>
  );
};

export default Shop;