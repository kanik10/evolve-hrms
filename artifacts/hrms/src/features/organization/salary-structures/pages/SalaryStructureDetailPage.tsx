import * as React from "react"
import { ArrowLeft, Banknote, GraduationCap, Pencil, Users } from "lucide-react"
import { useLocation, useParams } from "wouter"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AppLayout } from "@/components/layout/AppLayout"
import { RelationshipCard } from "../../components/RelationshipCard"
import { organizationEmployees, organizationGrades } from "../../data/organizationData"
import { SalaryStructureDrawer } from "../components/SalaryStructureDrawer"
import { calculateNetSalary, getSalaryStructures, type SalaryStructureFormValues, type SalaryStructureRecord } from "../data/salaryStructures"

export default function SalaryStructureDetailPage() {
  const params = useParams<{ id: string }>()
  const [, navigate] = useLocation()
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const [salaryStructure, setSalaryStructure] = React.useState<SalaryStructureRecord | undefined>(() => {
    const structures = getSalaryStructures()
    return structures.find((item) => item.id === params.id)
  })

  React.useEffect(() => {
    const structures = getSalaryStructures()
    setSalaryStructure(structures.find((item) => item.id === params.id))
  }, [params.id])

  if (!salaryStructure) {
    return (
      <AppLayout breadcrumb={<div className="text-sm text-muted-foreground">Salary structure details</div>}>
        <div className="rounded-xl border bg-card p-10 text-center">
          <h2 className="text-lg font-semibold">Salary structure not found</h2>
          <p className="mt-2 text-sm text-muted-foreground">The requested salary structure could not be found.</p>
          <Button className="mt-6" onClick={() => navigate("/organization/salary-structures")}>Back to salary structures</Button>
        </div>
      </AppLayout>
    )
  }

  const handleSubmit = (values: SalaryStructureFormValues) => {
    const nextStructures = getSalaryStructures().map((item) => (item.id === salaryStructure.id ? { ...item, ...values } : item))
    const updatedStructure = nextStructures.find((item) => item.id === salaryStructure.id)
    setSalaryStructure(updatedStructure)
    setDrawerOpen(false)
  }

  const netSalary = calculateNetSalary({
    structureName: salaryStructure.structureName,
    grade: salaryStructure.grade,
    basic: salaryStructure.basic,
    hra: salaryStructure.hra,
    specialAllowance: salaryStructure.specialAllowance,
    bonus: salaryStructure.bonus,
    pf: salaryStructure.pf,
    esic: salaryStructure.esic,
    professionalTax: salaryStructure.professionalTax,
    tds: salaryStructure.tds,
    status: salaryStructure.status,
  })
  const assignedEmployees = organizationEmployees.filter((employee) => employee.salaryStructureId === salaryStructure.id)
  const relatedGrades = organizationGrades.filter((grade) => grade.name === salaryStructure.grade)

  return (
    <AppLayout breadcrumb={<div className="text-sm text-muted-foreground">Salary structure details</div>}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 border-b pb-6 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <Button variant="ghost" className="h-8 px-0" onClick={() => navigate("/organization/salary-structures")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to salary structures
            </Button>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Banknote className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-semibold">{salaryStructure.structureName}</h1>
                  <Badge variant={salaryStructure.status === "Active" ? "default" : "secondary"}>{salaryStructure.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">Grade: {salaryStructure.grade}</p>
              </div>
            </div>
          </div>
          <Button onClick={() => setDrawerOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit structure
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Compensation summary</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Net salary</p>
              <p className="mt-1 text-sm">₹{netSalary.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Basic</p>
              <p className="mt-1 text-sm">₹{Number(salaryStructure.basic).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">HRA</p>
              <p className="mt-1 text-sm">₹{Number(salaryStructure.hra).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Special allowance</p>
              <p className="mt-1 text-sm">₹{Number(salaryStructure.specialAllowance).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Bonus</p>
              <p className="mt-1 text-sm">₹{Number(salaryStructure.bonus).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">PF</p>
              <p className="mt-1 text-sm">₹{Number(salaryStructure.pf).toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <RelationshipCard
            title="Grades"
            icon={GraduationCap}
            items={relatedGrades.map((grade) => ({
              id: grade.id,
              title: grade.name,
              subtitle: grade.level,
              meta: grade.salaryRange,
              status: grade.status,
            }))}
          />
          <RelationshipCard
            title="Assigned Employees"
            icon={Users}
            items={assignedEmployees.map((employee) => ({
              id: employee.id,
              title: employee.name,
              subtitle: employee.designation,
              meta: employee.department,
              status: employee.status,
              tags: employee.location ? [employee.location] : undefined,
            }))}
          />
        </div>
      </div>

      <SalaryStructureDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        mode="edit"
        initialValues={{
          structureName: salaryStructure.structureName,
          grade: salaryStructure.grade,
          basic: salaryStructure.basic,
          hra: salaryStructure.hra,
          specialAllowance: salaryStructure.specialAllowance,
          bonus: salaryStructure.bonus,
          pf: salaryStructure.pf,
          esic: salaryStructure.esic,
          professionalTax: salaryStructure.professionalTax,
          tds: salaryStructure.tds,
          status: salaryStructure.status,
        }}
        onSubmit={handleSubmit}
      />
    </AppLayout>
  )
}
