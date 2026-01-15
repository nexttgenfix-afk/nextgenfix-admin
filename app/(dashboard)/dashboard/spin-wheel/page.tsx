"use client"

import { useState } from "react"
import { 
  CircleDashed, 
  Settings, 
  History, 
  TrendingUp, 
  Plus, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  RotateCcw,
  Lock,
  Filter,
  MoreHorizontal
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import StatusBadge from "@/components/status-badge"
import { useToast } from "@/hooks/use-toast"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { 
  getSpinConfig, 
  updateSpinConfig, 
  getSpinHistory, 
  revokeSpinCoupon, 
  getSpinAnalytics,
  type Prize, 
  type SpinWheelConfig,
  type SpinHistory
} from "@/lib/api/spinWheel"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function SpinWheelPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState("configure")
  const [historyPage, setHistoryPage] = useState(1)
  const [isRevokeDialogOpen, setIsRevokeDialogOpen] = useState(false)
  const [selectedHistory, setSelectedHistory] = useState<SpinHistory | null>(null)
  const [revokeReason, setRevokeReason] = useState("")

  // --- Queries ---
  const { data: configData, isLoading: configLoading } = useQuery({
    queryKey: ['spin-config'],
    queryFn: getSpinConfig
  })

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['spin-history', historyPage],
    queryFn: () => getSpinHistory({ page: historyPage, limit: 10 }),
    enabled: activeTab === "coupons" || activeTab === "analytics"
  })

  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ['spin-analytics'],
    queryFn: getSpinAnalytics,
    enabled: activeTab === "analytics"
  })

  // --- Mutations ---
  const updateConfigMutation = useMutation({
    mutationFn: (data: Partial<SpinWheelConfig>) => updateSpinConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spin-config'] })
      toast({ title: "Success", description: "Spin wheel configuration updated" })
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update configuration", variant: "destructive" })
    }
  })

  const revokeMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => revokeSpinCoupon(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spin-history'] })
      setIsRevokeDialogOpen(false)
      setSelectedHistory(null)
      setRevokeReason("")
      toast({ title: "Success", description: "Coupon revoked successfully" })
    }
  })

  // --- Helpers ---
  const handleUpdateConfig = (e: React.FormEvent) => {
    e.preventDefault()
    if (!configData?.config) return

    const totalProb = configData.config.prizes.reduce((sum, p) => sum + p.probability, 0)
    if (Math.abs(totalProb - 100) > 0.1) {
      toast({ title: "Invalid Probabilities", description: `Total probability must be 100%. Current: ${totalProb}%`, variant: "destructive" })
      return
    }

    updateConfigMutation.mutate(configData.config)
  }

  const handlePrizeChange = (index: number, updates: Partial<Prize>) => {
    if (!configData?.config) return
    const updatedPrizes = [...configData.config.prizes]
    updatedPrizes[index] = { ...updatedPrizes[index], ...updates }
    
    // Update local query state
    queryClient.setQueryData(['spin-config'], {
      ...configData,
      config: { ...configData.config, prizes: updatedPrizes }
    })
  }

  const addPrize = () => {
    if (!configData?.config) return
    if (configData.config.prizes.length >= 8) {
      toast({ title: "Limit reached", description: "Maximum 8 prizes allowed" })
      return
    }
    const newPrize: Prize = {
      type: 'blank',
      label: 'New Prize',
      probability: 0,
      message: 'Better luck next time!'
    }
    queryClient.setQueryData(['spin-config'], {
      ...configData,
      config: { 
        ...configData.config, 
        prizes: [...configData.config.prizes, newPrize] 
      }
    })
  }

  const removePrize = (index: number) => {
    if (!configData?.config) return
    if (configData.config.prizes.length <= 2) {
      toast({ title: "Error", description: "Minimum 2 prizes required" })
      return
    }
    const updatedPrizes = configData.config.prizes.filter((_, i) => i !== index)
    queryClient.setQueryData(['spin-config'], {
      ...configData,
      config: { ...configData.config, prizes: updatedPrizes }
    })
  }

  if (configLoading) return <div className="p-8 text-center text-muted-foreground"><RotateCcw className="animate-spin inline mr-2" /> Loading configuration...</div>

  const config = configData?.config

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Spin Wheel Rewards</h2>
        <div className="flex items-center space-x-2">
          <Badge variant={config?.isActive ? "default" : "secondary"} className="h-6">
            {config?.isActive ? "ACTIVE" : "INACTIVE"}
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="configure" className="flex items-center gap-2">
            <Settings className="h-4 w-4" /> Configure
          </TabsTrigger>
          <TabsTrigger value="coupons" className="flex items-center gap-2">
            <Filter className="h-4 w-4" /> Auto-Generated Coupons
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="configure" className="space-y-4">
          <form onSubmit={handleUpdateConfig}>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              <Card className="col-span-4">
                <CardHeader>
                  <CardTitle>Prize Slots</CardTitle>
                  <CardDescription>
                    Configure the rewards and their probabilities. Total must equal 100%.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {config?.prizes.map((prize, idx) => (
                    <div key={idx} className="space-y-4 p-4 border rounded-lg bg-muted/30 relative">
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className="absolute right-2 top-2 text-destructive"
                        onClick={() => removePrize(idx)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      
                      <div className="grid grid-cols-6 gap-4">
                        <div className="col-span-2 space-y-2">
                          <Label>Label</Label>
                          <Input 
                            value={prize.label} 
                            onChange={(e) => handlePrizeChange(idx, { label: e.target.value })}
                            placeholder="e.g. 10% Off"
                          />
                        </div>
                        <div className="col-span-2 space-y-2">
                          <Label>Type</Label>
                          <Select 
                            value={prize.type} 
                            onValueChange={(val: any) => handlePrizeChange(idx, { type: val })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="blank">Blank Entry</SelectItem>
                              <SelectItem value="points">Nano Points</SelectItem>
                              <SelectItem value="coupon">Discount Coupon</SelectItem>
                              <SelectItem value="bogo">BOGO Offer</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-2 space-y-2">
                          <Label>Probability (%)</Label>
                          <Input 
                            type="number"
                            value={prize.probability} 
                            onChange={(e) => handlePrizeChange(idx, { probability: Number(e.target.value) })}
                          />
                        </div>
                      </div>

                      {prize.type === 'blank' && (
                        <div className="space-y-2">
                          <Label>Message</Label>
                          <Input 
                            value={prize.message || ""} 
                            onChange={(e) => handlePrizeChange(idx, { message: e.target.value })}
                            placeholder="Nice try! Better luck next time"
                          />
                        </div>
                      )}

                      {prize.type === 'points' && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Min Points</Label>
                            <Input 
                              type="number"
                              value={prize.pointsRange?.min || 0} 
                              onChange={(e) => handlePrizeChange(idx, { pointsRange: { ...prize.pointsRange!, min: Number(e.target.value) }})}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Max Points</Label>
                            <Input 
                              type="number"
                              value={prize.pointsRange?.max || 0} 
                              onChange={(e) => handlePrizeChange(idx, { pointsRange: { ...prize.pointsRange!, max: Number(e.target.value) }})}
                            />
                          </div>
                        </div>
                      )}

                      {(prize.type === 'coupon' || prize.type === 'bogo') && (
                        <div className="grid grid-cols-2 gap-4 border-t pt-4">
                          <div className="space-y-2">
                            <Label>Discount Type</Label>
                            <Select 
                              value={prize.couponConfig?.discountType} 
                              onValueChange={(val: any) => handlePrizeChange(idx, { couponConfig: { ...prize.couponConfig!, discountType: val }})}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="percentage">Percentage (%)</SelectItem>
                                <SelectItem value="fixed">Fixed (₹)</SelectItem>
                                <SelectItem value="free_delivery">Free Delivery</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                              Validity (Days) <Lock className="h-3 w-3 text-muted-foreground" />
                            </Label>
                            <Input 
                              type="number"
                              value={prize.couponConfig?.validityDays || 7} 
                              onChange={(e) => handlePrizeChange(idx, { couponConfig: { ...prize.couponConfig!, validityDays: Number(e.target.value) }})}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Discount Range (Min - Max)</Label>
                            <div className="flex gap-2">
                              <Input 
                                type="number"
                                placeholder="Min"
                                value={prize.couponConfig?.discountRange.min || 0} 
                                onChange={(e) => handlePrizeChange(idx, { couponConfig: { ...prize.couponConfig!, discountRange: { ...prize.couponConfig!.discountRange, min: Number(e.target.value) }}})}
                              />
                              <Input 
                                type="number"
                                placeholder="Max"
                                value={prize.couponConfig?.discountRange.max || 0} 
                                onChange={(e) => handlePrizeChange(idx, { couponConfig: { ...prize.couponConfig!, discountRange: { ...prize.couponConfig!.discountRange, max: Number(e.target.value) }}})}
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Min Order Value</Label>
                            <Input 
                              type="number"
                              value={prize.couponConfig?.minOrderValue || 0} 
                              onChange={(e) => handlePrizeChange(idx, { couponConfig: { ...prize.couponConfig!, minOrderValue: Number(e.target.value) }})}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  <Button type="button" variant="outline" className="w-full border-dashed" onClick={addPrize}>
                    <Plus className="mr-2 h-4 w-4" /> Add Prize Slot
                  </Button>
                </CardContent>
              </Card>

              <div className="col-span-3 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Global Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Active Status</Label>
                        <p className="text-xs text-muted-foreground">Turn the spin wheel on or off for all users</p>
                      </div>
                      <Switch 
                        checked={config?.isActive} 
                        onCheckedChange={(val) => queryClient.setQueryData(['spin-config'], { ...configData, config: { ...config!, isActive: val } })}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Frequency</Label>
                      <Select 
                        value={config?.frequency.type} 
                        onValueChange={(val: any) => queryClient.setQueryData(['spin-config'], { ...configData, config: { ...config!, frequency: { ...config!.frequency, type: val } } })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">One spin daily</SelectItem>
                          <SelectItem value="weekly">One spin weekly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Min. Orders Required</Label>
                      <Input 
                        type="number"
                        value={config?.eligibility.minOrders}
                        onChange={(e) => queryClient.setQueryData(['spin-config'], { ...configData, config: { ...config!, eligibility: { ...config!.eligibility, minOrders: Number(e.target.value) } } })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Allow Guest Users</Label>
                        <p className="text-xs text-muted-foreground">Permit one total spin for unregistered users</p>
                      </div>
                      <Switch 
                        checked={config?.eligibility.allowGuests}
                        onCheckedChange={(val) => queryClient.setQueryData(['spin-config'], { ...configData, config: { ...config!, eligibility: { ...config!.eligibility, allowGuests: val } } })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Eligible Tiers</Label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {['bronze', 'silver', 'gold'].map((tier) => (
                          <div key={tier} className="flex items-center space-x-2">
                            <Checkbox 
                              id={tier} 
                              checked={config?.eligibility.tiers.includes(tier as any)}
                              onCheckedChange={(checked) => {
                                const newTiers = checked 
                                  ? [...config!.eligibility.tiers, tier] 
                                  : config!.eligibility.tiers.filter(t => t !== tier);
                                queryClient.setQueryData(['spin-config'], { ...configData, config: { ...config!, eligibility: { ...config!.eligibility, tiers: newTiers } } });
                              }}
                            />
                            <Label htmlFor={tier} className="capitalize">{tier}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full" type="submit" disabled={updateConfigMutation.isPending}>
                      {updateConfigMutation.isPending ? "Saving..." : "Save Configuration"}
                    </Button>
                  </CardFooter>
                </Card>

                <AlertTriangle className="h-4 w-4 text-warning inline mr-2" />
                <span className="text-xs text-muted-foreground">Changes to prize values and validity only apply to future spins.</span>
              </div>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="coupons" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Spin Wheel Coupons</CardTitle>
              <CardDescription>View all rewards won by users and their current status.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Prize</TableHead>
                    <TableHead>Won Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyLoading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8">Loading history...</TableCell></TableRow>
                  ) : historyData?.history.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8">No spins recorded yet.</TableCell></TableRow>
                  ) : historyData?.history.map((record) => (
                    <TableRow key={record._id}>
                      <TableCell>
                        <div className="font-medium">
                          {record.isGuest ? "Guest User" : (record.user?.name || "Registered User")}
                        </div>
                        <div className="text-xs text-muted-foreground">{record.isGuest ? record.guestId?.slice(0,8) : record.user?.phone}</div>
                      </TableCell>
                      <TableCell>
                        <code className="text-sm font-bold">{record.prizeWon.couponCode || "N/A"}</code>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {record.prizeWon.type} {record.prizeWon.value ? `(${record.prizeWon.value})` : ""}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(record.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {record.prizeWon.type === 'blank' ? (
                          <StatusBadge status="No Reward" />
                        ) : record.couponGenerated?.usedCount ? (
                          <StatusBadge status="Redeemed" />
                        ) : new Date(record.couponGenerated?.validUntil || "") < new Date() ? (
                          <StatusBadge status="Expired" />
                        ) : (
                          <StatusBadge status="Active" />
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            {record.couponGenerated && !record.couponGenerated.usedCount && record.couponGenerated.isActive && (
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => {
                                  setSelectedHistory(record)
                                  setIsRevokeDialogOpen(true)
                                }}
                              >
                                Revoke Coupon
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem>View User History</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Spins</CardTitle>
                <CircleDashed className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData?.stats.totalSpins || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {analyticsData?.stats.recentSpins || 0} in last 30 days
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Redemption Rate</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData?.stats.redemptionRate || 0}%</div>
                <p className="text-xs text-muted-foreground">Of generated coupons</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Flagged Wins</CardTitle>
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analyticsData?.stats.flaggedCount || 0}
                </div>
                <p className="text-xs text-muted-foreground">Pending review</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Prize Distribution</CardTitle>
                <CardDescription>Frequency of each prize won</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData?.stats.distribution.map((item: any) => (
                    <div key={item._id} className="flex items-center">
                      <div className="w-full flex-1">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="font-medium">{item._id || 'No Title'}</span>
                          <span className="text-muted-foreground">{item.count} wins</span>
                        </div>
                        <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-primary h-full transition-all" 
                            style={{ 
                              width: `${(item.count / (analyticsData?.stats.totalSpins || 1)) * 100}%` 
                            }} 
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!analyticsData?.stats.distribution || analyticsData.stats.distribution.length === 0) && (
                    <div className="text-center py-8 text-muted-foreground">
                      No data available yet
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Recent Flagged History</CardTitle>
                <CardDescription>Items needing attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {historyData?.history.filter(h => h.flaggedForReview.isFlagged).slice(0, 5).map((history) => (
                    <div key={history._id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                      <div>
                        <p className="text-sm font-medium">{history.prizeWon.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {history.isGuest ? 'Guest' : (history.user?.name || 'Registered User')}
                        </p>
                      </div>
                      <Badge variant="destructive">
                        {history.flaggedForReview.reason === 'high_value' ? 'High Value' : 'Review'}
                      </Badge>
                    </div>
                  ))}
                  {(!historyData?.history.some(h => h.flaggedForReview.isFlagged)) && (
                    <div className="text-center py-8 text-muted-foreground">
                      All clear! No flagged wins.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Suspected Activity / High-Value Wins</CardTitle>
              <CardDescription>Wins flagged for review based on value or patterns.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Prize</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyData?.history.filter(h => h.flaggedForReview.isFlagged).map((record) => (
                    <TableRow key={record._id}>
                      <TableCell className="font-medium">
                        {record.isGuest ? "Guest" : (record.user?.name || "Registered User")}
                      </TableCell>
                      <TableCell className="text-destructive font-semibold text-xs uppercase">{record.flaggedForReview.reason}</TableCell>
                      <TableCell>{record.prizeWon.label} ({record.prizeWon.value})</TableCell>
                      <TableCell>{new Date(record.createdAt).toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm">Mark Reviewed</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {historyData?.history.filter(h => h.flaggedForReview.isFlagged).length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center py-4">No flags found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Revoke Dialog */}
      <AlertDialog open={isRevokeDialogOpen} onOpenChange={setIsRevokeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Coupon?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently disable the coupon code <strong>{selectedHistory?.prizeWon.couponCode}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 space-y-2">
            <Label>Reason for revocation</Label>
            <Input 
              placeholder="e.g. Suspected abuse, Customer request" 
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => selectedHistory && revokeMutation.mutate({ id: selectedHistory._id, reason: revokeReason })}
              disabled={!revokeReason.trim() || revokeMutation.isPending}
            >
              Confirm Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
