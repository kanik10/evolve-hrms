import * as React from "react"
import { useForm, type UseFormReturn } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { type DepartmentFormValues } from "../types"
import { organizationBusinessUnits, organizationCostCenters, organizationEmployees, organizationLocations } from "../../data/organizationData"

// ── Schema ───────────────────────────────────────────────────────────────────

export const departmentFormSchema = z.object({
  name: z.string().min(1, "Department name is required"),
  code: z
    .string()
    .min(1, "Department code is required")
    .max(10, "Code must be 10 characters or less")
    .regex(
      /^[A-Z0-9_-]+$/,
      "Uppercase letters, numbers, hyphens, or underscores only"
    ),
  headId: z.string().min(1, "Department head is required"),
  businessUnit: z.string().min(1, "Business unit is required"),
  costCenter: z.string().min(1, "Cost center is required"),
  location: z.string().min(1, "Primary location is required"),
  description: z.string().optional(),
  status: z.enum(["Active", "Inactive"]),
})

export type DepartmentSchema = z.infer<typeof departmentFormSchema>

// ── Component ────────────────────────────────────────────────────────────────

interface DepartmentFormProps {
  form: UseFormReturn<DepartmentFormValues>
  isEdit?: boolean
}

export function DepartmentForm({ form, isEdit = false }: DepartmentFormProps) {
  const [codeEdited, setCodeEdited] = React.useState(isEdit)
  const nameValue = form.watch("name")

  React.useEffect(() => {
    if (codeEdited || !nameValue.trim()) return
    const parts = nameValue
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
    const generated =
      parts.length > 1
        ? parts
            .slice(0, 3)
            .map((w) => w.slice(0, 3))
            .join("-")
            .slice(0, 10)
        : nameValue
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, "")
            .slice(0, 8)
    form.setValue("code", generated, { shouldValidate: false })
  }, [nameValue, codeEdited])

  return (
    <Form {...form}>
      <div className="space-y-5">
        {/* Name */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Department Name <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input placeholder="e.g. Engineering" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Code */}
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Department Code <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="ENG"
                  className="font-mono uppercase tracking-widest"
                  maxLength={10}
                  {...field}
                  onChange={(e) => {
                    setCodeEdited(true)
                    field.onChange(
                      e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "")
                    )
                  }}
                />
              </FormControl>
              <FormDescription>
                {isEdit
                  ? "Short identifier used in reports."
                  : "Auto-generated from name — edit to override."}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Head */}
        <FormField
          control={form.control}
          name="headId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Department Head <span className="text-destructive">*</span>
              </FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department head" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {organizationEmployees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Business Unit */}
        <FormField
          control={form.control}
          name="businessUnit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Business Unit <span className="text-destructive">*</span>
              </FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select business unit" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {organizationBusinessUnits.map((bu) => (
                    <SelectItem key={bu.id} value={bu.name}>
                      {bu.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Cost Center */}
        <FormField
          control={form.control}
          name="costCenter"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Cost Center <span className="text-destructive">*</span>
              </FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select cost center" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {organizationCostCenters.map((cc) => (
                    <SelectItem key={cc.id} value={cc.name}>
                      {cc.code} - {cc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Primary Location */}
        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Primary Location <span className="text-destructive">*</span>
              </FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select primary location" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {organizationLocations.map((location) => (
                    <SelectItem key={location.id} value={location.name}>
                      {location.name} · {location.city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Status */}
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Status <span className="text-destructive">*</span>
              </FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Brief description of the department's function..."
                  className="resize-none"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </Form>
  )
}

// ── Default values ────────────────────────────────────────────────────────────

export const DEFAULT_DEPT_FORM_VALUES: DepartmentFormValues = {
  name: "",
  code: "",
  headId: "",
  businessUnit: "",
  costCenter: "",
  location: "",
  description: "",
  status: "Active",
}

// ── Form hook factory ─────────────────────────────────────────────────────────

export function useDepartmentForm(defaultValues?: Partial<DepartmentFormValues>) {
  return useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentFormSchema),
    defaultValues: { ...DEFAULT_DEPT_FORM_VALUES, ...defaultValues },
    mode: "onTouched",
  })
}
