import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
  DollarSign, 
  TrendingUp, 
  Calendar, 
  Download,
  ArrowUpIcon,
  Loader2
} from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { useBillingData } from "@/hooks/useBillingData"

const getStatusBadge = (status: string) => {
  switch (status) {
    case "Paid":
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Paid</Badge>
    case "Due":
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Due</Badge>
    case "Cancelled":
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Cancelled</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

export function BillingOverview() {
  const { stats, subscriptionDistribution, revenueData, subscribers, loading, error } = useBillingData();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Billing Overview</h1>
        <Button className="flex items-center space-x-2">
          <Download className="h-4 w-4" />
          <span>Export All Reports</span>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Active Subscriptions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalActiveSubscriptions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground flex items-center">
              <ArrowUpIcon className="h-3 w-3 text-green-600 mr-1" />
              {stats.subscriptionGrowth > 0 ? `+${stats.subscriptionGrowth.toFixed(1)}%` : '0%'} vs last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Recurring Revenue (MRR)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.monthlyRecurringRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground flex items-center">
              <ArrowUpIcon className="h-3 w-3 text-green-600 mr-1" />
              {stats.revenueGrowth > 0 ? `+${stats.revenueGrowth.toFixed(1)}%` : '0%'} vs last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Annual Recurring Revenue (ARR)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.annualRecurringRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground flex items-center">
              <ArrowUpIcon className="h-3 w-3 text-green-600 mr-1" />
              {stats.revenueGrowth > 0 ? `+${(stats.revenueGrowth * 12).toFixed(1)}%` : '0%'} vs last year
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Next Billing Cycle Revenue</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.nextBillingCycleRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Due in 30 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Subscription Plan Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {subscriptionDistribution.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={subscriptionDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {subscriptionDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center mt-4 space-x-4 flex-wrap">
                  {subscriptionDistribution.map((item) => (
                    <div key={item.name} className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm text-muted-foreground">{item.name} ({item.value})</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No subscription data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Revenue Growth</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Revenue']} />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    dot={{ fill: '#3B82F6' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No revenue data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Current Subscribers Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Current Subscribers</CardTitle>
          <Button variant="outline" className="flex items-center space-x-2">
            <Download className="h-4 w-4" />
            <span>Export</span>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subscriber</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>Last Payment</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscribers.length > 0 ? (
                subscribers.map((subscriber) => (
                  <TableRow key={subscriber.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{subscriber.name}</div>
                        <div className="text-sm text-muted-foreground">{subscriber.email}</div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{subscriber.plan}</TableCell>
                    <TableCell className="text-muted-foreground">{subscriber.startDate}</TableCell>
                    <TableCell className="text-muted-foreground">{subscriber.lastPayment || 'N/A'}</TableCell>
                    <TableCell>{getStatusBadge(subscriber.status)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No active subscribers found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}