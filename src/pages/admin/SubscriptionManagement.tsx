import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Check, X, Loader2, Edit2, Save, RotateCcw, Pause, Trash2, Play } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { Textarea } from "@/components/ui/textarea"


interface Plan {
  id: string
  name: string
  price_monthly: number
  price_yearly: number
  features: any
  max_categories: number
  max_videos_per_category: number
  max_screenshots_per_user: number | null
  storage_quota_mb: number | null
  enabled: boolean
  stripe_monthly_price_id: string | null
  stripe_yearly_price_id: string | null
}

interface Promotion {
  id: string
  code: string
  plan_id: string
  validity_period: string
  validity_days: number
  status: string
  created_at: string
  plans: { name: string }
}

export function SubscriptionManagement() {
  const { toast } = useToast()
  const [promoCode, setPromoCode] = useState("")
  const [validityPeriod, setValidityPeriod] = useState("")
  const [subscriptionBundle, setSubscriptionBundle] = useState("")
  const [plans, setPlans] = useState<Plan[]>([])
  const [activePromotions, setActivePromotions] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(true)
  const [activatingPromo, setActivatingPromo] = useState(false)
  const [editingPlan, setEditingPlan] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Partial<Plan>>({})
  const [processingPromo, setProcessingPromo] = useState<string | null>(null)
  const [creatingPlan, setCreatingPlan] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newPlan, setNewPlan] = useState({
    name: '',
    price_monthly: 0,
    price_yearly: 0,
    max_categories: 3,
    max_videos_per_category: 10,
    max_screenshots_per_user: 5,
    enabled: true,
    featuresText: '{}'
  })
  const [verifyingStripe, setVerifyingStripe] = useState(false)
  const [stripeStatus, setStripeStatus] = useState<{present: boolean, startsWithSk: boolean} | null>(null)

  useEffect(() => {
    loadPlansAndPromotions()
    checkStripeStatus()
  }, [])

  const checkStripeStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('manage-subscriptions', {
        body: { action: 'check_stripe_env' }
      })
      
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      
      setStripeStatus(data)
    } catch (error) {
      console.error('Error checking Stripe status:', error)
      setStripeStatus({ present: false, startsWithSk: false })
    }
  }

  const handleVerifyStripe = async () => {
    setVerifyingStripe(true)
    try {
      await checkStripeStatus()
      toast({
        title: "Stripe Status Checked",
        description: stripeStatus?.present && stripeStatus?.startsWithSk 
          ? "Stripe configuration is valid and ready to use." 
          : "Stripe configuration issue detected. Please check your secret key.",
        variant: stripeStatus?.present && stripeStatus?.startsWithSk ? "default" : "destructive"
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to verify Stripe configuration",
        variant: "destructive"
      })
    } finally {
      setVerifyingStripe(false)
    }
  }

  const loadPlansAndPromotions = async () => {
    try {
      // Load plans and promotions
      const [plansResult, promotionsResult] = await Promise.all([
        supabase.functions.invoke('manage-subscriptions', {
          body: { action: 'get_plans' }
        }),
        supabase.functions.invoke('manage-subscriptions', {
          body: { action: 'get_promotions' }
        })
      ])

      if (plansResult.data?.plans) {
        setPlans(plansResult.data.plans)
      }

      if (promotionsResult.data?.promotions) {
        setActivePromotions(promotionsResult.data.promotions)
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        title: "Error",
        description: "Failed to load subscription data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleActivateBundle = async () => {
    if (!promoCode || !validityPeriod || !subscriptionBundle) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields to activate the bundle.",
        variant: "destructive"
      })
      return
    }

    setActivatingPromo(true)

    try {
      // Find the selected plan
      const selectedPlan = plans.find(p => p.name === subscriptionBundle)
      if (!selectedPlan) {
        throw new Error("Selected plan not found")
      }

      const { data, error } = await supabase.functions.invoke('manage-subscriptions', {
        body: {
          action: 'create_promotion',
          data: {
            code: promoCode,
            plan_id: selectedPlan.id,
            validity_period: validityPeriod
          }
        }
      })

      if (error) throw error

      // Reload promotions
      await loadPlansAndPromotions()

      toast({
        title: "Bundle Activated Successfully",
        description: `Promo code "${promoCode}" has been activated for ${subscriptionBundle} with ${validityPeriod} validity.`,
      })

      // Clear form after successful activation
      setPromoCode("")
      setValidityPeriod("")
      setSubscriptionBundle("")

    } catch (error: any) {
      console.error('Error activating promotion:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to activate promotion",
        variant: "destructive"
      })
    } finally {
      setActivatingPromo(false)
    }
  }

  const handleCreatePlan = async () => {
    if (!newPlan.name) {
      toast({ title: 'Missing name', description: 'Please provide a plan name.', variant: 'destructive' })
      return
    }

    let featuresJson: any = {}
    try {
      featuresJson = newPlan.featuresText ? JSON.parse(newPlan.featuresText) : {}
    } catch (e: any) {
      toast({ title: 'Invalid features JSON', description: e.message || 'Please provide valid JSON.', variant: 'destructive' })
      return
    }

    setCreatingPlan(true)
    try {
      const { error, data } = await supabase.functions.invoke('manage-subscriptions', {
        body: {
          action: 'create_plan',
          data: {
            name: newPlan.name,
            price_monthly: newPlan.price_monthly,
            price_yearly: newPlan.price_yearly,
            max_categories: newPlan.max_categories,
            max_videos_per_category: newPlan.max_videos_per_category,
            max_screenshots_per_user: newPlan.max_screenshots_per_user,
            enabled: newPlan.enabled,
            features: featuresJson
          }
        }
      })

      if (error) throw error
      if (data?.error) throw new Error(data.error)

      await loadPlansAndPromotions()
      toast({ title: 'Plan created', description: `Plan "${newPlan.name}" has been added.` })
      setShowCreateForm(false)
      setNewPlan({
        name: '',
        price_monthly: 0,
        price_yearly: 0,
        max_categories: 3,
        max_videos_per_category: 10,
        max_screenshots_per_user: 5,
        enabled: true,
        featuresText: '{}'
      })
    } catch (e: any) {
      console.error('Error creating plan:', e)
      toast({ title: 'Error', description: e.message || 'Failed to create plan', variant: 'destructive' })
    } finally {
      setCreatingPlan(false)
    }
  }

  const handleDeletePlan = async (planId: string) => {
    try {
      const { error } = await supabase.functions.invoke('manage-subscriptions', {
        body: {
          action: 'delete_plan',
          data: { id: planId }
        }
      })

      if (error) throw error

      // Remove plan from local state
      setPlans(prev => prev.filter(p => p.id !== planId))

      toast({
        title: "Success",
        description: "Plan deleted successfully"
      })
    } catch (error: any) {
      console.error('Error deleting plan:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete plan",
        variant: "destructive"
      })
    }
  }

  const handleUpdatePlan = async (planId: string, updates: Partial<Plan>) => {
    try {
      const { error } = await supabase.functions.invoke('manage-subscriptions', {
        body: {
          action: 'update_plan',
          data: { id: planId, ...updates }
        }
      })

      if (error) throw error

      // Update local state
      setPlans(prev => prev.map(p => p.id === planId ? { ...p, ...updates } : p))

      toast({
        title: "Success",
        description: "Plan updated successfully",
      })
    } catch (error: any) {
      console.error('Error updating plan:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to update plan",
        variant: "destructive"
      })
    }
  }

  const startEditing = (plan: Plan) => {
    setEditingPlan(plan.id)
    setEditValues({
      price_monthly: plan.price_monthly,
      price_yearly: plan.price_yearly,
      max_categories: plan.max_categories,
      max_videos_per_category: plan.max_videos_per_category,
      max_screenshots_per_user: plan.max_screenshots_per_user,
      storage_quota_mb: plan.storage_quota_mb,
      stripe_monthly_price_id: plan.stripe_monthly_price_id,
      stripe_yearly_price_id: plan.stripe_yearly_price_id,
    })
  }

  const cancelEditing = () => {
    setEditingPlan(null)
    setEditValues({})
  }

  const saveChanges = async (planId: string) => {
    await handleUpdatePlan(planId, editValues)
    setEditingPlan(null)
    setEditValues({})
  }

  const updateEditValue = (key: keyof Plan, value: any) => {
    setEditValues(prev => ({ ...prev, [key]: value }))
  }

  const handlePromotionAction = async (promoId: string, action: 'freeze' | 'unfreeze' | 'delete') => {
    setProcessingPromo(promoId)
    
    try {
      console.log(`${action}ing promotion:`, promoId)
      
      const actionMap = {
        freeze: 'freeze_promotion',
        unfreeze: 'unfreeze_promotion', 
        delete: 'delete_promotion'
      }
      
      const { data, error } = await supabase.functions.invoke('manage-subscriptions', {
        body: {
          action: actionMap[action],
          data: { id: promoId }
        }
      })

      console.log('Function response:', { data, error })

      if (error) throw error
      if (data?.error) throw new Error(data.error)

      // Reload promotions
      await loadPlansAndPromotions()

      const actionPastTense = action === 'freeze' ? 'frozen' : action === 'unfreeze' ? 'unfrozen' : 'deleted'
      
      toast({
        title: "Success",
        description: `Promotion ${actionPastTense} successfully`,
      })

    } catch (error: any) {
      console.error(`Error ${action}ing promotion:`, error)
      toast({
        title: "Error",
        description: error.message || `Failed to ${action} promotion`,
        variant: "destructive"
      })
    } finally {
      setProcessingPromo(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const calculateEndDate = (startDate: string, validityDays: number) => {
    const end = new Date(startDate)
    end.setDate(end.getDate() + validityDays)
    return end.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </div>
    )
  }
  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Subscription Management</h1>
          <p className="text-muted-foreground">
            Manage your subscription tiers and activate temporary promotional bundles for marketing campaigns.
          </p>
        </div>
      </div>

      {/* Stripe Configuration Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Stripe Configuration Status
            {stripeStatus && (
              <Badge 
                className={
                  stripeStatus.present && stripeStatus.startsWithSk
                    ? "bg-green-100 text-green-800 hover:bg-green-100"
                    : "bg-red-100 text-red-800 hover:bg-red-100"
                }
              >
                {stripeStatus.present && stripeStatus.startsWithSk ? "Connected" : "Not Connected"}
              </Badge>
            )}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Verify your Stripe configuration before testing checkouts.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button 
              onClick={handleVerifyStripe}
              disabled={verifyingStripe}
              variant="outline"
            >
              {verifyingStripe && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {verifyingStripe ? 'Verifying...' : 'Verify Stripe Setup'}
            </Button>
            
            {stripeStatus && (
              <div className="text-sm text-muted-foreground">
                {stripeStatus.present 
                  ? (stripeStatus.startsWithSk 
                    ? "✅ Stripe secret key is properly configured" 
                    : "❌ Stripe key found but invalid format (must start with 'sk_')")
                  : "❌ No Stripe secret key found"}
              </div>
            )}
          </div>
          
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-4 border border-blue-200 dark:border-blue-800">
            <h4 className="font-medium text-sm mb-2 text-blue-900 dark:text-blue-100">
              How to configure Stripe Price IDs
            </h4>
            <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
              <li>Go to your <a href="https://dashboard.stripe.com/products" target="_blank" rel="noopener noreferrer" className="underline font-medium">Stripe Dashboard Products</a></li>
              <li>Create or select a product for each subscription plan</li>
              <li>Add prices (monthly/yearly) to each product</li>
              <li>Copy the Price IDs (starting with <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">price_</code>) and paste them in the plan configuration below</li>
              <li>Save the plan and test the checkout flow</li>
            </ol>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-3">
              <strong>Note:</strong> Make sure you're using Price IDs from the same Stripe account (test/live) as your configured API keys.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Activate Promotional Bundle */}
      <Card>
        <CardHeader>
          <CardTitle>Activate Promotional Bundle</CardTitle>
          <p className="text-sm text-muted-foreground">
            Temporarily enable a subscription tier for a specified duration using a promo code.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <p className="text-sm">To activate a promotional bundle:</p>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4">
              <li>• Enter the <strong>Promo Code</strong> you wish to activate.</li>
              <li>• Select the <strong>Validity Period</strong> for how long the bundle will be active.</li>
              <li>• Choose the <strong>Subscription Bundle</strong> (e.g., Premium, Gold) to be activated.</li>
              <li>• Click <strong>Activate Bundle</strong> to apply the promotion.</li>
              <li>• For current active promotions, refer to the table below.</li>
            </ul>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="promo-code">Promo Code</Label>
              <Input 
                id="promo-code" 
                placeholder="" 
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                style={{ textTransform: 'uppercase' }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="validity-period">Validity Period</Label>
              <Select value={validityPeriod} onValueChange={setValidityPeriod}>
                <SelectTrigger>
                  <SelectValue placeholder="" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7 days">7 days</SelectItem>
                  <SelectItem value="1 Month">1 Month</SelectItem>
                  <SelectItem value="3 Months">3 Months</SelectItem>
                  <SelectItem value="6 Months">6 Months</SelectItem>
                  <SelectItem value="1 Year">1 Year</SelectItem>
                  <SelectItem value="Lifetime">Lifetime</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subscription-bundle">Subscription Bundle</Label>
              <Select value={subscriptionBundle} onValueChange={setSubscriptionBundle}>
                <SelectTrigger>
                  <SelectValue placeholder="" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map(plan => (
                    <SelectItem key={plan.id} value={plan.name}>{plan.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button 
            className="w-fit" 
            onClick={handleActivateBundle}
            disabled={activatingPromo}
          >
            {activatingPromo && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {activatingPromo ? 'Activating...' : 'Activate Bundle'}
          </Button>
        </CardContent>
      </Card>

      {/* Active Promotions */}
      <Card>
        <CardHeader>
          <CardTitle>Active Promotions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Promo Code</TableHead>
                <TableHead>Bundle</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activePromotions.length > 0 ? (
                activePromotions.map((promo, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{promo.code}</TableCell>
                    <TableCell>{promo.plans.name}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(promo.created_at)}</TableCell>
                    <TableCell className="text-muted-foreground">{calculateEndDate(promo.created_at, promo.validity_days)}</TableCell>
                    <TableCell>
                      <Badge 
                        className={
                          promo.status === 'active' 
                            ? "bg-green-100 text-green-800 hover:bg-green-100" 
                            : "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                        }
                      >
                        {promo.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {promo.status === 'active' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePromotionAction(promo.id, 'freeze')}
                            disabled={processingPromo === promo.id}
                          >
                            {processingPromo === promo.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Pause className="h-4 w-4" />
                            )}
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePromotionAction(promo.id, 'unfreeze')}
                            disabled={processingPromo === promo.id}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            {processingPromo === promo.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePromotionAction(promo.id, 'delete')}
                          disabled={processingPromo === promo.id}
                        >
                          {processingPromo === promo.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No active promotions at the moment.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-center gap-4">
        <Button 
          onClick={() => setShowCreateForm(!showCreateForm)}
          variant={showCreateForm ? "outline" : "default"}
        >
          {showCreateForm ? 'Cancel' : 'Create New Plan'}
        </Button>
      </div>

      {showCreateForm && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Create New Plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <Label htmlFor="plan-name" className="text-xs">Name</Label>
                <Input id="plan-name" className="h-8" value={newPlan.name} onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="plan-price-monthly" className="text-xs">Monthly ($)</Label>
                <Input id="plan-price-monthly" className="h-8" type="number" step="0.01" value={newPlan.price_monthly} onChange={(e) => setNewPlan({ ...newPlan, price_monthly: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <Label htmlFor="plan-price-yearly" className="text-xs">Yearly ($)</Label>
                <Input id="plan-price-yearly" className="h-8" type="number" step="0.01" value={newPlan.price_yearly} onChange={(e) => setNewPlan({ ...newPlan, price_yearly: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <Label className="text-xs">Categories</Label>
                <Select value={newPlan.max_categories.toString()} onValueChange={(v) => setNewPlan({ ...newPlan, max_categories: parseInt(v) })}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="-1">Unlimited</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs">Videos/Category</Label>
                <Select value={newPlan.max_videos_per_category.toString()} onValueChange={(v) => setNewPlan({ ...newPlan, max_videos_per_category: parseInt(v) })}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="-1">Unlimited</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Max Snapshots
                  <span className="block text-[10px] font-normal text-muted-foreground mt-0.5">Set limit or choose unlimited</span>
                </Label>
                <Select value={newPlan.max_screenshots_per_user?.toString() || '5'} onValueChange={(v) => setNewPlan({ ...newPlan, max_screenshots_per_user: parseInt(v) })}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="250">250</SelectItem>
                    <SelectItem value="500">500</SelectItem>
                    <SelectItem value="-1">Unlimited</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Features (JSON)</Label>
                <Input className="h-8" value={newPlan.featuresText} onChange={(e) => setNewPlan({ ...newPlan, featuresText: e.target.value })} placeholder="{}" />
              </div>
              <div className="flex items-center gap-2 pt-4">
                <Switch checked={newPlan.enabled} onCheckedChange={(checked) => setNewPlan({ ...newPlan, enabled: checked })} />
                <Label className="text-xs">Enabled</Label>
              </div>
            </div>
            <Button size="sm" onClick={handleCreatePlan} disabled={creatingPlan || !newPlan.name}>
              {creatingPlan && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
              {creatingPlan ? 'Creating...' : 'Create Plan'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Subscription Plan Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription Plan Configuration</CardTitle>
          <p className="text-sm text-muted-foreground">
            Click the edit button on any plan to adjust pricing, limits, and features. Changes are saved individually per plan.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            {plans.map((plan) => {
              const isEditing = editingPlan === plan.id;
              const currentValues = isEditing ? editValues : plan;
              
              return (
                <Card key={plan.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      <div className="flex items-center gap-2">
                        {!isEditing ? (
                          <>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => startEditing(plan)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Plan</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete the "{plan.name}" plan? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeletePlan(plan.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        ) : (
                          <div className="flex gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => saveChanges(plan.id)}
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={cancelEditing}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Monthly Price ($)</Label>
                        {isEditing ? (
                          <Input 
                            type="number" 
                            step="0.01" 
                            value={currentValues.price_monthly} 
                            onChange={(e) => updateEditValue('price_monthly', parseFloat(e.target.value) || 0)}
                            className="text-lg font-bold"
                          />
                        ) : (
                          <div className="text-2xl font-bold">$ {currentValues.price_monthly?.toFixed(2)}</div>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Yearly Price ($)</Label>
                        {isEditing ? (
                          <Input 
                            type="number" 
                            step="0.01" 
                            value={currentValues.price_yearly} 
                            onChange={(e) => updateEditValue('price_yearly', parseFloat(e.target.value) || 0)}
                            className="text-base font-semibold"
                          />
                        ) : (
                          <div className="text-lg font-semibold">$ {currentValues.price_yearly?.toFixed(2)}</div>
                        )}
                      </div>
                     </div>
                   </CardHeader>
                     <CardContent className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-sm font-medium">STRIPE CONFIGURATION</Label>
                          <a 
                            href="https://dashboard.stripe.com/products" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline"
                          >
                            Open Stripe Dashboard →
                          </a>
                        </div>
                        <div className="space-y-3 mt-2">
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">
                              Monthly Price ID
                              {!currentValues.stripe_monthly_price_id && (
                                <span className="ml-2 text-amber-600">⚠ Required for checkout</span>
                              )}
                            </Label>
                            {isEditing ? (
                              <Input 
                                placeholder="price_1234... (from Stripe Dashboard)"
                                value={currentValues.stripe_monthly_price_id || ''} 
                                onChange={(e) => updateEditValue('stripe_monthly_price_id', e.target.value || null)}
                                className="text-xs font-mono"
                              />
                            ) : (
                              <div className={`text-xs font-mono p-2 rounded ${
                                currentValues.stripe_monthly_price_id 
                                  ? 'bg-muted' 
                                  : 'bg-amber-50 dark:bg-amber-950 text-amber-900 dark:text-amber-100 border border-amber-200 dark:border-amber-800'
                              }`}>
                                {currentValues.stripe_monthly_price_id || 'Not configured - Click edit to add'}
                              </div>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">
                              Yearly Price ID
                              {!currentValues.stripe_yearly_price_id && (
                                <span className="ml-2 text-amber-600">⚠ Required for checkout</span>
                              )}
                            </Label>
                            {isEditing ? (
                              <Input 
                                placeholder="price_5678... (from Stripe Dashboard)"
                                value={currentValues.stripe_yearly_price_id || ''} 
                                onChange={(e) => updateEditValue('stripe_yearly_price_id', e.target.value || null)}
                                className="text-xs font-mono"
                              />
                            ) : (
                              <div className={`text-xs font-mono p-2 rounded ${
                                currentValues.stripe_yearly_price_id 
                                  ? 'bg-muted' 
                                  : 'bg-amber-50 dark:bg-amber-950 text-amber-900 dark:text-amber-100 border border-amber-200 dark:border-amber-800'
                              }`}>
                                {currentValues.stripe_yearly_price_id || 'Not configured - Click edit to add'}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                     <div>
                       <Label className="text-sm font-medium">LIMITS</Label>
                      <div className="space-y-3 mt-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Categories:</span>
                          {isEditing ? (
                            <Select 
                              value={currentValues.max_categories?.toString()} 
                              onValueChange={(value) => updateEditValue('max_categories', parseInt(value))}
                            >
                              <SelectTrigger className="w-24 h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">1</SelectItem>
                                <SelectItem value="3">3</SelectItem>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="20">20</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                                <SelectItem value="-1">Unlimited</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="font-medium">
                              {currentValues.max_categories === -1 ? 'Unlimited' : currentValues.max_categories}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Videos per category:</span>
                          {isEditing ? (
                            <Select 
                              value={currentValues.max_videos_per_category?.toString()} 
                              onValueChange={(value) => updateEditValue('max_videos_per_category', parseInt(value))}
                            >
                              <SelectTrigger className="w-24 h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="5">5</SelectItem>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="25">25</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                                <SelectItem value="100">100</SelectItem>
                                <SelectItem value="-1">Unlimited</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="font-medium">
                              {currentValues.max_videos_per_category === -1 ? 'Unlimited' : currentValues.max_videos_per_category}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Max Snapshots:</span>
                          {isEditing ? (
                            <Select 
                              value={currentValues.max_screenshots_per_user?.toString() || '5'} 
                              onValueChange={(value) => updateEditValue('max_screenshots_per_user', parseInt(value))}
                            >
                              <SelectTrigger className="w-24 h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="5">5</SelectItem>
                                <SelectItem value="25">25</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                                <SelectItem value="100">100</SelectItem>
                                <SelectItem value="250">250</SelectItem>
                                <SelectItem value="500">500</SelectItem>
                                <SelectItem value="-1">Unlimited</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="font-medium">
                              {currentValues.max_screenshots_per_user === -1 ? 'Unlimited' : currentValues.max_screenshots_per_user}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Storage Quota:</span>
                          {isEditing ? (
                            <Select 
                              value={currentValues.storage_quota_mb?.toString() || 'null'} 
                              onValueChange={(value) => updateEditValue('storage_quota_mb', value === 'null' ? null : parseInt(value))}
                            >
                              <SelectTrigger className="w-32 h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="10">10 MB</SelectItem>
                                <SelectItem value="50">50 MB</SelectItem>
                                <SelectItem value="100">100 MB</SelectItem>
                                <SelectItem value="500">500 MB</SelectItem>
                                <SelectItem value="1024">1 GB</SelectItem>
                                <SelectItem value="5120">5 GB</SelectItem>
                                <SelectItem value="10240">10 GB</SelectItem>
                                <SelectItem value="null">Unlimited</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="font-medium">
                              {currentValues.storage_quota_mb === null 
                                ? 'Unlimited' 
                                : currentValues.storage_quota_mb >= 1024 
                                  ? `${(currentValues.storage_quota_mb / 1024).toFixed(0)} GB`
                                  : `${currentValues.storage_quota_mb} MB`
                              }
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Plan Enabled</span>
                      <Switch 
                        checked={plan.enabled} 
                        onCheckedChange={(checked) => handleUpdatePlan(plan.id, { enabled: checked })}
                        disabled={isEditing}
                      />
                    </div>
                     <div className="space-y-3">
                        <Button 
                          className="w-full transition-all duration-200 hover:bg-primary/90 hover:shadow-md active:scale-95 active:shadow-sm" 
                          variant="default"
                          disabled={isEditing || (!plan.stripe_monthly_price_id && plan.price_monthly > 0)}
                          onClick={() => {
                           // Skip Stripe for free plans
                           if (plan.price_monthly === 0) {
                             toast({ 
                               title: 'Free Plan', 
                               description: 'Free plans do not require Stripe checkout. Users can select this plan directly.',
                               variant: 'default'
                             })
                             return
                           }
                          // Create monthly checkout for testing
                          supabase.functions.invoke('create-subscription-checkout', {
                            body: { plan_id: plan.id, billing_interval: 'monthly', redirect_base: window.location.origin }
                          }).then(async ({ data, error }) => {
                            console.log("Test Monthly Checkout Response:", { data, error });
                            // Handle structured error from function (returns 200 with { error })
                            if (data?.error) {
                              toast({ title: 'Checkout error', description: data.error, variant: 'destructive' })
                              return
                            }

                            if (error) {
                              // Try to extract response body from error for better diagnostics
                              let message = error.message || 'Failed to start checkout';
                              try {
                                const resp = (error as any)?.context?.response;
                                if (resp && typeof resp.text === 'function') {
                                  const text = await resp.text();
                                  try { const json = JSON.parse(text); if (json.error) message = json.error; } catch { if (text && text.length < 300) message = text; }
                                }
                              } catch {}
                              toast({ title: 'Checkout error', description: message, variant: 'destructive' })
                              return
                            }

                            if (data?.url) {
                              window.open(data.url, '_blank')
                              toast({ 
                                title: 'Test Checkout Created', 
                                description: 'Stripe checkout page opened in new tab. Check for popup blockers if you don\'t see it.',
                              })
                            } else {
                              toast({ title: 'Checkout error', description: 'No checkout URL returned', variant: 'destructive' })
                            }
                          })
                        }}
                       >
                          {plan.price_monthly === 0 ? 'Free Plan - No Checkout' : 
                           !plan.stripe_monthly_price_id ? 'Monthly - No Price ID' : 'Test Monthly'}
                        </Button>
                        <Button 
                          className="w-full transition-all duration-200 hover:bg-secondary/80 hover:shadow-md active:scale-95 active:shadow-sm border-2" 
                          variant="outline"
                          disabled={isEditing || (!plan.stripe_yearly_price_id && plan.price_yearly > 0)}
                          onClick={() => {
                           // Skip Stripe for free plans
                           if (plan.price_yearly === 0) {
                             toast({ 
                               title: 'Free Plan', 
                               description: 'Free plans do not require Stripe checkout. Users can select this plan directly.',
                               variant: 'default'
                             })
                             return
                           }
                          // Create yearly checkout for testing
                          supabase.functions.invoke('create-subscription-checkout', {
                            body: { plan_id: plan.id, billing_interval: 'yearly', redirect_base: window.location.origin }
                          }).then(async ({ data, error }) => {
                            console.log("Test Yearly Checkout Response:", { data, error });
                            // Handle structured error from function (returns 200 with { error })
                            if (data?.error) {
                              toast({ title: 'Checkout error', description: data.error, variant: 'destructive' })
                              return
                            }

                            if (error) {
                              // Try to extract response body from error for better diagnostics
                              let message = error.message || 'Failed to start checkout';
                              try {
                                const resp = (error as any)?.context?.response;
                                if (resp && typeof resp.text === 'function') {
                                  const text = await resp.text();
                                  try { const json = JSON.parse(text); if (json.error) message = json.error; } catch { if (text && text.length < 300) message = text; }
                                }
                              } catch {}
                              toast({ title: 'Checkout error', description: message, variant: 'destructive' })
                              return
                            }

                            if (data?.url) {
                              window.open(data.url, '_blank')
                              toast({ 
                                title: 'Test Checkout Created', 
                                description: 'Stripe checkout page opened in new tab. Check for popup blockers if you don\'t see it.',
                              })
                            } else {
                              toast({ title: 'Checkout error', description: 'No checkout URL returned', variant: 'destructive' })
                            }
                          })
                        }}
                       >
                          {plan.price_yearly === 0 ? 'Free Plan - No Checkout' : 
                           !plan.stripe_yearly_price_id ? 'Yearly - No Price ID' : 'Test Yearly'}
                        </Button>
                     </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}