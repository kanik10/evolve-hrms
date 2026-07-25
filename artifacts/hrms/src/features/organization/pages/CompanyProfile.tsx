import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  Building2,
  Palette,
  Phone,
  MapPin,
  FileText,
  Settings,
  Save,
  RotateCcw,
  Upload,
  CalendarClock,
  Globe2,
  Landmark,
  Mail,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
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
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { OrgLayout } from "../components/OrgLayout"
import { OrgPageHeader } from "../components/OrgPageHeader"
import { FormSection } from "../components/FormSection"

// ── Validation Schema ────────────────────────────────────────────────────────

const schema = z
  .object({
    companyName: z.string().min(1, "Company name is required"),
    legalName: z.string().min(1, "Legal name is required"),
    industry: z.string().min(1, "Please select an industry"),

    website: z
      .string()
      .refine(
        (val) => !val || /^https?:\/\/.+\..+/.test(val),
        "Enter a valid URL (e.g. https://company.com)"
      )
      .optional()
      .or(z.literal("")),
    companyEmail: z
      .string()
      .min(1, "Email address is required")
      .email("Enter a valid email address"),
    phoneNumber: z.string().min(10, "Enter a valid phone number"),

    address: z.string().min(1, "Registered address is required"),
    city: z.string().min(1, "City is required"),
    state: z.string().min(1, "Please select a state"),
    country: z.string().min(1, "Please select a country"),
    pincode: z.string().regex(/^\d{6}$/, "Pincode must be 6 digits"),

    gstNumber: z
      .string()
      .refine(
        (val) =>
          !val ||
          /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(val),
        "Invalid GSTIN format (e.g. 22AAAAA0000A1Z5)"
      )
      .optional()
      .or(z.literal("")),
    panNumber: z
      .string()
      .refine(
        (val) => !val || /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(val),
        "Invalid PAN format (e.g. ABCDE1234F)"
      )
      .optional()
      .or(z.literal("")),
    cinNumber: z.string().optional().or(z.literal("")),
    tanNumber: z
      .string()
      .refine(
        (val) => !val || /^[A-Z]{4}[0-9]{5}[A-Z]{1}$/.test(val),
        "Invalid TAN format (e.g. ABCD12345E)"
      )
      .optional()
      .or(z.literal("")),
    pfRegistrationNumber: z.string().optional().or(z.literal("")),
    esiRegistrationNumber: z.string().optional().or(z.literal("")),
    professionalTaxNumber: z.string().optional().or(z.literal("")),

    currency: z.string().min(1, "Please select a currency"),
    timezone: z.string().min(1, "Please select a timezone"),
    financialYear: z.string().min(1, "Please select a financial year"),
    language: z.string().min(1, "Please select a language"),
    dateFormat: z.string().min(1, "Please select a date format"),
    timeFormat: z.string().min(1, "Please select a time format"),
    numberFormat: z.string().min(1, "Please select a number format"),
    workingDays: z.array(z.string()).min(1, "Select at least one working day"),
    businessHoursStart: z.string().min(1, "Start time is required"),
    businessHoursEnd: z.string().min(1, "End time is required"),
    brandDisplayName: z.string().optional().or(z.literal("")),
    brandTagline: z.string().optional().or(z.literal("")),
    brandPrimaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Use a valid hex color"),
    brandAccentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Use a valid hex color"),
    hrContactName: z.string().min(1, "HR contact name is required"),
    hrContactEmail: z.string().email("Enter a valid HR email address"),
    hrContactPhone: z.string().min(10, "Enter a valid HR contact number"),
    financeContactName: z.string().min(1, "Finance contact name is required"),
    financeContactEmail: z.string().email("Enter a valid finance email address"),
    supportEmail: z.string().email("Enter a valid support email address"),
  })
  .refine(
    (data) => {
      if (!data.businessHoursStart || !data.businessHoursEnd) return true
      return data.businessHoursStart < data.businessHoursEnd
    },
    {
      message: "End time must be after start time",
      path: ["businessHoursEnd"],
    }
  )

type FormValues = z.infer<typeof schema>

// ── Static Data ──────────────────────────────────────────────────────────────

const INDUSTRIES = [
  "Technology & Software",
  "Healthcare & Pharmaceuticals",
  "Finance & Banking",
  "Education",
  "Retail & E-commerce",
  "Manufacturing",
  "Consulting & Professional Services",
  "Media & Entertainment",
  "Real Estate",
  "Logistics & Supply Chain",
  "Telecommunications",
  "Energy & Utilities",
  "Government & Public Sector",
  "Non-profit / NGO",
  "Other",
]

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
  "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim",
  "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand",
  "West Bengal", "Delhi (NCT)", "Chandigarh", "Puducherry",
]

const COUNTRIES = [
  "India", "United States", "United Kingdom", "United Arab Emirates",
  "Singapore", "Canada", "Australia", "Germany", "France", "Netherlands",
]

const CURRENCIES = [
  { value: "INR", label: "INR – Indian Rupee (₹)" },
  { value: "USD", label: "USD – US Dollar ($)" },
  { value: "EUR", label: "EUR – Euro (€)" },
  { value: "GBP", label: "GBP – British Pound (£)" },
  { value: "AED", label: "AED – UAE Dirham (د.إ)" },
  { value: "SGD", label: "SGD – Singapore Dollar (S$)" },
  { value: "CAD", label: "CAD – Canadian Dollar (C$)" },
  { value: "AUD", label: "AUD – Australian Dollar (A$)" },
]

const TIMEZONES = [
  { value: "Asia/Kolkata",       label: "IST – India Standard Time (UTC+5:30)" },
  { value: "UTC",                label: "UTC – Coordinated Universal Time (UTC±0)" },
  { value: "America/New_York",   label: "EST – Eastern Time (UTC-5)" },
  { value: "America/Los_Angeles",label: "PST – Pacific Time (UTC-8)" },
  { value: "Europe/London",      label: "GMT – Greenwich Mean Time (UTC±0)" },
  { value: "Europe/Paris",       label: "CET – Central European Time (UTC+1)" },
  { value: "Asia/Singapore",     label: "SGT – Singapore Time (UTC+8)" },
  { value: "Asia/Dubai",         label: "GST – Gulf Standard Time (UTC+4)" },
]

const FINANCIAL_YEARS = [
  { value: "apr-mar", label: "April – March (Indian FY)" },
  { value: "jan-dec", label: "January – December (Calendar Year)" },
  { value: "jul-jun", label: "July – June" },
  { value: "oct-sep", label: "October – September" },
]

const DAYS_OF_WEEK = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
]

const DEFAULT_VALUES: FormValues = {
  companyName: "",
  legalName: "",
  industry: "",
  website: "",
  companyEmail: "",
  phoneNumber: "",
  address: "",
  city: "",
  state: "",
  country: "India",
  pincode: "",
  gstNumber: "",
  panNumber: "",
  currency: "INR",
  timezone: "Asia/Kolkata",
  financialYear: "apr-mar",
  workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  businessHoursStart: "09:00",
  businessHoursEnd: "18:00",
}

// ── Logo Upload ──────────────────────────────────────────────────────────────

function LogoUpload({
  preview,
  onFileSelect,
  onRemove,
}: {
  preview: string | null
  onFileSelect: (dataUrl: string) => void
  onRemove: () => void
}) {
  const inputRef = React.useRef<HTMLInputElement>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") onFileSelect(reader.result)
    }
    reader.readAsDataURL(file)
    e.target.value = ""
  }

  return (
    <div className="flex items-start gap-6">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        aria-label="Upload company logo"
        className="group relative flex h-20 w-20 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-muted-foreground/25 bg-muted/30 transition-colors hover:border-primary/50 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {preview ? (
          <img
            src={preview}
            alt="Company logo preview"
            className="h-full w-full object-contain p-1"
          />
        ) : (
          <Building2 className="h-8 w-8 text-muted-foreground/40 transition-colors group-hover:text-primary/50" />
        )}
      </button>

      <div>
        <p className="text-sm font-medium text-foreground">Company Logo</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          PNG, SVG, JPEG or WEBP · Max 2 MB · Recommended 256 × 256 px
        </p>
        <div className="mt-3 flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            {preview ? "Replace" : "Upload Logo"}
          </Button>
          {preview && (
            <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
              Remove
            </Button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/svg+xml,image/jpeg,image/webp"
          className="sr-only"
          onChange={handleChange}
        />
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function CompanyProfile() {
  const { toast } = useToast()
  const [logoPreview, setLogoPreview] = React.useState<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULT_VALUES,
    mode: "onTouched",
  })

  const { isDirty, isSubmitting } = form.formState
  const hasChanges = isDirty || !!logoPreview

  function onSubmit(values: FormValues) {
    console.log("Company profile saved:", { ...values, logo: logoPreview })
    form.reset(values)
    toast({
      title: "Company profile saved",
      description: "Your organization settings have been updated successfully.",
    })
  }

  function handleReset() {
    form.reset(DEFAULT_VALUES)
    setLogoPreview(null)
  }

  const headerActions = (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        disabled={!hasChanges}
        onClick={handleReset}
      >
        <RotateCcw className="mr-2 h-4 w-4" />
        Reset
      </Button>
      <Button type="submit" form="company-profile-form" disabled={isSubmitting}>
        <Save className="mr-2 h-4 w-4" />
        Save Changes
      </Button>
    </div>
  )

  return (
    <OrgLayout section="Company Profile">
      <OrgPageHeader
        icon={Building2}
        title="Company Profile"
        description="Configure your organization's legal identity, branding, contact details, and statutory information."
        action={headerActions}
      />

      <Form {...form}>
        <form
          id="company-profile-form"
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-6"
          noValidate
        >
          {/* Section 1 – Basic Information */}
          <FormSection
            icon={Building2}
            title="Basic Information"
            description="Core legal and business identity details for your organization."
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Company Name <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Technologies Pvt. Ltd." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="legalName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Legal Name <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Technologies Private Limited" {...field} />
                    </FormControl>
                    <FormDescription>As registered with MCA or local authority</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="mt-5 sm:max-w-sm">
              <FormField
                control={form.control}
                name="industry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Industry <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your industry" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {INDUSTRIES.map((ind) => (
                          <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </FormSection>

          {/* Section 2 – Branding */}
          <FormSection
            icon={Palette}
            title="Branding"
            description="Upload your company logo for use on payslips, offer letters, and the employee self-service portal."
          >
            <LogoUpload
              preview={logoPreview}
              onFileSelect={setLogoPreview}
              onRemove={() => setLogoPreview(null)}
            />
          </FormSection>

          {/* Section 3 – Contact Information */}
          <FormSection
            icon={Phone}
            title="Contact Information"
            description="Primary communication channels for the organization."
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="companyEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Company Email <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="hr@company.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Phone Number <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="+91 98765 43210" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="mt-5 sm:max-w-sm">
              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input type="url" placeholder="https://www.company.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </FormSection>

          {/* Section 4 – Registered Address */}
          <FormSection
            icon={MapPin}
            title="Registered Address"
            description="Official registered address as per company incorporation documents."
          >
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Address <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Building / floor, street name, area / locality..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      City <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Mumbai" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      State <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {INDIAN_STATES.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Country <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {COUNTRIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pincode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Pincode <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="400001"
                        maxLength={6}
                        inputMode="numeric"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </FormSection>

          {/* Section 5 – Tax & Statutory Information */}
          <FormSection
            icon={FileText}
            title="Tax & Statutory Information"
            description="Registration numbers required for payroll processing and statutory compliance filings."
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="gstNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>GST Number</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="22AAAAA0000A1Z5"
                        className="font-mono tracking-widest uppercase"
                        maxLength={15}
                        {...field}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      />
                    </FormControl>
                    <FormDescription>15-character GSTIN</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="panNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PAN Number</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="ABCDE1234F"
                        className="font-mono tracking-widest uppercase"
                        maxLength={10}
                        {...field}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      />
                    </FormControl>
                    <FormDescription>10-character Permanent Account Number</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </FormSection>

          {/* Section 6 – Regional Settings */}
          <FormSection
            icon={Settings}
            title="Regional Settings"
            description="Locale preferences that drive payroll cycles, leave calculations, and attendance rules."
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Currency <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CURRENCIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="timezone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Timezone <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select timezone" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TIMEZONES.map((tz) => (
                          <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="financialYear"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Financial Year <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select financial year" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {FINANCIAL_YEARS.map((fy) => (
                          <SelectItem key={fy.value} value={fy.value}>{fy.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Determines payroll cycle and compliance reporting period
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col gap-1.5">
                <p className="text-sm font-medium leading-none">
                  Business Hours <span className="text-destructive">*</span>
                </p>
                <div className="flex items-center gap-2">
                  <FormField
                    control={form.control}
                    name="businessHoursStart"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <span className="shrink-0 text-sm text-muted-foreground">to</span>
                  <FormField
                    control={form.control}
                    name="businessHoursEnd"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            <div className="mt-5">
              <FormField
                control={form.control}
                name="workingDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Working Days <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormDescription>
                      Select the standard working days for your organization
                    </FormDescription>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {DAYS_OF_WEEK.map((day) => {
                        const checked = field.value?.includes(day)
                        return (
                          <label
                            key={day}
                            className={cn(
                              "flex cursor-pointer select-none items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                              checked
                                ? "border-primary bg-primary/5 text-primary"
                                : "border-input text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground"
                            )}
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(c) => {
                                if (c) {
                                  field.onChange([...field.value, day])
                                } else {
                                  field.onChange(field.value.filter((d) => d !== day))
                                }
                              }}
                            />
                            {day.slice(0, 3)}
                          </label>
                        )
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </FormSection>

          {/* Bottom Action Bar */}
          <div className="flex items-center justify-between rounded-lg border bg-card px-6 py-4 shadow-sm">
            <p className="text-sm text-muted-foreground">
              {hasChanges ? "You have unsaved changes." : "No unsaved changes."}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={!hasChanges}
                onClick={handleReset}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </OrgLayout>
  )
}
