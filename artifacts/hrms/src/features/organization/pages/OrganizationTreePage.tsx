import * as React from "react"
import {
  Building2,
  ChevronDown,
  GitFork,
  Landmark,
  MapPin,
  Network,
  Users,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { OrgLayout, OrgPageHeader, StatusBadge } from "../index"
import {
  organizationBusinessUnits,
  organizationDepartments,
  organizationLocations,
  type OrganizationStatus,
} from "../data/organizationData"

type TreeNodeKind = "company" | "group" | "businessUnit" | "department" | "location"

interface OrganizationTreeNode {
  id: string
  label: string
  kind: TreeNodeKind
  description?: string
  parentId?: string
  meta?: {
    departmentCount?: number
    locationCount?: number
    head?: string
    employeeCount?: number
    status?: OrganizationStatus | "Archived"
    location?: string
  }
  children?: OrganizationTreeNode[]
}

const nodeIcons: Record<TreeNodeKind, React.ElementType> = {
  company: Building2,
  group: GitFork,
  businessUnit: Landmark,
  department: Network,
  location: MapPin,
}

const treeData: OrganizationTreeNode = {
  id: "company-corehr",
  label: "CoreHR",
  kind: "company",
  description: "Company",
  children: [
    {
      id: "group-business-units",
      label: "Business Units",
      kind: "group",
      description: `${organizationBusinessUnits.length} units`,
      parentId: "company-corehr",
      children: organizationBusinessUnits.map((unit) => ({
        id: unit.id,
        label: unit.name,
        kind: "businessUnit",
        description: unit.code,
        parentId: "group-business-units",
        meta: {
          departmentCount: unit.departments.length,
          locationCount: unit.locations.length,
          status: unit.status,
        },
      })),
    },
    {
      id: "group-departments",
      label: "Departments",
      kind: "group",
      description: `${organizationDepartments.length} departments`,
      parentId: "company-corehr",
      children: organizationDepartments.map((department) => ({
        id: department.id,
        label: department.name,
        kind: "department",
        description: department.code,
        parentId: "group-departments",
        meta: {
          head: department.head,
          employeeCount: department.employeeCount,
          status: department.status,
        },
      })),
    },
    {
      id: "group-locations",
      label: "Locations",
      kind: "group",
      description: `${organizationLocations.length} locations`,
      parentId: "company-corehr",
      children: organizationLocations.map((location) => ({
        id: location.id,
        label: location.name,
        kind: "location",
        description: location.code,
        parentId: "group-locations",
        meta: {
          location: `${location.city}, ${location.state}`,
          status: location.status,
        },
      })),
    },
  ],
}

function NodeMeta({ node }: { node: OrganizationTreeNode }) {
  if (node.kind === "businessUnit") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="gap-1 font-normal">
          <Network className="h-3 w-3" />
          {node.meta?.departmentCount ?? 0} departments
        </Badge>
        <Badge variant="secondary" className="gap-1 font-normal">
          <MapPin className="h-3 w-3" />
          {node.meta?.locationCount ?? 0} locations
        </Badge>
      </div>
    )
  }

  if (node.kind === "department") {
    return (
      <div className="grid gap-2 text-sm sm:grid-cols-[minmax(160px,1fr)_auto_auto] sm:items-center">
        <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
          <Users className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{node.meta?.head}</span>
        </span>
        <Badge variant="outline" className="w-fit font-normal">
          {node.meta?.employeeCount ?? 0} employees
        </Badge>
        {node.meta?.status && <StatusBadge status={node.meta.status} />}
      </div>
    )
  }

  if (node.kind === "location") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {node.meta?.location && (
          <span className="text-sm text-muted-foreground">{node.meta.location}</span>
        )}
        {node.meta?.status && <StatusBadge status={node.meta.status} />}
      </div>
    )
  }

  return null
}

function OrganizationTreeNodeRow({
  node,
  depth = 0,
}: {
  node: OrganizationTreeNode
  depth?: number
}) {
  const [isOpen, setIsOpen] = React.useState(depth < 2)
  const hasChildren = Boolean(node.children?.length)
  const Icon = nodeIcons[node.kind]

  return (
    <div
      className="relative"
      data-tree-node-id={node.id}
      data-tree-node-kind={node.kind}
      data-tree-parent-id={node.parentId}
    >
      {depth > 0 && (
        <div
          className="absolute bottom-0 top-0 hidden w-px bg-border sm:block"
          style={{ left: `${(depth - 1) * 28 + 18}px` }}
        />
      )}

      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div
          className={cn(
            "relative flex min-w-0 items-start gap-3 rounded-lg border bg-card p-3 shadow-sm transition-colors hover:border-primary/30",
            node.kind === "company" && "border-primary/20 bg-primary/5",
            node.kind === "group" && "bg-muted/30"
          )}
          style={{ marginLeft: `${depth * 28}px` }}
        >
          <CollapsibleTrigger
            className={cn(
              "mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground transition-colors hover:text-foreground",
              !hasChildren && "pointer-events-none opacity-0"
            )}
            aria-label={`${isOpen ? "Collapse" : "Expand"} ${node.label}`}
          >
            <ChevronDown className={cn("h-4 w-4 transition-transform", !isOpen && "-rotate-90")} />
          </CollapsibleTrigger>

          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate text-sm font-semibold text-foreground">{node.label}</h3>
                  {node.description && (
                    <span className="text-xs text-muted-foreground">{node.description}</span>
                  )}
                </div>
                <div className="mt-2">
                  <NodeMeta node={node} />
                </div>
              </div>

              {hasChildren && (
                <Badge variant="outline" className="w-fit shrink-0 font-normal">
                  {node.children?.length} child nodes
                </Badge>
              )}
            </div>
          </div>
        </div>

        {hasChildren && (
          <CollapsibleContent>
            <div className="mt-3 space-y-3">
              {node.children?.map((child) => (
                <OrganizationTreeNodeRow key={child.id} node={child} depth={depth + 1} />
              ))}
            </div>
          </CollapsibleContent>
        )}
      </Collapsible>
    </div>
  )
}

export default function OrganizationTreePage() {
  return (
    <OrgLayout section="Organization Tree">
      <OrgPageHeader
        icon={GitFork}
        title="Organization Tree"
        description="Explore the company hierarchy across business units, departments, and locations."
      />

      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="overflow-x-auto pb-1">
            <div className="min-w-[760px] space-y-3">
              <OrganizationTreeNodeRow node={treeData} />
            </div>
          </div>
        </CardContent>
      </Card>
    </OrgLayout>
  )
}
