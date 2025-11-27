import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { StoreSettings } from "@/types/store";
import { Settings, Save, RotateCcw, AlertTriangle, Eye, EyeOff, Printer, CreditCard } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSettings } from "@/hooks/useSettings";

const mask = (value: string) => value ? "●".repeat(Math.max(value.length, 5)) : "";

const firebaseFields = [
  { key: "apiKey", label: "API Key *", placeholder: "Your Firebase API key" },
  { key: "projectId", label: "Project ID *", placeholder: "your-project-id" },
  { key: "authDomain", label: "Auth Domain", placeholder: "your-project-id.firebaseapp.com" },
  { key: "storageBucket", label: "Storage Bucket", placeholder: "your-project-id.appspot.com" },
  { key: "messagingSenderId", label: "Messaging Sender ID", placeholder: "123456789" },
  { key: "appId", label: "App ID", placeholder: "1:123456789:web:abcdef" },
];

const SettingsPanel = () => {
  const { settings, updateSettings, resetStore } = useStoreSettings();
  const [localSettings, setLocalSettings] = useState<StoreSettings>(
    settings || {
      name: "",
      currency: "INR",
      taxId: "",
      taxPercentage: 18,
      firebaseConfig: {
        apiKey: "",
        authDomain: "",
        projectId: "",
        storageBucket: "",
        messagingSenderId: "",
        appId: ""
      },
      useThermalPrinter: false,
      razorpayKeyId: ""
    }
  );
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const [firebaseVisibility, setFirebaseVisibility] = useState<Record<string, boolean>>({
    apiKey: false,
    projectId: false,
    authDomain: false,
    storageBucket: false,
    messagingSenderId: false,
    appId: false,
  });

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setLocalSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFirebaseConfigChange = (field: string, value: string) => {
    setLocalSettings(prev => ({
      ...prev,
      firebaseConfig: {
        ...prev.firebaseConfig,
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      if (!localSettings.name || !localSettings.taxId || !localSettings.firebaseConfig.projectId) {
        toast({
          title: "Error",
          description: "Please fill in all required fields",
          variant: "destructive"
        });
        return;
      }

      updateSettings(localSettings);
      toast({
        title: "Success",
        description: "Settings updated successfully!"
      });
    } catch (error) {
      console.error('Error updating settings:', error);
      toast({
        title: "Error",
        description: "Failed to update settings",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    if (confirm("Are you sure you want to reset all store settings? This will require you to set up the store again.")) {
      resetStore();
      toast({
        title: "Store Reset",
        description: "Store settings have been reset. Please refresh the page.",
      });
    }
  };

  const toggleFirebaseVisibility = (key: string) => {
    setFirebaseVisibility(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const { currentCurrency, currencies, updateCurrency, loading } = useSettings();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            Store Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="storeName">Store Name *</Label>
            <Input
              id="storeName"
              value={localSettings.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter your store name"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="taxId">Tax ID / GST Number *</Label>
              <Input
                id="taxId"
                value={localSettings.taxId}
                onChange={(e) => handleInputChange('taxId', e.target.value)}
                placeholder="Enter your tax ID or GST number"
              />
            </div>
            <div>
              <Label htmlFor="taxPercentage">Tax Percentage (%)</Label>
              <Input
                id="taxPercentage"
                type="number"
                value={localSettings.taxPercentage}
                onChange={(e) => handleInputChange('taxPercentage', parseFloat(e.target.value))}
                placeholder="18"
              />
            </div>
          </div>
          <div>
            <Label className="text-m text-bold">Select your store's currency</Label>
            <Select
              value={currentCurrency.code}
              onValueChange={updateCurrency}
              disabled={loading}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((currency) => (
                  <SelectItem key={currency.code} value={currency.code}>
                    {currency.symbol} {currency.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
         <CardHeader>
           <CardTitle className="flex items-center">
             <CreditCard className="w-5 h-5 mr-2" />
             Payment Gateways
           </CardTitle>
         </CardHeader>
         <CardContent className="space-y-4">
           <div>
             <Label htmlFor="razorpayKey">Razorpay Key ID</Label>
             <Input
               id="razorpayKey"
               value={localSettings.razorpayKeyId || ""}
               onChange={(e) => handleInputChange('razorpayKeyId', e.target.value)}
               placeholder="rzp_test_..."
             />
             <p className="text-xs text-muted-foreground mt-1">Required for online payments</p>
           </div>
         </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Printer className="w-5 h-5 mr-2" />
            Printer Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="thermalPrinter">Use Thermal Printer</Label>
              <p className="text-xs text-muted-foreground">
                Enable to use thermal printer, disable for PDF receipts
              </p>
            </div>
            <Switch
              id="thermalPrinter"
              checked={localSettings.useThermalPrinter || false}
              onCheckedChange={(checked) => handleInputChange('useThermalPrinter', checked)}
            />
          </div>

          {localSettings.useThermalPrinter && (
            <div>
              <Label htmlFor="comPort">COM Port for Thermal Printer</Label>
              <Input
                id="comPort"
                value={localSettings.comPort || ""}
                onChange={(e) => handleInputChange('comPort', e.target.value)}
                placeholder="COM3"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Firebase Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {firebaseFields.map(field => (
            <div key={field.key} className={["storageBucket", "messagingSenderId"].includes(field.key) ? "grid grid-cols-2 gap-4" : ""}>
               <div className="relative mb-2">
                  <Label htmlFor={field.key}>{field.label}</Label>
                  <Input
                    id={field.key}
                    type={firebaseVisibility[field.key] ? "text" : "password"}
                    value={
                      firebaseVisibility[field.key]
                        ? localSettings.firebaseConfig[field.key as keyof typeof localSettings.firebaseConfig] || ""
                        : mask(localSettings.firebaseConfig[field.key as keyof typeof localSettings.firebaseConfig] || "")
                    }
                    onChange={(e) => handleFirebaseConfigChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    autoComplete="off"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-[34px]"
                    onClick={() => toggleFirebaseVisibility(field.key)}
                    tabIndex={-1}
                  >
                    {firebaseVisibility[field.key] ? <EyeOff /> : <Eye />}
                  </Button>
                </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button onClick={handleSave} disabled={isLoading} className="flex-1">
          <Save className="w-4 h-4 mr-2" />
          {isLoading ? "Saving..." : "Save Settings"}
        </Button>
        
        <Button variant="destructive" onClick={handleReset} className="flex items-center">
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset Store
        </Button>
      </div>
    </div>
  );
};

export default SettingsPanel;