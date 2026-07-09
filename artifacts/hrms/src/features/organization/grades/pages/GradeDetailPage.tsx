import * as React from "react"
import { ArrowLeft, BarChart2, Pencil } from "lucide-react"
import { useLocation, useParams } from "wouter"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AppLayout } from "@/components/layout/AppLayout"
import { GradeDrawer } from "../components/GradeDrawer"
import { createEmptyGradeFormValues, getGrades, type GradeFormValues, type GradeRecord } from "../data/grades"

export default function GradeDetailPage() {
  const params = useParams<{ id: string }>()
  const [, navigate] = useLocation()
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const [grade, setGrade] = React.useState<GradeRecord | undefined>(() => {
    const grades = getGrades()
    return grades.find((item) => item.id === params.id)
  })

  React.useEffect(() => {
    const grades = getGrades()
    setGrade(grades.find((item) => item.id === params.id))
  }, [params.id])

  if (!grade) {
    return (
      <AppLayout breadcrumb={<div className="text-sm text-muted-foreground">Grade</div>}>
        <div className="rounded-xl border bg-card p-10 text-center">
          <h2 className="text-lg font-semibold">Grade not found</h2>
          <p className="mt-2 text-sm text-muted-foreground">The requested grade could not be found.</p>
          <Button className="mt-6" onClick={() => navigate("/organization/grades")}>Back to grades</Button>
        </div>
      </AppLayout>
    )
  }

  const handleSubmit = (values: GradeFormValues) => {
    const nextGrades = getGrades().map((item) => (item.id === grade.id ? { ...item, ...values } : item))
    const updatedGrade = nextGrades.find((item) => item.id === grade.id)
    setGrade(updatedGrade)
    setDrawerOpen(false)
  }

  return (
    <AppLayout breadcrumb={<div className="text-sm text-muted-foreground">Grade details</div>}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 border-b pb-6 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <Button variant="ghost" className="h-8 px-0" onClick={() => navigate("/organization/grades")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to grades
            </Button>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <BarChart2 className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-semibold">{grade.grade}</h1>
                  <Badge variant={grade.status === "Active" ? "default" : "secondary"}>{grade.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">Level {grade.level}</p>
              </div>
            </div>
          </div>
          <Button onClick={() => setDrawerOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit grade
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Grade overview</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Level</p>
              <p className="mt-1 text-sm">{grade.level}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Salary band</p>
              <p className="mt-1 text-sm">{grade.salaryBand}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Description</p>
              <p className="mt-1 text-sm">{grade.description}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <GradeDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        mode="edit"
        initialValues={{
          grade: grade.grade,
          level: grade.level,
          description: grade.description,
          salaryBand: grade.salaryBand,
          status: grade.status,
        }}
        onSubmit={handleSubmit}
      />
    </AppLayout>
  )
}
