import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Users, 
  CreditCard, 
  DollarSign, 
  PlayCircle, 
  TrendingUp, 
  UserPlus, 
  FileText, 
  Eye,
  BarChart3,
  ArrowUpIcon,
  ArrowDownIcon,
  FolderOpen
} from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { AddUserDialog } from "@/components/admin/AddUserDialog"
import { toast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { useAdminDashboardData } from "@/hooks/useAdminDashboardData"

export function AdminDashboard() {
  const navigate = useNavigate()
  const [showAddUserDialog, setShowAddUserDialog] = useState(false)
  const { stats, loading, error } = useAdminDashboardData()

  const handleAddNewUser = () => {
    setShowAddUserDialog(true)
  }

  const handleCreateSubscription = () => {
    navigate('/admin/subscriptions')
  }

  const handleViewSystemLogs = () => {
    toast({
      title: "System Logs",
      description: "Check the Supabase dashboard for detailed system logs and analytics.",
    })
  }

  const handleGenerateReport = async () => {
    try {
      toast({
        title: "Generating Report",
        description: "Your user report is being prepared...",
      })
      
      // Fetch user data for the report
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Create CSV content
      const headers = ['ID', 'Email', 'First Name', 'Last Name', 'Status', 'Created At']
      const csvContent = [
        headers.join(','),
        ...profiles.map(profile => [
          profile.id,
          profile.email || '',
          profile.first_name || '',
          profile.last_name || '',
          profile.status || 'active',
          new Date(profile.created_at).toISOString().split('T')[0]
        ].join(','))
      ].join('\n')

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `users-report-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      toast({
        title: "Report Generated",
        description: "User report has been downloaded successfully.",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate report",
        variant: "destructive",
      })
    }
  }

  const handleUserAdded = () => {
    toast({
      title: "Success",
      description: "User has been added successfully.",
    })
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Admin Dashboard Home</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "Loading..." : stats.totalUsers.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Total registered users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Subscriptions</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "Loading..." : stats.activeSubscriptions.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently active subscriptions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Revenue This Month</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "Loading..." : `$${stats.totalRevenue.toLocaleString()}`}
            </div>
            <p className="text-xs text-muted-foreground">
              Total recurring revenue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Videos</CardTitle>
            <PlayCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "Loading..." : stats.videosCount.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Total videos saved by users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Categories</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "Loading..." : stats.categoriesCount.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Total categories created by users
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>User Growth Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-[300px]">
                <div className="text-muted-foreground">Loading chart data...</div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stats.userGrowthData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="users" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  dot={{ fill: '#3B82F6' }}
                />
              </LineChart>
            </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subscription Plan Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-[300px]">
                <div className="text-muted-foreground">Loading chart data...</div>
              </div>
            ) : stats.subscriptionData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={stats.subscriptionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {stats.subscriptionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center mt-4 space-x-4">
                  {stats.subscriptionData.map((item) => (
                    <div key={item.name} className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm text-muted-foreground">{item.name}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-[300px]">
                <div className="text-muted-foreground">No subscription data available</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Button 
              className="h-12 flex items-center justify-center space-x-2"
              onClick={handleAddNewUser}
            >
              <UserPlus className="h-4 w-4" />
              <span>Add New User</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-12 flex items-center justify-center space-x-2"
              onClick={handleViewSystemLogs}
            >
              <Eye className="h-4 w-4" />
              <span>View System Logs</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-12 flex items-center justify-center space-x-2"
              onClick={handleGenerateReport}
            >
              <BarChart3 className="h-4 w-4" />
              <span>Generate Report</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <AddUserDialog
        open={showAddUserDialog}
        onOpenChange={setShowAddUserDialog}
        onUserAdded={handleUserAdded}
      />
    </div>
  )
}