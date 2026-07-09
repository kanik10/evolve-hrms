import * as React from "react"
import { Calculator, TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { calculateNetSalary, type SalaryStructureFormValues } from "../data/salaryStructures"

interface SalaryStructureBuilderProps {
  values: SalaryStructureFormValues
  onChange: (key: keyof SalaryStructureFormValues, value: string) => void
}

function MoneyField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type="number" min="0" value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  )
}

export function SalaryStructureBuilder({ values, onChange }: SalaryStructureBuilderProps) {
  const netSalary = calculateNetSalary(values)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Structure overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Structure Name</Label>
              <Input value={values.structureName} onChange={(event) => onChange("structureName", event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Grade</Label>
              <Input value={values.grade} onChange={(event) => onChange("grade", event.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={values.status} onValueChange={(value) => onChange("status", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Earnings</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <MoneyField label="Basic" value={values.basic} onChange={(value) => onChange("basic", value)} />
              <MoneyField label="HRA" value={values.hra} onChange={(value) => onChange("hra", value)} />
              <MoneyField label="Special Allowance" value={values.specialAllowance} onChange={(value) => onChange("specialAllowance", value)} />
              <MoneyField label="Bonus" value={values.bonus} onChange={(value) => onChange("bonus", value)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Deductions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <MoneyField label="PF" value={values.pf} onChange={(value) => onChange("pf", value)} />
              <MoneyField label="ESIC" value={values.esic} onChange={(value) => onChange("esic", value)} />
              <MoneyField label="Professional Tax" value={values.professionalTax} onChange={(value) => onChange("professionalTax", value)} />
              <MoneyField label="TDS" value={values.tds} onChange={(value) => onChange("tds", value)} />
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Net Salary Formula
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-sm font-medium">Net Salary</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-2xl font-semibold">₹{netSalary.toLocaleString()}</span>
                <Badge variant="secondary">Live preview</Badge>
              </div>
            </div>
            <Separator />
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Total Earnings</span>
                <span className="font-medium text-foreground">₹{(Number(values.basic) + Number(values.hra) + Number(values.specialAllowance) + Number(values.bonus)).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Total Deductions</span>
                <span className="font-medium text-foreground">₹{(Number(values.pf) + Number(values.esic) + Number(values.professionalTax) + Number(values.tds)).toLocaleString()}</span>
              </div>
            </div>
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              Formula: Total Earnings − Total Deductions = Net Salary
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
