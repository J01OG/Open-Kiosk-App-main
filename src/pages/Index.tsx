import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Settings, ShoppingCart, Zap } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4 relative">
      <div className="max-w-5xl mx-auto text-center">
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">Open Kiosk</h1>
          <p className="text-xl text-gray-600 mb-2">Open Source Point of Sale System</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {/* Admin Panel */}
          <Card className="hover:shadow-lg transition-shadow duration-300 cursor-pointer border-t-4 border-t-blue-500" onClick={() => navigate('/admin')}>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Settings className="w-8 h-8 text-blue-600" />
              </div>
              <CardTitle className="text-xl">Admin Panel</CardTitle>
              <CardDescription>
                Inventory, Reports & Settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">Access Admin</Button>
            </CardContent>
          </Card>
          
          {/* Fast POS (New) */}
          <Card className="hover:shadow-lg transition-shadow duration-300 cursor-pointer transform hover:-translate-y-1 border-t-4 border-t-purple-500" onClick={() => navigate('/pos')}>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                <Zap className="w-8 h-8 text-purple-600" />
              </div>
              <CardTitle className="text-xl">Fast POS</CardTitle>
              <CardDescription>
                For Counter Staff. High Speed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full bg-purple-600 hover:bg-purple-700">Open Counter</Button>
            </CardContent>
          </Card>
          
          {/* Customer Shop */}
          <Card className="hover:shadow-lg transition-shadow duration-300 cursor-pointer border-t-4 border-t-green-500" onClick={() => navigate('/shop')}>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <ShoppingCart className="w-8 h-8 text-green-600" />
              </div>
              <CardTitle className="text-xl">Self Checkout</CardTitle>
              <CardDescription>
                For Customers. Browse & Buy.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">Start Kiosk</Button>
            </CardContent>
          </Card>
        </div>
        
        <div className="mt-12 text-sm text-gray-500">
          <p>Open source • Free to use • Customizable for any business</p>
        </div>
      </div>
    </div>
  );
};

export default Index;