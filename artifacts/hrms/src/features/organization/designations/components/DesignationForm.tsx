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
import { type DesignationFormValues } from "../types"
import { DEPARTMENT_OPTIONS, GRADE_OPTIONS } from "../data/mock"

// ── Schema ───────────────────────────────────────────────────────────────────

export const designationFormSchema = z.object({
  name: z.string().min(1, "Designation name is required"),
  code: z
    .string()
    .min(1, "Code is required")
    .max(10, "Max 10 characters")
    .regex(
      /^[A-Z0-9_-]+$/,
      "Uppercase letters, numbers, hyphens, or underscores only"
    ),
  departmentId: z.string().min(1, "Department is required"),
  gradeId: z.string().min(1, "Grade is required"),
  description: z.string().optional(),
  status: z.enum(["Active", "Inactive"]),
})

// ── Default values ────────────────────────────────────────────────────────────

export const DEFAULT_DESG_FORM_VALUES: DesignationFormValues = {
  name: "",
  code: "",
  departmentId: "",
  gradeId: "",
  description: "",
  status: "Active",
}

// ── Form component ────────────────────────────────────────────────────────────

interface DesignationFormProps {
  form: UseFormReturn<DesignationFormValues>
  isEdit?: boolean
}

export function DesignationForm({ form, isEdit = false }: DesignationFormProps) {
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
                Designation Name <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input placeholder="e.g. Senior Engineer" {...field} />
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
                Code <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="SR-ENG"
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
                  ? "Short identifier used in reports and payslips."
                  : "Auto-generated from name — edit to override."}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Department */}
        <FormField
          control={form.control}
          name="departmentId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Department <span className="text-destructive">*</span>
              </FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {DEPARTMENT_OPTIONS.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Grade */}
        <FormField
          control={form.control}
          name="gradeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Grade <span className="text-destructive">*</span>
              </FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select grade band" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {GRADE_OPTIONS.map((grade) => (
                    <SelectItem key={grade.id} value={grade.id}>
                      {grade.id} – {grade.band} ({grade.salaryRange})
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
                  placeholder="Brief description of the role and responsibilities..."
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
