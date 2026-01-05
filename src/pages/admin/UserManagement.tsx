import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { 
  Search, 
  Plus, 
  Download, 
  Filter, 
  Edit, 
  Trash2,
  ChevronLeft,
  ChevronRight,
  Snowflake,
  ChevronDown,
  X,
  Gift,
  Shield
} from "lucide-react"
import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { supabase } from "@/integrations/supabase/client"
import { EditUserDialog } from "@/components/admin/EditUserDialog"
import { FreezeUserDialog } from "@/components/admin/FreezeUserDialog"
import { DeleteUserDialog } from "@/components/admin/DeleteUserDialog"
import { AddUserDialog } from "@/components/admin/AddUserDialog"
import { BulkDeleteUsersDialog } from "@/components/admin/BulkDeleteUsersDialog"
import { PromotionManagementDialog } from "@/components/admin/PromotionManagementDialog"
import { PromoteToAdminDialog } from "@/components/admin/PromoteToAdminDialog"
import { ClearRateLimitsDialog } from "@/components/admin/ClearRateLimitsDialog"
import { format } from "date-fns"

interface Profile {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  mobile: string | null
  birth_date: string | null
  status: string | null
  created_at: string
  updated_at: string
  last_login_at: string | null
  user_roles?: { role: string }[]
  subscription?: {
    plan_name: string | null
    promo_code: string | null
    validity_period: string | null
    status: string
    end_date: string | null
  }
}


const getStatusBadge = (status: string | null) => {
  switch (status) {
    case "active":
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 rounded px-3 py-1">Active</Badge>
    case "frozen":
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 rounded px-3 py-1">Frozen</Badge>
    default:
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 rounded px-3 py-1">Active</Badge>
  }
}

const getPlanBadge = (profile: Profile) => {
  if (!profile.subscription?.plan_name) {
    return <Badge variant="outline" className="rounded px-3 py-1">No Plan</Badge>
  }
  
  const { plan_name } = profile.subscription
  
  switch (plan_name.toLowerCase()) {
    case "premium":
    case "premium plan":
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 rounded px-3 py-1">Premium</Badge>
    case "gold":
    case "gold plan":
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 rounded px-3 py-1">Gold</Badge>
    case "free":
    case "free plan":
      return <Badge variant="outline" className="rounded px-3 py-1">Free</Badge>
    default:
      return <Badge variant="secondary" className="rounded px-3 py-1">{plan_name}</Badge>
  }
}

const getRoleBadge = (profile: Profile) => {
  const roles = profile.user_roles || []
  if (roles.length === 0) {
    return <Badge variant="secondary" className="rounded px-3 py-1">User</Badge>
  }
  
  // Check if user has admin role
  const hasAdmin = roles.some(r => r.role === 'admin')
  if (hasAdmin) {
    return <Badge className="bg-red-600 text-white hover:bg-red-600 rounded px-3 py-1">Admin</Badge>
  }
  
  // Return the first role if not admin
  const role = roles[0].role
  return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 rounded px-3 py-1">{role.charAt(0).toUpperCase() + role.slice(1)}</Badge>
}

const getPromoCodeBadge = (profile: Profile) => {
  if (!profile.subscription?.promo_code) {
    return <Badge variant="outline" className="rounded px-3 py-1">No Promo</Badge>
  }
  
  const { promo_code, status, end_date } = profile.subscription
  
  // Check if promo is still valid
  const isExpired = end_date && new Date(end_date) < new Date()
  if (isExpired) {
    return <Badge className="bg-red-100 text-red-800 hover:bg-red-100 rounded px-3 py-1">Expired</Badge>
  }
  
  if (status === 'active') {
    return (
      <div className="space-y-1">
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100 rounded px-2 py-1 text-xs">
          Active
        </Badge>
        <div className="text-xs text-muted-foreground">{promo_code}</div>
      </div>
    )
  }
  
  return <Badge variant="outline" className="rounded px-3 py-1">Inactive</Badge>
}

const getPaymentStatusBadge = (profile: Profile) => {
  if (!profile.subscription) {
    return <Badge variant="outline" className="rounded px-3 py-1">Free User</Badge>
  }
  
  const { status, promo_code, plan_name } = profile.subscription
  
  if (status === 'active') {
    // Check if it's a Free Plan
    if (plan_name?.toLowerCase().includes('free')) {
      return <Badge variant="outline" className="rounded px-3 py-1">Free User</Badge>
    }
    
    if (promo_code) {
      // User has active subscription via promo code (promotional/free access)
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 rounded px-3 py-1">Promo Access</Badge>
    } else {
      // User has active paid subscription
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 rounded px-3 py-1">Paid User</Badge>
    }
  }
  
  return <Badge variant="outline" className="rounded px-3 py-1">Free User</Badge>
}

export function UserManagement() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [filteredProfiles, setFilteredProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [freezeDialogOpen, setFreezeDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [promotionDialogOpen, setPromotionDialogOpen] = useState(false)
  const [promoteToAdminDialogOpen, setPromoteToAdminDialogOpen] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [planFilter, setPlanFilter] = useState<string>('all')
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all')
  const [promoCodeFilter, setPromoCodeFilter] = useState<string>('all')
  const [lastLoginFilter, setLastLoginFilter] = useState<string>('all')

  useEffect(() => {
    fetchProfiles()
  }, [])

  // Filter profiles based on search query and filters
  useEffect(() => {
    let filtered = profiles
    
    // Apply search filter (now includes mobile)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(profile => {
        const displayName = getDisplayName(profile).toLowerCase()
        const email = profile.email.toLowerCase()
        const mobile = profile.mobile?.toLowerCase() || ''
        
        return displayName.includes(query) || 
               email.includes(query) || 
               mobile.includes(query)
      })
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(profile => {
        const status = profile.status || 'active'
        return status === statusFilter
      })
    }
    
    // Apply role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(profile => {
        const roles = profile.user_roles || []
        if (roleFilter === 'user') {
          return roles.length === 0 || !roles.some(r => r.role === 'admin')
        }
        return roles.some(r => r.role === roleFilter)
      })
    }
    
    // Apply plan filter
    if (planFilter !== 'all') {
      filtered = filtered.filter(profile => {
        if (planFilter === 'no_plan') {
          return !profile.subscription?.plan_name
        }
        const planName = profile.subscription?.plan_name?.toLowerCase() || ''
        return planName.includes(planFilter.toLowerCase())
      })
    }
    
    // Apply payment status filter
    if (paymentStatusFilter !== 'all') {
      filtered = filtered.filter(profile => {
        if (paymentStatusFilter === 'free') {
          return !profile.subscription || profile.subscription.status !== 'active'
        }
        if (paymentStatusFilter === 'paid') {
          return profile.subscription?.status === 'active' && !profile.subscription.promo_code
        }
        if (paymentStatusFilter === 'promo') {
          return profile.subscription?.status === 'active' && profile.subscription.promo_code
        }
        return false
      })
    }
    
    // Apply promo code filter
    if (promoCodeFilter !== 'all') {
      filtered = filtered.filter(profile => {
        if (promoCodeFilter === 'no_promo') {
          return !profile.subscription?.promo_code
        }
        if (promoCodeFilter === 'active_promo') {
          const hasPromo = profile.subscription?.promo_code
          const isActive = profile.subscription?.status === 'active'
          const isExpired = profile.subscription?.end_date && new Date(profile.subscription.end_date) < new Date()
          return hasPromo && isActive && !isExpired
        }
        if (promoCodeFilter === 'expired_promo') {
          const hasPromo = profile.subscription?.promo_code
          const isExpired = profile.subscription?.end_date && new Date(profile.subscription.end_date) < new Date()
          return hasPromo && isExpired
        }
        return false
      })
    }
    
    // Apply last login filter
    if (lastLoginFilter !== 'all') {
      const now = new Date()
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      
      filtered = filtered.filter(profile => {
        if (lastLoginFilter === 'never') {
          return !profile.last_login_at
        }
        
        if (!profile.last_login_at) return false
        
        const lastLogin = new Date(profile.last_login_at)
        
        switch (lastLoginFilter) {
          case 'today':
            return lastLogin >= oneDayAgo
          case 'week':
            return lastLogin >= oneWeekAgo && lastLogin < oneDayAgo
          case 'month':
            return lastLogin >= oneMonthAgo && lastLogin < oneWeekAgo
          case 'older':
            return lastLogin < oneMonthAgo
          default:
            return true
        }
      })
    }
    
    setFilteredProfiles(filtered)
  }, [profiles, searchQuery, statusFilter, roleFilter, planFilter, paymentStatusFilter, promoCodeFilter, lastLoginFilter])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setSearchQuery(query)
    
    // Update URL params
    if (query.trim()) {
      setSearchParams({ search: query })
    } else {
      setSearchParams({})
    }
  }

  const clearAllFilters = () => {
    setStatusFilter('all')
    setRoleFilter('all')
    setPlanFilter('all')
    setPaymentStatusFilter('all')
    setPromoCodeFilter('all')
    setLastLoginFilter('all')
    setSearchQuery('')
    setSearchParams({})
  }

  const hasActiveFilters = statusFilter !== 'all' || roleFilter !== 'all' || planFilter !== 'all' || 
                          paymentStatusFilter !== 'all' || promoCodeFilter !== 'all' || lastLoginFilter !== 'all' || searchQuery.trim() !== ''

  const exportToCSV = () => {
    // Define CSV headers
    const headers = [
        'Name',
        'Email', 
        'Mobile',
        'Status',
        'Role',
        'Payment Status',
        'Promo Code',
        'Plan',
        'Join Date',
        'Last Login'
    ]

    // Convert filtered profiles to CSV rows
    const csvData = filteredProfiles.map(profile => {
      const roles = profile.user_roles || []
      const hasAdmin = roles.some(r => r.role === 'admin')
      const role = hasAdmin ? 'Admin' : 'User'
      
      const paymentStatus = profile.subscription?.status === 'active' 
        ? (profile.subscription?.plan_name?.toLowerCase().includes('free') ? 'Free User'
           : profile.subscription?.promo_code ? 'Promo Access' : 'Paid User')
        : 'Free User'
      const promoStatus = profile.subscription?.promo_code 
        ? (profile.subscription?.end_date && new Date(profile.subscription.end_date) < new Date() 
           ? 'Expired Promo' : 'Active Promo')
        : 'No Promo'
      
      return [
        getDisplayName(profile),
        profile.email,
        profile.mobile || 'N/A',
        profile.status || 'Active',
        role,
        paymentStatus,
        promoStatus,
        profile.subscription?.plan_name || 'No Plan',
        formatJoinDate(profile.created_at),
        formatLastLogin(profile.last_login_at)
      ]
    })

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n')

    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `users-export-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const fetchProfiles = async () => {
    try {
      setLoading(true)
      
      // Fetch profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email_confirmed', true)
        .order('created_at', { ascending: false })
      
      if (profilesError) {
        throw profilesError
      }
      
      // Fetch user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
      
      if (rolesError) {
        throw rolesError
      }
      
      // Fetch user subscriptions with plan info
      const { data: subscriptionsData, error: subscriptionsError } = await supabase
        .from('user_subscriptions')
        .select(`
          user_id,
          status,
          end_date,
          promo_code,
          plans:plan_id (name)
        `)
        .eq('status', 'active')
      
      if (subscriptionsError) {
        console.warn('Error fetching subscriptions:', subscriptionsError)
        // Don't throw error here, just continue without subscription data
      }
      
      // Combine the data
      const profilesWithRoles = (profilesData || []).map(profile => {
        const userRoles = rolesData?.filter(role => role.user_id === profile.id) || []
        const userSubscription = subscriptionsData?.find(sub => sub.user_id === profile.id)
        
        let subscription = null
        if (userSubscription) {
          subscription = {
            plan_name: userSubscription.plans?.name || null,
            promo_code: userSubscription.promo_code,
            validity_period: null, // Will be fetched separately if needed
            status: userSubscription.status,
            end_date: userSubscription.end_date
          }
        }
        
        return {
          ...profile,
          user_roles: userRoles,
          subscription
        }
      })
      
      setProfiles(profilesWithRoles)
    } catch (err: any) {
      console.error('Error fetching profiles:', err)
      setError('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const getDisplayName = (profile: Profile) => {
    if (profile.first_name || profile.last_name) {
      return `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
    }
    return profile.email.split('@')[0] // Use email username as fallback
  }

  const formatJoinDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy')
  }

  const formatLastLogin = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return format(new Date(dateString), 'dd/MM/yyyy HH:mm')
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading users...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-destructive">{error}</div>
        </div>
      </div>
    )
  }
  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground">View, search, and manage all users of the Tagmentia platform.</p>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button 
            className="flex items-center space-x-2"
            onClick={() => setAddUserDialogOpen(true)}
          >
            <Plus className="h-4 w-4" />
            <span>Add User</span>
          </Button>
          <Button 
            variant="destructive" 
            className="flex items-center space-x-2"
            onClick={() => setBulkDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
            <span>Bulk Delete</span>
          </Button>
          <Button variant="outline" className="flex items-center space-x-2" onClick={exportToCSV}>
            <Download className="h-4 w-4" />
            <span>Export Data</span>
          </Button>
          <ClearRateLimitsDialog />
        </div>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or mobile..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="pl-10 w-80"
            />
          </div>
          
          {/* Status Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center space-x-2">
                <Filter className="h-4 w-4" />
                <span>Status</span>
                {statusFilter !== 'all' && <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 text-xs">1</Badge>}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-background border shadow-lg z-50">
              <DropdownMenuItem onClick={() => setStatusFilter('all')} className={statusFilter === 'all' ? 'bg-accent' : ''}>
                All Status
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setStatusFilter('active')} className={statusFilter === 'active' ? 'bg-accent' : ''}>
                Active
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter('frozen')} className={statusFilter === 'frozen' ? 'bg-accent' : ''}>
                Frozen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Role Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center space-x-2">
                <Filter className="h-4 w-4" />
                <span>Role</span>
                {roleFilter !== 'all' && <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 text-xs">1</Badge>}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-background border shadow-lg z-50">
              <DropdownMenuItem onClick={() => setRoleFilter('all')} className={roleFilter === 'all' ? 'bg-accent' : ''}>
                All Roles
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setRoleFilter('admin')} className={roleFilter === 'admin' ? 'bg-accent' : ''}>
                Admin
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setRoleFilter('user')} className={roleFilter === 'user' ? 'bg-accent' : ''}>
                User
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Plan Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center space-x-2">
                <Filter className="h-4 w-4" />
                <span>Plan</span>
                {planFilter !== 'all' && <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 text-xs">1</Badge>}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-background border shadow-lg z-50">
              <DropdownMenuItem onClick={() => setPlanFilter('all')} className={planFilter === 'all' ? 'bg-accent' : ''}>
                All Plans
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setPlanFilter('no_plan')} className={planFilter === 'no_plan' ? 'bg-accent' : ''}>
                No Plan
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPlanFilter('free')} className={planFilter === 'free' ? 'bg-accent' : ''}>
                Free
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPlanFilter('premium')} className={planFilter === 'premium' ? 'bg-accent' : ''}>
                Premium
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPlanFilter('gold')} className={planFilter === 'gold' ? 'bg-accent' : ''}>
                Gold
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Payment Status Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center space-x-2">
                <Filter className="h-4 w-4" />
                <span>Payment</span>
                {paymentStatusFilter !== 'all' && <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 text-xs">1</Badge>}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-background border shadow-lg z-50">
              <DropdownMenuItem onClick={() => setPaymentStatusFilter('all')} className={paymentStatusFilter === 'all' ? 'bg-accent' : ''}>
                All Payment Status
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setPaymentStatusFilter('paid')} className={paymentStatusFilter === 'paid' ? 'bg-accent' : ''}>
                Paid Users
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPaymentStatusFilter('promo')} className={paymentStatusFilter === 'promo' ? 'bg-accent' : ''}>
                Promo Access
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPaymentStatusFilter('free')} className={paymentStatusFilter === 'free' ? 'bg-accent' : ''}>
                Free Users
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Promo Code Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center space-x-2">
                <Filter className="h-4 w-4" />
                <span>Promo</span>
                {promoCodeFilter !== 'all' && <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 text-xs">1</Badge>}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-background border shadow-lg z-50">
              <DropdownMenuItem onClick={() => setPromoCodeFilter('all')} className={promoCodeFilter === 'all' ? 'bg-accent' : ''}>
                All Promo Status
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setPromoCodeFilter('active_promo')} className={promoCodeFilter === 'active_promo' ? 'bg-accent' : ''}>
                Active Promo
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPromoCodeFilter('expired_promo')} className={promoCodeFilter === 'expired_promo' ? 'bg-accent' : ''}>
                Expired Promo
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPromoCodeFilter('no_promo')} className={promoCodeFilter === 'no_promo' ? 'bg-accent' : ''}>
                No Promo
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Last Login Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center space-x-2">
                <Filter className="h-4 w-4" />
                <span>Last Login</span>
                {lastLoginFilter !== 'all' && <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 text-xs">1</Badge>}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-background border shadow-lg z-50">
              <DropdownMenuItem onClick={() => setLastLoginFilter('all')} className={lastLoginFilter === 'all' ? 'bg-accent' : ''}>
                All Users
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setLastLoginFilter('today')} className={lastLoginFilter === 'today' ? 'bg-accent' : ''}>
                Last 24 Hours
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLastLoginFilter('week')} className={lastLoginFilter === 'week' ? 'bg-accent' : ''}>
                Last Week
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLastLoginFilter('month')} className={lastLoginFilter === 'month' ? 'bg-accent' : ''}>
                Last Month
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLastLoginFilter('older')} className={lastLoginFilter === 'older' ? 'bg-accent' : ''}>
                Older than 30 days
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLastLoginFilter('never')} className={lastLoginFilter === 'never' ? 'bg-accent' : ''}>
                Never logged in
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <Button variant="outline" size="icon" onClick={clearAllFilters} title="Clear all filters">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Payment Status</TableHead>
                <TableHead>Promo Code</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Join Date</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProfiles.map((profile) => (
                <TableRow key={profile.id}>
                  <TableCell className="font-medium">{getDisplayName(profile)}</TableCell>
                  <TableCell className="text-muted-foreground">{profile.email}</TableCell>
                  <TableCell className="text-muted-foreground">{profile.mobile || 'N/A'}</TableCell>
                  <TableCell>{getStatusBadge(profile.status)}</TableCell>
                  <TableCell>{getRoleBadge(profile)}</TableCell>
                  <TableCell>{getPaymentStatusBadge(profile)}</TableCell>
                  <TableCell>{getPromoCodeBadge(profile)}</TableCell>
                  <TableCell>{getPlanBadge(profile)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatJoinDate(profile.created_at)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatLastLogin(profile.last_login_at)}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => {
                          setSelectedUser(profile)
                          setEditDialogOpen(true)
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {/* Only show promote to admin button for non-admin users */}
                      {!profile.user_roles?.some(r => r.role === 'admin') && (
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => {
                            setSelectedUser(profile)
                            setPromoteToAdminDialogOpen(true)
                          }}
                          title="Promote to Admin"
                          className="text-amber-600 hover:text-amber-800"
                        >
                          <Shield className="h-4 w-4" />
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => {
                          setSelectedUser(profile)
                          setPromotionDialogOpen(true)
                        }}
                        title="Manage Promotions"
                      >
                        <Gift className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => {
                          setSelectedUser(profile)
                          setFreezeDialogOpen(true)
                        }}
                        className={profile.status === 'frozen' ? 'text-blue-600 hover:text-blue-800' : ''}
                      >
                        <Snowflake className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-red-600 hover:text-red-800"
                        onClick={() => {
                          setSelectedUser(profile)
                          setDeleteDialogOpen(true)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredProfiles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                    {searchQuery ? `No users found matching "${searchQuery}"` : "No users found"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {searchQuery ? 
            `Showing ${filteredProfiles.length} of ${profiles.length} users` : 
            `Total users: ${profiles.length}`
          }
        </p>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="icon">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Dialogs */}
      <AddUserDialog
        open={addUserDialogOpen}
        onOpenChange={setAddUserDialogOpen}
        onUserAdded={fetchProfiles}
      />
      <EditUserDialog
        user={selectedUser}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onUserUpdated={fetchProfiles}
      />
      <FreezeUserDialog
        user={selectedUser}
        open={freezeDialogOpen}
        onOpenChange={setFreezeDialogOpen}
        onUserUpdated={fetchProfiles}
      />
      <DeleteUserDialog
        user={selectedUser}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onUserDeleted={fetchProfiles}
      />
      <BulkDeleteUsersDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
        onUsersDeleted={fetchProfiles}
      />
      <PromotionManagementDialog
        open={promotionDialogOpen}
        onOpenChange={setPromotionDialogOpen}
        selectedUser={selectedUser}
        onSuccess={fetchProfiles}
      />
      <PromoteToAdminDialog
        user={selectedUser}
        open={promoteToAdminDialogOpen}
        onOpenChange={setPromoteToAdminDialogOpen}
        onUserPromoted={fetchProfiles}
      />
    </div>
  )
}