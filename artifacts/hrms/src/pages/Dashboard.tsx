import * as React from "react"
import { AppLayout } from "@/components/layout/AppLayout"
import { PageHeader } from "@/components/PageHeader"
import { StatCard } from "@/components/StatCard"
import { ChartCard } from "@/components/ChartCard"
import { 
  Users, 
  Building, 
  CalendarOff, 
  Banknote, 
  Activity, 
  TrendingDown,
  ArrowUpRight,
  MoreHorizontal,
  Upload
} from "lucide-react"
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from "recharts"
import { 
  chartDataHeadcount, 
  chartDataDepartment,
  chartDataAttendance,
  mockEmployees 
} from "@/data/mockData"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export default function Dashboard() {
  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  return (
    <AppLayout breadcrumb={<span className="text-sm font-medium">Executive Dashboard</span>}>
      <PageHeader 
        title="Overview" 
        description="Here's what's happening across your organization today."
        action={
          <Button>
            Generate Report
            <ArrowUpRight className="ml-2 h-4 w-4" />
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <StatCard title="Total Employees" value="2,847" icon={<Users className="h-5 w-5" />} trend={{ value: "12% yoy", positive: true }} />
        <StatCard title="Departments" value="24" icon={<Building className="h-5 w-5" />} />
        <StatCard title="Pending Leaves" value="142" icon={<CalendarOff className="h-5 w-5" />} trend={{ value: "5 since yesterday", positive: false }} />
        <StatCard title="Payroll Processed" value="₹4.2Cr" icon={<Banknote className="h-5 w-5" />} trend={{ value: "On track", positive: true }} />
        <StatCard title="Attendance" value="94.2%" icon={<Activity className="h-5 w-5" />} trend={{ value: "2.1% wtw", positive: true }} />
        <StatCard title="Attrition" value="3.8%" icon={<TrendingDown className="h-5 w-5" />} trend={{ value: "0.2% improvement", positive: true }} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <ChartCard title="Headcount Trend" description="Growth over the last 12 months" className="lg:col-span-2">
          <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartDataHeadcount}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Department Distribution" description="Headcount by department">
          <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartDataDepartment}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartDataDepartment.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <ChartCard title="Recent Employees" description="Latest additions to the team">
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-left">
                    <th className="pb-3 font-medium">Employee</th>
                    <th className="pb-3 font-medium">Department</th>
                    <th className="pb-3 font-medium">Joined</th>
                    <th className="pb-3 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {mockEmployees.slice(0, 5).map((emp, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {emp.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-foreground">{emp.name}</p>
                            <p className="text-xs text-muted-foreground">{emp.designation}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-muted-foreground">{emp.department}</td>
                      <td className="py-3 text-muted-foreground">{emp.joiningDate}</td>
                      <td className="py-3 text-right">
                        <Badge variant={emp.status === 'Active' ? 'success' : 'secondary'}>
                          {emp.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 text-center">
              <Button variant="ghost" className="w-full text-primary hover:text-primary">
                View All Employees
              </Button>
            </div>
          </ChartCard>
        </div>

        <div className="space-y-6">
          <ChartCard title="Quick Actions">
            <div className="grid grid-cols-2 gap-3 mt-4">
              <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 border-dashed hover:border-primary">
                <Users className="h-5 w-5 text-primary" />
                <span className="text-xs">Add Employee</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 border-dashed hover:border-primary">
                <Banknote className="h-5 w-5 text-primary" />
                <span className="text-xs">Run Payroll</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 border-dashed hover:border-primary">
                <CalendarOff className="h-5 w-5 text-primary" />
                <span className="text-xs">Approve Leaves</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 border-dashed hover:border-primary">
                <Upload className="h-5 w-5 text-primary" />
                <span className="text-xs">Upload Data</span>
              </Button>
            </div>
          </ChartCard>

          <ChartCard title="Upcoming Holidays">
            <div className="space-y-4 mt-4">
              {[
                { name: "Independence Day", date: "15 Aug 2024", days: "in 12 days" },
                { name: "Gandhi Jayanti", date: "02 Oct 2024", days: "in 60 days" },
                { name: "Dussehra", date: "12 Oct 2024", days: "in 70 days" },
              ].map((holiday, i) => (
                <div key={i} className="flex items-center justify-between border-l-2 border-primary pl-3">
                  <div>
                    <p className="text-sm font-medium">{holiday.name}</p>
                    <p className="text-xs text-muted-foreground">{holiday.date}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{holiday.days}</Badge>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>
      </div>
    </AppLayout>
  )
}
