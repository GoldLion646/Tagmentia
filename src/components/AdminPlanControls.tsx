import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Crown, Settings, RefreshCw, Ban, CheckCircle } from "lucide-react";
import { useAdminSubscriptionControls } from "@/hooks/useAdminSubscriptionControls";

interface AdminPlanControlsProps {
  userId: string;
  currentPlan: string;
  planStatus: string;
  onUpdate: () => void;
}

interface Plan {
  id: string;
  name: string;
  color: string;
}

const plans: Plan[] = [
  { id: "9828dd80-d6fc-4e14-a030-fe5271ebbbc7", name: "Free Plan", color: "gray" },
  { id: "15c0c510-8867-4db5-808a-e2f4678cb596", name: "Premium Plan", color: "blue" },
  { id: "ac0e82e9-1e6e-4108-8f30-2a1c597ffaf5", name: "Gold Plan", color: "yellow" }
];

export const AdminPlanControls = ({ userId, currentPlan, planStatus, onUpdate }: AdminPlanControlsProps) => {
  const [selectedPlan, setSelectedPlan] = useState("");
  const [open, setOpen] = useState(false);
  const { loading, updateUserPlan, resetUserLimits, suspendUser, reactivateUser } = useAdminSubscriptionControls();

  const handlePlanUpdate = async () => {
    if (!selectedPlan) return;
    
    const success = await updateUserPlan(userId, selectedPlan);
    if (success) {
      setOpen(false);
      setSelectedPlan("");
      onUpdate();
    }
  };

  const handleResetLimits = async () => {
    const success = await resetUserLimits(userId);
    if (success) {
      onUpdate();
    }
  };

  const handleSuspendUser = async () => {
    const success = await suspendUser(userId);
    if (success) {
      onUpdate();
    }
  };

  const handleReactivateUser = async () => {
    const success = await reactivateUser(userId);
    if (success) {
      onUpdate();
    }
  };

  const getPlanColor = (planName: string) => {
    if (planName.includes('Gold')) return 'text-yellow-600';
    if (planName.includes('Premium')) return 'text-blue-600';
    return 'text-gray-600';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'suspended':
        return <Badge className="bg-red-100 text-red-800">Suspended</Badge>;
      case 'expired':
        return <Badge className="bg-orange-100 text-orange-800">Expired</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Crown className="w-5 h-5" />
          Subscription Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className={`font-medium ${getPlanColor(currentPlan)}`}>
              {currentPlan}
            </p>
            <div className="flex items-center gap-2 mt-1">
              {getStatusBadge(planStatus)}
            </div>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                Change Plan
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Change User Plan</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Select New Plan</label>
                  <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Choose a plan" />
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
                <Button 
                  onClick={handlePlanUpdate} 
                  disabled={!selectedPlan || loading}
                  className="w-full"
                >
                  {loading ? "Updating..." : "Update Plan"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleResetLimits}
            disabled={loading}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset Limits
          </Button>

          {planStatus === 'active' ? (
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={handleSuspendUser}
              disabled={loading}
            >
              <Ban className="w-4 h-4 mr-2" />
              Suspend
            </Button>
          ) : (
            <Button 
              variant="default" 
              size="sm" 
              onClick={handleReactivateUser}
              disabled={loading}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Reactivate
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};