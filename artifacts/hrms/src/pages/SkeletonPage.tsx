import * as React from "react"
import { AppLayout } from "@/components/layout/AppLayout"
import { PageHeader } from "@/components/PageHeader"
import { EmptyState } from "@/components/EmptyState"
import { Construction } from "lucide-react"

export default function SkeletonPage({ title, description }: { title: string, description: string }) {
  return (
    <AppLayout breadcrumb={<span className="text-sm font-medium">{title}</span>}>
      <PageHeader title={title} description={description} />
      
      <div className="mt-10">
        <EmptyState 
          icon={<Construction className="h-8 w-8" />}
          title="Module Under Construction"
          description="This section is currently being built. It will feature detailed analytics, management tables, and quick actions."
        />
      </div>
    </AppLayout>
  )
}
