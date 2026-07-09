import * as React from "react"
import { ChevronLeft, ChevronRight, Edit3, MapPin, Plus, Trash2 } from "lucide-react"
import { useLocation } from "wouter"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { OrgLayout, OrgPageHeader, Filters, MasterTable, StatusBadge, EmptyState } from "../index"
import { LocationDrawer } from "../locations/components/LocationDrawer"
import { type LocationFormValues, createEmptyLocationFormValues, getLocations, updateLocations, type LocationRecord } from "../locations/data/locations"
import { businessUnits } from "../locations/data/locations"

export default function Locations() {
  const [, navigate] = useLocation()
  const [locations, setLocations] = React.useState<LocationRecord[]>(() => getLocations())
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [buFilter, setBuFilter] = React.useState("all")
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const [drawerMode, setDrawerMode] = React.useState<"create" | "edit">("create")
  const [editingLocation, setEditingLocation] = React.useState<LocationRecord | undefined>()
  const [currentPage, setCurrentPage] = React.useState(1)
  const pageSize = 5

  const filteredLocations = React.useMemo(() => {
    const query = search.trim().toLowerCase()
    return locations.filter((location) => {
      const matchesSearch =
        !query ||
        location.name.toLowerCase().includes(query) ||
        location.code.toLowerCase().includes(query) ||
        location.city.toLowerCase().includes(query) ||
        location.businessUnit.toLowerCase().includes(query)

      const matchesStatus = statusFilter === "all" || location.status === statusFilter
      const matchesBU = buFilter === "all" || location.businessUnit === buFilter

      return matchesSearch && matchesStatus && matchesBU
    })
  }, [locations, search, statusFilter, buFilter])

  const totalPages = Math.max(1, Math.ceil(filteredLocations.length / pageSize))
  const visibleLocations = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredLocations.slice(start, start + pageSize)
  }, [filteredLocations, currentPage])

  React.useEffect(() => {
    setCurrentPage(1)
  }, [search, statusFilter, buFilter])

  const openCreateDrawer = () => {
    setEditingLocation(undefined)
    setDrawerMode("create")
    setDrawerOpen(true)
  }

  const openEditDrawer = (location: LocationRecord) => {
    setEditingLocation(location)
    setDrawerMode("edit")
    setDrawerOpen(true)
  }

  const handleSubmit = (values: LocationFormValues) => {
    if (drawerMode === "create") {
      const newLocation: LocationRecord = {
        id: `L${Date.now().toString().slice(-3)}`,
        ...values,
      }
      updateLocations((current) => [newLocation, ...current])
      setLocations(getLocations())
    } else if (editingLocation) {
      updateLocations((current) =>
        current.map((item) => (item.id === editingLocation.id ? { ...item, ...values } : item))
      )
      setLocations(getLocations())
    }

    setDrawerOpen(false)
  }

  const handleDelete = (location: LocationRecord) => {
    updateLocations((current) => current.filter((item) => item.id !== location.id))
    setLocations(getLocations())
  }

  return (
    <OrgLayout section="Locations">
      <OrgPageHeader
        icon={MapPin}
        title="Locations"
        description="Manage office locations, branches, and regional operations with search, filters, and detail views."
        action={
          <Button onClick={openCreateDrawer}>
            <Plus className="mr-2 h-4 w-4" />
            Add Location
          </Button>
        }
      />

      <Filters
        search={search}
        onSearchChange={setSearch}
        onClear={() => setSearch("")}
        placeholder="Search by name, code, city, or business unit"
        searchClassName="relative min-w-[260px] flex-1"
      >
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Select value={buFilter} onValueChange={setBuFilter}>
          <SelectTrigger className="w-[210px]">
            <SelectValue placeholder="Filter by business unit" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All business units</SelectItem>
            {businessUnits.map((businessUnit) => (
              <SelectItem key={businessUnit} value={businessUnit}>
                {businessUnit}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Filters>

      <MasterTable
        emptyState={
          <EmptyState
            icon={MapPin}
            title="No locations found"
            description="Try adjusting your search or filters, or create a new location."
            action={{ label: "Add Location", onClick: openCreateDrawer, icon: Plus }}
          />
        }
      >
        {visibleLocations.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Location</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Business Unit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleLocations.map((location) => (
                <TableRow key={location.id} className="cursor-pointer" onClick={() => navigate(`/organization/locations/${location.id}`)}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{location.name}</p>
                      <p className="text-sm text-muted-foreground">{location.address}</p>
                    </div>
                  </TableCell>
                  <TableCell>{location.code}</TableCell>
                  <TableCell>{location.city}</TableCell>
                  <TableCell>{location.businessUnit}</TableCell>
                  <TableCell>
                    <StatusBadge status={location.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2" onClick={(event) => event.stopPropagation()}>
                      <Button variant="outline" size="icon" onClick={() => openEditDrawer(location)}>
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => handleDelete(location)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}
      </MasterTable>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Showing {filteredLocations.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredLocations.length)} of {filteredLocations.length} locations
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">{currentPage} / {totalPages}</span>
          <Button variant="outline" size="icon" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={currentPage === totalPages}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <LocationDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        mode={drawerMode}
        initialValues={editingLocation ? {
          name: editingLocation.name,
          code: editingLocation.code,
          address: editingLocation.address,
          city: editingLocation.city,
          state: editingLocation.state,
          country: editingLocation.country,
          timezone: editingLocation.timezone,
          workingHours: editingLocation.workingHours,
          businessUnit: editingLocation.businessUnit,
          status: editingLocation.status,
        } : createEmptyLocationFormValues()}
        onSubmit={handleSubmit}
      />
    </OrgLayout>
  )
}
