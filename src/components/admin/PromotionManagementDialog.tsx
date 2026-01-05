import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Gift, Plus, Trash2, User } from "lucide-react";

interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
}

interface UserSubscription {
  id: string;
  plan_id: string;
  status: string;
  start_date: string;
  end_date?: string;
  promo_code?: string;
  plans?: {
    name: string;
  };
}

interface Promotion {
  id: string;
  code: string;
  plan_id: string;
  validity_days: number;
  validity_period: string;
  status: string;
  created_at: string;
  plans?: {
    name: string;
  };
}

interface Plan {
  id: string;
  name: string;
}

interface PromotionManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedUser?: User;
  onSuccess?: () => void;
}

export const PromotionManagementDialog = ({ 
  open, 
  onOpenChange, 
  selectedUser,
  onSuccess 
}: PromotionManagementDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [userSubscriptions, setUserSubscriptions] = useState<UserSubscription[]>([]);
  const [activeTab, setActiveTab] = useState('assign');
  
  // Assign promotion state
  const [selectedPromotion, setSelectedPromotion] = useState('');
  
  // Create promotion state
  const [newPromotion, setNewPromotion] = useState({
    code: '',
    plan_id: '',
    validity_days: 30,
    validity_period: '30 days'
  });

  useEffect(() => {
    if (open) {
      fetchPromotions();
      fetchPlans();
      if (selectedUser) {
        fetchUserSubscriptions();
      }
    }
  }, [open, selectedUser]);

  const fetchPromotions = async () => {
    try {
      const { data, error } = await supabase
        .from('promotions')
        .select(`
          *,
          plans (name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPromotions(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch promotions",
        variant: "destructive",
      });
    }
  };

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('plans')
        .select('id, name')
        .eq('enabled', true)
        .order('name');

      if (error) throw error;
      setPlans(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch plans",
        variant: "destructive",
      });
    }
  };

  const fetchUserSubscriptions = async () => {
    if (!selectedUser) return;
    
    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          plans (name)
        `)
        .eq('user_id', selectedUser.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUserSubscriptions(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch user subscriptions",
        variant: "destructive",
      });
    }
  };

  const removeUserSubscription = async (subscriptionId: string) => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('user_subscriptions')
        .update({ status: 'expired', end_date: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', subscriptionId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User subscription removed successfully",
      });

      fetchUserSubscriptions();
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to remove subscription",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const assignPromotion = async () => {
    if (!selectedUser || !selectedPromotion) return;

    try {
      setLoading(true);
      
      const promotion = promotions.find(p => p.id === selectedPromotion);
      if (!promotion) throw new Error('Promotion not found');

      const { data, error } = await supabase.rpc('activate_promotion', {
        promo_code_input: promotion.code,
        user_uuid: selectedUser.id
      });

      if (error) throw error;

      if (data && data.length > 0 && data[0].success) {
        toast({
          title: "Success",
          description: `Promotion "${promotion.code}" assigned to ${selectedUser.email}`,
        });
        onSuccess?.();
        onOpenChange(false);
      } else {
        toast({
          title: "Error",
          description: data?.[0]?.message || "Failed to assign promotion",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to assign promotion",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createPromotion = async () => {
    if (!newPromotion.code || !newPromotion.plan_id) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase
        .from('promotions')
        .insert({
          code: newPromotion.code.toUpperCase(),
          plan_id: newPromotion.plan_id,
          validity_days: newPromotion.validity_days,
          validity_period: newPromotion.validity_period,
          status: 'active'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Promotion "${newPromotion.code}" created successfully`,
      });

      setNewPromotion({
        code: '',
        plan_id: '',
        validity_days: 30,
        validity_period: '30 days'
      });
      
      fetchPromotions();
      setActiveTab('assign');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create promotion",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deletePromotion = async (promotionId: string) => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('promotions')
        .delete()
        .eq('id', promotionId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Promotion deleted successfully",
      });

      fetchPromotions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete promotion",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generatePromoCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPromotion(prev => ({ ...prev, code: result }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5" />
            Promotion Management
            {selectedUser && (
              <Badge variant="outline" className="ml-2">
                {selectedUser.email}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Assign, update, or remove user promotions and active subscriptions.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="assign">Assign Promotion</TabsTrigger>
            <TabsTrigger value="create">Create Promotion</TabsTrigger>
            <TabsTrigger value="manage">Manage Promotions</TabsTrigger>
          </TabsList>

          <TabsContent value="assign" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Assign Promotion to User
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedUser && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium">{selectedUser.email}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedUser.first_name} {selectedUser.last_name}
                    </p>
                  </div>
                )}

                {/* Current User Subscriptions */}
                {selectedUser && userSubscriptions.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-base font-medium">Current Active Subscriptions</Label>
                    <div className="space-y-2">
                      {userSubscriptions.map((subscription) => (
                        <div 
                          key={subscription.id}
                          className="flex items-center justify-between p-3 border border-orange-200 bg-orange-50 rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{subscription.plans?.name}</span>
                              <Badge variant="outline">{subscription.status}</Badge>
                              {subscription.promo_code && (
                                <code className="text-xs px-2 py-1 bg-muted rounded font-mono">
                                  {subscription.promo_code}
                                </code>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Started: {new Date(subscription.start_date).toLocaleDateString()}
                              {subscription.end_date && ` • Expires: ${new Date(subscription.end_date).toLocaleDateString()}`}
                            </p>
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => removeUserSubscription(subscription.id)}
                            disabled={loading}
                          >
                            {loading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <Label>Select Promotion</Label>
                  <Select value={selectedPromotion} onValueChange={setSelectedPromotion}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Choose a promotion to assign" />
                    </SelectTrigger>
                    <SelectContent>
                      {promotions.filter(p => p.status === 'active').map((promotion) => (
                        <SelectItem key={promotion.id} value={promotion.id}>
                          <div className="flex items-center justify-between w-full">
                            <span className="font-mono">{promotion.code}</span>
                            <span className="text-sm text-muted-foreground ml-2">
                              {promotion.plans?.name} - {promotion.validity_period}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  onClick={assignPromotion}
                  disabled={!selectedUser || !selectedPromotion || loading}
                  className="w-full"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Gift className="w-4 h-4 mr-2" />
                  )}
                  Assign Promotion
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="create" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Create New Promotion
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="promo-code">Promotion Code</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      id="promo-code"
                      value={newPromotion.code}
                      onChange={(e) => setNewPromotion(prev => ({ 
                        ...prev, 
                        code: e.target.value.toUpperCase() 
                      }))}
                      placeholder="PROMO2024"
                      className="font-mono"
                    />
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={generatePromoCode}
                    >
                      Generate
                    </Button>
                  </div>
                </div>

                <div>
                  <Label>Target Plan</Label>
                  <Select 
                    value={newPromotion.plan_id} 
                    onValueChange={(value) => setNewPromotion(prev => ({ ...prev, plan_id: value }))}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="validity-days">Validity (Days)</Label>
                  <Input
                    id="validity-days"
                    type="number"
                    value={newPromotion.validity_days}
                    onChange={(e) => {
                      const days = parseInt(e.target.value);
                      setNewPromotion(prev => ({ 
                        ...prev, 
                        validity_days: days,
                        validity_period: `${days} days`
                      }));
                    }}
                    className="mt-2"
                    min="1"
                    max="365"
                  />
                </div>

                <Button 
                  onClick={createPromotion}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  Create Promotion
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manage" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Existing Promotions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {promotions.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No promotions found
                    </p>
                  ) : (
                    promotions.map((promotion) => (
                      <div 
                        key={promotion.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <code className="font-mono font-bold">
                              {promotion.code}
                            </code>
                            <Badge 
                              variant={promotion.status === 'active' ? 'default' : 'secondary'}
                            >
                              {promotion.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {promotion.plans?.name} • {promotion.validity_period}
                          </p>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deletePromotion(promotion.id)}
                          disabled={loading}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};