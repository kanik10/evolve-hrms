import * as React from "react"
import { ArrowLeft, Link2, type LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StatusBadge } from "./StatusBadge"
import { RelationshipCard, type RelationshipItem } from "./RelationshipCard"

interface DetailLayoutProps {
  title: string
  subtitle?: string
  icon: LucideIcon
  status?: string
  backLabel: string
  onBack: () => void
  onEdit?: () => void
  children: React.ReactNode
  aside?: React.ReactNode
}

export function DetailLayout({
  title,
  subtitle,
  icon: Icon,
  status,
  backLabel,
  onBack,
  onEdit,
  children,
  aside,
}: DetailLayoutProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b pb-6 md:flex-row md:items-start md:justify-between">
        <div className="space-y-3">
          <Button variant="ghost" className="h-8 px-0" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {backLabel}
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold">{title}</h1>
                {status && <StatusBadge status={status} />}
              </div>
              {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
            </div>
          </div>
        </div>
        {onEdit && <Button onClick={onEdit}>Edit</Button>}
      </div>

      <div className={aside ? "grid gap-6 lg:grid-cols-[1.25fr_0.75fr]" : undefined}>
        <div>{children}</div>
        {aside && <div>{aside}</div>}
      </div>
    </div>
  )
}

export type DetailField = { label: string; value: React.ReactNode }

export type DetailActivityEntry = {
  title: string
  detail: string
  at: string
  by: string
}

export type DetailHistoryEntry = {
  field: string
  from: string
  to: string
  at: string
  by: string
}

export interface StandardDetailModel {
  title: string
  subtitle?: string
  status?: string
  icon: LucideIcon
  backPath: string
  backLabel: string
  general: DetailField[]
  statistics: DetailField[]
  relationships: DetailField[]
  metadata: DetailField[]
  related: Array<{ title: string; icon: LucideIcon; items: RelationshipItem[] }>
  activity: DetailActivityEntry[]
  history: DetailHistoryEntry[]
}

interface StandardDetailViewProps {
  model: StandardDetailModel
  onBack: (path: string) => void
}

export function DetailFieldGrid({ fields }: { fields: DetailField[] }) {
  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      {fields.map((field) => (
        <div key={field.label}>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{field.label}</dt>
          <dd className="mt-1 text-sm">{field.value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function DetailCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export function DetailActivityList({ activity }: { activity: DetailActivityEntry[] }) {
  return (
    <Card>
      <CardContent className="py-6">
        <div className="space-y-5">
          {activity.map((item) => (
            <div key={`${item.title}-${item.at}`} className="flex gap-3">
              <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Link2 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium">{item.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.by} - {item.at}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function DetailHistoryList({ history }: { history: DetailHistoryEntry[] }) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="divide-y">
          {history.map((item) => (
            <div key={`${item.field}-${item.at}`} className="grid gap-2 p-4 text-sm md:grid-cols-[1fr_1fr_1fr_0.8fr]">
              <span className="font-medium">{item.field}</span>
              <span className="text-muted-foreground">From: {item.from}</span>
              <span>To: {item.to}</span>
              <span className="text-muted-foreground">{item.by} - {item.at}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function StandardDetailView({ model, onBack }: StandardDetailViewProps) {
  return (
    <DetailLayout
      title={model.title}
      subtitle={model.subtitle}
      icon={model.icon}
      status={model.status}
      backLabel={model.backLabel}
      onBack={() => onBack(model.backPath)}
    >
      <Tabs defaultValue="overview">
        <TabsList className="h-auto w-full justify-start rounded-none border-b bg-transparent p-0">
          {[
            ["overview", "Overview"],
            ["related", "Related Records"],
            ["activity", "Activity"],
            ["history", "History"],
          ].map(([value, label]) => (
            <TabsTrigger
              key={value}
              value={value}
              className="rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 text-sm font-medium text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid gap-6 xl:grid-cols-2">
            <DetailCard title="General Information"><DetailFieldGrid fields={model.general} /></DetailCard>
            <DetailCard title="Statistics"><DetailFieldGrid fields={model.statistics} /></DetailCard>
            <DetailCard title="Relationships"><DetailFieldGrid fields={model.relationships} /></DetailCard>
            <DetailCard title="Metadata"><DetailFieldGrid fields={model.metadata} /></DetailCard>
          </div>
        </TabsContent>

        <TabsContent value="related" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {model.related.map((card) => <RelationshipCard key={card.title} {...card} />)}
          </div>
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <DetailActivityList activity={model.activity} />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <DetailHistoryList history={model.history} />
        </TabsContent>
      </Tabs>
    </DetailLayout>
  )
}
