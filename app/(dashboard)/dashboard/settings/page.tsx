"use client"

import { useState, useEffect } from "react"
import { Clock, DollarSign, Truck, Users, Gift, Calendar, Settings as SettingsIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import {
  getSettings,
  updateBusiness,
  updateBusinessHours,
  updateDelivery,
  updateTiers,
  updateReferral,
  updateTax,
  updateScheduling,
  type Settings
} from "@/lib/api/settings"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

const getErrorMessage = (err: unknown, defaultMessage: string): string => {
  if (err && typeof err === "object" && "response" in err) {
    const response = (err as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) {
      return response.data.message;
    }
  }
  return defaultMessage;
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    business: {
      name: "",
      description: "",
      phone: "",
      email: "",
      address: "",
      website: "",
      logo: "",
    },
    hours: {
      monday: { open: "09:00", close: "22:00", isOpen: true },
      tuesday: { open: "09:00", close: "22:00", isOpen: true },
      wednesday: { open: "09:00", close: "22:00", isOpen: true },
      thursday: { open: "09:00", close: "22:00", isOpen: true },
      friday: { open: "09:00", close: "22:00", isOpen: true },
      saturday: { open: "09:00", close: "22:00", isOpen: true },
      sunday: { open: "09:00", close: "22:00", isOpen: false },
    },
    tax: {
      gstRate: 18,
      serviceChargeRate: 0,
      isInclusive: false,
    },
    delivery: {
      isEnabled: true,
      minimumOrder: 200,
      deliveryFee: 50,
      freeDeliveryThreshold: 500,
      estimatedTime: 45,
      maxDistance: 10,
    },
    tiers: {
      bronze: { minOrders: 0, discount: 0, benefits: [] },
      silver: { minOrders: 10, discount: 5, benefits: ["Priority support"] },
      gold: { minOrders: 25, discount: 10, benefits: ["Priority support", "Free delivery"] },
    },
    referral: {
      isEnabled: true,
      referrerReward: 100,
      refereeReward: 50,
      minOrderValue: 300,
    },
    scheduling: {
      advanceBookingDays: 30,
      cancellationHours: 2,
      maxGuestsPerReservation: 20,
      reservationDuration: 120,
    },
  })

  const { toast } = useToast()
  const queryClient = useQueryClient()
  type BusinessErrors = Partial<Record<keyof Settings['business'], string>>
  const [businessErrors, setBusinessErrors] = useState<BusinessErrors>({})
  const [isEditingBusiness, setIsEditingBusiness] = useState<boolean>(false)
  const [originalBusiness, setOriginalBusiness] = useState<Settings['business'] | null>(null)
  const [isEditingHours, setIsEditingHours] = useState<boolean>(false)
  const [originalHours, setOriginalHours] = useState<Settings['hours'] | null>(null)
  const [isEditingTax, setIsEditingTax] = useState<boolean>(false)
  const [originalTax, setOriginalTax] = useState<Settings['tax'] | null>(null)
  const [isEditingDelivery, setIsEditingDelivery] = useState<boolean>(false)
  const [originalDelivery, setOriginalDelivery] = useState<Settings['delivery'] | null>(null)
  const [isEditingTiers, setIsEditingTiers] = useState<boolean>(false)
  const [originalTiers, setOriginalTiers] = useState<Settings['tiers'] | null>(null)
  const [isEditingReferral, setIsEditingReferral] = useState<boolean>(false)
  const [originalReferral, setOriginalReferral] = useState<Settings['referral'] | null>(null)
  const [isEditingScheduling, setIsEditingScheduling] = useState<boolean>(false)
  const [originalScheduling, setOriginalScheduling] = useState<Settings['scheduling'] | null>(null)

  // Fetch settings
  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
  })

  // Update local state when data is fetched
  useEffect(() => {
    if (!settingsData) return

    // Backend responses may be shaped either as { settings: Settings } or { success: true, data: Settings }
    // Handle both shapes for robustness without using `any`.
    const sd = settingsData as unknown
    const payload = (sd as { settings?: Settings }).settings ?? (sd as { data?: Settings }).data ?? (sd as Settings | undefined)
    // Validate payload shape before replacing local settings to avoid overwriting with unexpected shapes
    if (payload && typeof payload === 'object') {
      const p = payload as unknown as Record<string, unknown>
      const hasHours = 'hours' in p && p.hours !== undefined && typeof p.hours === 'object' && p.hours !== null
      const hasBusiness = 'business' in p && p.business !== undefined && typeof p.business === 'object' && p.business !== null
      // Require at least hours and business to be present, otherwise ignore payload
      if (hasHours && hasBusiness) {
        setSettings(payload as Settings)
      }
    }
  }, [settingsData])

  

  // Per-section mutations
  const businessMutation = useMutation({
    mutationFn: updateBusiness,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      setBusinessErrors({})
      // exit edit mode on successful save
      setIsEditingBusiness(false)
      setOriginalBusiness(null)
      toast({ title: 'Success', description: 'Business information updated' })
    },
    onError: (error) => {
      // Attempt to parse validation errors returned from the server
      // Expected format: { success: false, message: 'Validation errors', errors: ['Invalid email address', ...] }
      const resp = (error as { response?: { data?: unknown } })?.response?.data
      // Narrow unknown `resp` to an object that may have `errors` before accessing it
      if (resp && typeof resp === 'object' && 'errors' in resp) {
        const maybe = resp as { errors?: unknown }
        if (Array.isArray(maybe.errors)) {
          const errs: Partial<Record<keyof Settings['business'], string>> = {}
          for (const m of maybe.errors) {
          const lower = String(m).toLowerCase()
          if (lower.includes('name')) errs.name = String(m)
          else if (lower.includes('email')) errs.email = String(m)
          else if (lower.includes('phone')) errs.phone = String(m)
          else if (lower.includes('website')) errs.website = String(m)
          else if (lower.includes('address')) errs.address = String(m)
          else if (lower.includes('description')) errs.description = String(m)
          else if (lower.includes('logo')) errs.logo = String(m)
        }
        // If we mapped any field errors, set them; otherwise show combined toast
        if (Object.keys(errs).length > 0) {
          setBusinessErrors(errs)
          return
        }
      }
      }

      // Fallback: show toast with message
      toast({ title: 'Error', description: getErrorMessage(error, 'Failed to update business info') })
    }
  })

  const hoursMutation = useMutation({
    mutationFn: updateBusinessHours,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      // exit edit mode when hours saved
      setIsEditingHours(false)
      setOriginalHours(null)
      toast({ title: 'Success', description: 'Business hours updated' })
    },
    onError: (error) => {
      toast({ title: 'Error', description: getErrorMessage(error, 'Failed to update business hours') })
    }
  })

  const taxMutation = useMutation({
    mutationFn: updateTax,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      setIsEditingTax(false)
      setOriginalTax(null)
      toast({ title: 'Success', description: 'Tax settings updated' })
    },
    onError: (error) => {
      toast({ title: 'Error', description: getErrorMessage(error, 'Failed to update tax settings') })
    }
  })

  const deliveryMutation = useMutation({
    mutationFn: updateDelivery,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      setIsEditingDelivery(false)
      setOriginalDelivery(null)
      toast({ title: 'Success', description: 'Delivery settings updated' })
    },
    onError: (error) => {
      toast({ title: 'Error', description: getErrorMessage(error, 'Failed to update delivery settings') })
    }
  })

  const tiersMutation = useMutation({
    mutationFn: updateTiers,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      setIsEditingTiers(false)
      setOriginalTiers(null)
      toast({ title: 'Success', description: 'Tiers updated' })
    },
    onError: (error) => {
      toast({ title: 'Error', description: getErrorMessage(error, 'Failed to update tiers') })
    }
  })

  const referralMutation = useMutation({
    mutationFn: updateReferral,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      setIsEditingReferral(false)
      setOriginalReferral(null)
      toast({ title: 'Success', description: 'Referral settings updated' })
    },
    onError: (error) => {
      toast({ title: 'Error', description: getErrorMessage(error, 'Failed to update referral settings') })
    }
  })

  const schedulingMutation = useMutation({
    mutationFn: updateScheduling,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      setIsEditingScheduling(false)
      setOriginalScheduling(null)
      toast({ title: 'Success', description: 'Scheduling settings updated' })
    },
    onError: (error) => {
      toast({ title: 'Error', description: getErrorMessage(error, 'Failed to update scheduling settings') })
    }
  })

  const handleSaveBusiness = () => businessMutation.mutate(settings.business)
  const handleSaveHours = () => hoursMutation.mutate(settings.hours)
  const handleSaveTax = () => taxMutation.mutate(settings.tax)
  const handleSaveDelivery = () => deliveryMutation.mutate(settings.delivery)
  const handleSaveTiers = () => tiersMutation.mutate(settings.tiers)
  const handleSaveReferral = () => referralMutation.mutate(settings.referral)
  const handleSaveScheduling = () => schedulingMutation.mutate(settings.scheduling)

  

  const updateBusinessSetting = (field: keyof Settings['business'], value: string) => {
    setSettings(prev => ({
      ...prev,
      business: {
        ...prev.business,
        [field]: value,
      },
    }))
    // Clear inline error for this field when user types
    setBusinessErrors(prev => ({ ...prev, [field]: undefined }))
  }

  const updateHoursSetting = (day: keyof Settings['hours'], field: string, value: string | boolean) => {
    setSettings(prev => ({
      ...prev,
      hours: {
        ...prev.hours,
        [day]: {
          ...prev.hours[day],
          [field]: value,
        },
      },
    }))
  }

  const updateTaxSetting = (field: keyof Settings['tax'], value: number | boolean) => {
    setSettings(prev => ({
      ...prev,
      tax: {
        ...prev.tax,
        [field]: value,
      },
    }))
  }

  const updateDeliverySetting = (field: keyof Settings['delivery'], value: number | boolean) => {
    setSettings(prev => ({
      ...prev,
      delivery: {
        ...prev.delivery,
        [field]: value,
      },
    }))
  }

  const updateTierSetting = (tier: keyof Settings['tiers'], field: string, value: number | string | string[]) => {
    setSettings(prev => ({
      ...prev,
      tiers: {
        ...prev.tiers,
        [tier]: {
          ...prev.tiers[tier],
          [field]: value,
        },
      },
    }))
  }

  const updateReferralSetting = (field: keyof Settings['referral'], value: number | boolean) => {
    setSettings(prev => ({
      ...prev,
      referral: {
        ...prev.referral,
        [field]: value,
      },
    }))
  }

  const updateSchedulingSetting = (field: keyof Settings['scheduling'], value: number) => {
    setSettings(prev => ({
      ...prev,
      scheduling: {
        ...prev.scheduling,
        [field]: value,
      },
    }))
  }

  const days = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' },
  ] as const

  const tiers = [
    { key: 'bronze', label: 'Bronze', color: 'bg-status-warning-100 text-status-warning-800' },
    { key: 'silver', label: 'Silver', color: 'bg-status-neutral-100 text-status-neutral-800' },
    { key: 'gold', label: 'Gold', color: 'bg-status-warning-100 text-status-warning-800' },
  ] as const

  if (isLoading) {
    return (
      <div className="flex-1 space-y-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <SettingsIcon className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
            <p className="mt-2 text-muted-foreground">Loading settings...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
      </div>

      <Tabs defaultValue="business" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="hours">Hours</TabsTrigger>
          <TabsTrigger value="tax">Tax</TabsTrigger>
          <TabsTrigger value="delivery">Delivery</TabsTrigger>
          <TabsTrigger value="tiers">Tiers</TabsTrigger>
          <TabsTrigger value="referral">Referral</TabsTrigger>
          {/* <TabsTrigger value="scheduling">Scheduling</TabsTrigger> */}
        </TabsList>

        <TabsContent value="business" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <SettingsIcon className="mr-2 h-5 w-5" />
                Business Information
              </CardTitle>
              <CardDescription>
                Configure your restaurant&apos;s basic information and branding.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="business-name">Restaurant Name</Label>
                  <Input
                    id="business-name"
                    value={settings.business.name}
                    onChange={(e) => updateBusinessSetting('name', e.target.value)}
                    placeholder="Enter restaurant name"
                    className={businessErrors.name ? 'border-red-500 focus:border-red-600' : ''}
                    disabled={!isEditingBusiness}
                  />
                    {businessErrors.name && (
                      <p className="text-sm text-destructive mt-1">{businessErrors.name}</p>
                    )}
                  </div>
                <div className="space-y-2">
                  <Label htmlFor="business-phone">Phone Number</Label>
                  <Input
                    id="business-phone"
                    value={settings.business.phone}
                    onChange={(e) => updateBusinessSetting('phone', e.target.value)}
                    placeholder="+91 9876543210"
                    className={businessErrors.phone ? 'border-red-500 focus:border-red-600' : ''}
                    disabled={!isEditingBusiness}
                  />
                    {businessErrors.phone && (
                      <p className="text-sm text-destructive mt-1">{businessErrors.phone}</p>
                    )}
                  </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="business-email">Email Address</Label>
                <Input
                  id="business-email"
                  type="email"
                  value={settings.business.email}
                  onChange={(e) => updateBusinessSetting('email', e.target.value)}
                  placeholder="contact@restaurant.com"
                  className={businessErrors.email ? 'border-red-500 focus:border-red-600' : ''}
                  disabled={!isEditingBusiness}
                />
                  {businessErrors.email && (
                    <p className="text-sm text-destructive mt-1">{businessErrors.email}</p>
                  )}
                </div>
              <div className="space-y-2">
                <Label htmlFor="business-website">Website</Label>
                <Input
                  id="business-website"
                  value={settings.business.website}
                  onChange={(e) => updateBusinessSetting('website', e.target.value)}
                  placeholder="https://restaurant.com"
                  className={businessErrors.website ? 'border-red-500 focus:border-red-600' : ''}
                  disabled={!isEditingBusiness}
                />
                  {businessErrors.website && (
                    <p className="text-sm text-destructive mt-1">{businessErrors.website}</p>
                  )}
                </div>
              <div className="space-y-2">
                <Label htmlFor="business-address">Address</Label>
                <Textarea
                  id="business-address"
                  value={settings.business.address}
                  onChange={(e) => updateBusinessSetting('address', e.target.value)}
                  placeholder="Enter full address"
                  rows={3}
                  className={businessErrors.address ? 'border-red-500 focus:border-red-600' : ''}
                  disabled={!isEditingBusiness}
                />
                  {businessErrors.address && (
                    <p className="text-sm text-destructive mt-1">{businessErrors.address}</p>
                  )}
                </div>
              <div className="space-y-2">
                <Label htmlFor="business-description">Description</Label>
                <Textarea
                  id="business-description"
                  value={settings.business.description}
                  onChange={(e) => updateBusinessSetting('description', e.target.value)}
                  placeholder="Brief description of your restaurant"
                  rows={3}
                  className={businessErrors.description ? 'border-red-500 focus:border-red-600' : ''}
                  disabled={!isEditingBusiness}
                />
                  {businessErrors.description && (
                    <p className="text-sm text-destructive mt-1">{businessErrors.description}</p>
                  )}
                </div>
            </CardContent>
            <CardFooter className="justify-end">
              <div className="flex items-center space-x-2">
                {isEditingBusiness && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Cancel edits and restore original values
                      if (originalBusiness) {
                        setSettings(prev => ({ ...prev, business: originalBusiness }))
                      }
                      setOriginalBusiness(null)
                      setBusinessErrors({})
                      setIsEditingBusiness(false)
                    }}
                    disabled={businessMutation.isPending}
                  >
                    Cancel
                  </Button>
                )}

                <Button
                  onClick={() => {
                    if (isEditingBusiness) {
                      // currently editing -> save
                      handleSaveBusiness()
                    } else {
                      // enter edit mode: snapshot current business values
                      setBusinessErrors({})
                      setOriginalBusiness({ ...settings.business })
                      setIsEditingBusiness(true)
                    }
                  }}
                  disabled={businessMutation.isPending}
                >
                  {businessMutation.isPending ? 'Saving...' : isEditingBusiness ? 'Save Business' : 'Edit Business'}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="hours" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="mr-2 h-5 w-5" />
                Operating Hours
              </CardTitle>
              <CardDescription>
                Set your restaurant&apos;s operating hours for each day of the week.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {days.map((day) => (
                <div key={day.key} className="flex items-center space-x-4 p-4 border rounded-lg">
                  <div className="w-24">
                    <Label className="text-sm font-medium">{day.label}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                        checked={settings.hours[day.key].isOpen}
                        onCheckedChange={(checked) => updateHoursSetting(day.key, 'isOpen', checked)}
                        disabled={!isEditingHours}
                    />
                    <span className="text-sm text-muted-foreground">
                      {settings.hours[day.key].isOpen ? 'Open' : 'Closed'}
                    </span>
                  </div>
                  {settings.hours[day.key].isOpen && (
                    <>
                      <div className="flex items-center space-x-2">
                        <Label className="text-sm">Open:</Label>
                        <Input
                          type="time"
                          value={settings.hours[day.key].open}
                          onChange={(e) => updateHoursSetting(day.key, 'open', e.target.value)}
                          disabled={!isEditingHours}
                          className="w-32"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Label className="text-sm">Close:</Label>
                        <Input
                          type="time"
                          value={settings.hours[day.key].close}
                          onChange={(e) => updateHoursSetting(day.key, 'close', e.target.value)}
                          disabled={!isEditingHours}
                          className="w-32"
                        />
                      </div>
                    </>
                  )}
                </div>
              ))}
            </CardContent>
            <CardFooter className="justify-end">
              <div className="flex items-center space-x-2">
                {isEditingHours && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (originalHours) {
                        setSettings(prev => ({ ...prev, hours: originalHours }))
                      }
                      setOriginalHours(null)
                      setIsEditingHours(false)
                    }}
                    disabled={hoursMutation.isPending}
                  >
                    Cancel
                  </Button>
                )}

                <Button
                  onClick={() => {
                    if (isEditingHours) {
                      handleSaveHours()
                    } else {
                      setOriginalHours({ ...settings.hours })
                      setIsEditingHours(true)
                    }
                  }}
                  disabled={hoursMutation.isPending}
                >
                  {hoursMutation.isPending ? 'Saving...' : isEditingHours ? 'Save Hours' : 'Edit Hours'}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="tax" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="mr-2 h-5 w-5" />
                Tax & Service Charges
              </CardTitle>
              <CardDescription>
                Configure GST rates and service charges for your restaurant.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gst-rate">GST Rate (%)</Label>
                  <Input
                    id="gst-rate"
                    type="number"
                    value={settings.tax.gstRate}
                    onChange={(e) => updateTaxSetting('gstRate', parseFloat(e.target.value) || 0)}
                    disabled={!isEditingTax}
                    placeholder="18"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="service-charge">Service Charge (%)</Label>
                  <Input
                    id="service-charge"
                    type="number"
                    value={settings.tax.serviceChargeRate}
                    onChange={(e) => updateTaxSetting('serviceChargeRate', parseFloat(e.target.value) || 0)}
                    disabled={!isEditingTax}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="tax-inclusive"
                  checked={settings.tax.isInclusive}
                  onCheckedChange={(checked) => updateTaxSetting('isInclusive', checked)}
                  disabled={!isEditingTax}
                />
                <Label htmlFor="tax-inclusive">GST is inclusive in item prices</Label>
              </div>
            </CardContent>
            <CardFooter className="justify-end">
              <div className="flex items-center space-x-2">
                {isEditingTax && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (originalTax) {
                        setSettings(prev => ({ ...prev, tax: originalTax }))
                      }
                      setOriginalTax(null)
                      setIsEditingTax(false)
                    }}
                    disabled={taxMutation.isPending}
                  >
                    Cancel
                  </Button>
                )}

                <Button
                  onClick={() => {
                    if (isEditingTax) {
                      handleSaveTax()
                    } else {
                      setOriginalTax({ ...settings.tax })
                      setIsEditingTax(true)
                    }
                  }}
                  disabled={taxMutation.isPending}
                >
                  {taxMutation.isPending ? 'Saving...' : isEditingTax ? 'Save Tax' : 'Edit Tax'}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="delivery" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Truck className="mr-2 h-5 w-5" />
                Delivery Settings
              </CardTitle>
              <CardDescription>
                Configure delivery options, fees, and restrictions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <Switch
                  id="delivery-enabled"
                  checked={settings.delivery.isEnabled}
                  onCheckedChange={(checked) => updateDeliverySetting('isEnabled', checked)}
                  disabled={!isEditingDelivery}
                />
                <Label htmlFor="delivery-enabled">Enable delivery service</Label>
              </div>

              {settings.delivery.isEnabled && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="min-order">Minimum Order (₹)</Label>
                    <Input
                      id="min-order"
                      type="number"
                      value={settings.delivery.minimumOrder}
                      onChange={(e) => updateDeliverySetting('minimumOrder', parseFloat(e.target.value) || 0)}
                      disabled={!isEditingDelivery}
                      placeholder="200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="delivery-fee">Delivery Fee (₹)</Label>
                    <Input
                      id="delivery-fee"
                      type="number"
                      value={settings.delivery.deliveryFee}
                      onChange={(e) => updateDeliverySetting('deliveryFee', parseFloat(e.target.value) || 0)}
                      disabled={!isEditingDelivery}
                      placeholder="50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="free-delivery">Free Delivery Threshold (₹)</Label>
                    <Input
                      id="free-delivery"
                      type="number"
                      value={settings.delivery.freeDeliveryThreshold}
                      onChange={(e) => updateDeliverySetting('freeDeliveryThreshold', parseFloat(e.target.value) || 0)}
                      disabled={!isEditingDelivery}
                      placeholder="500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="estimated-time">Estimated Delivery Time (minutes)</Label>
                    <Input
                      id="estimated-time"
                      type="number"
                      value={settings.delivery.estimatedTime}
                      onChange={(e) => updateDeliverySetting('estimatedTime', parseFloat(e.target.value) || 0)}
                      disabled={!isEditingDelivery}
                      placeholder="45"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max-distance">Maximum Delivery Distance (km)</Label>
                    <Input
                      id="max-distance"
                      type="number"
                      value={settings.delivery.maxDistance}
                      onChange={(e) => updateDeliverySetting('maxDistance', parseFloat(e.target.value) || 0)}
                      disabled={!isEditingDelivery}
                      placeholder="10"
                    />
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="justify-end">
              <div className="flex items-center space-x-2">
                {isEditingDelivery && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (originalDelivery) {
                        setSettings(prev => ({ ...prev, delivery: originalDelivery }))
                      }
                      setOriginalDelivery(null)
                      setIsEditingDelivery(false)
                    }}
                    disabled={deliveryMutation.isPending}
                  >
                    Cancel
                  </Button>
                )}

                <Button
                  onClick={() => {
                    if (isEditingDelivery) {
                      handleSaveDelivery()
                    } else {
                      setOriginalDelivery({ ...settings.delivery })
                      setIsEditingDelivery(true)
                    }
                  }}
                  disabled={deliveryMutation.isPending}
                >
                  {deliveryMutation.isPending ? 'Saving...' : isEditingDelivery ? 'Save Delivery' : 'Edit Delivery'}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="tiers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="mr-2 h-5 w-5" />
                Customer Tiers
              </CardTitle>
              <CardDescription>
                Configure loyalty tiers and their benefits for customers.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {tiers.map((tier) => (
                <div key={tier.key} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className={`text-lg font-semibold px-2 py-1 rounded`}>
                      {tier.label} Tier
                    </h4>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Minimum Orders</Label>
                      <Input
                          type="number"
                          value={settings.tiers[tier.key].minOrders}
                          onChange={(e) => updateTierSetting(tier.key, 'minOrders', parseInt(e.target.value) || 0)}
                          placeholder="0"
                          disabled={!isEditingTiers}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Discount (%)</Label>
                      <Input
                        type="number"
                        value={settings.tiers[tier.key].discount}
                        onChange={(e) => updateTierSetting(tier.key, 'discount', parseInt(e.target.value) || 0)}
                        placeholder="0"
                        disabled={!isEditingTiers}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Benefits</Label>
                      <Input
                        value={settings.tiers[tier.key].benefits.join(', ')}
                        onChange={(e) => updateTierSetting(tier.key, 'benefits', e.target.value.split(',').map(b => b.trim()).filter(b => b))}
                        placeholder="Priority support, Free delivery"
                        disabled={!isEditingTiers}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
            <CardFooter className="justify-end">
              <div className="flex items-center space-x-2">
                {isEditingTiers && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (originalTiers) {
                        setSettings(prev => ({ ...prev, tiers: originalTiers }))
                      }
                      setOriginalTiers(null)
                      setIsEditingTiers(false)
                    }}
                    disabled={tiersMutation.isPending}
                  >
                    Cancel
                  </Button>
                )}

                <Button
                  onClick={() => {
                    if (isEditingTiers) {
                      handleSaveTiers()
                    } else {
                      setOriginalTiers({ ...settings.tiers })
                      setIsEditingTiers(true)
                    }
                  }}
                  disabled={tiersMutation.isPending}
                >
                  {tiersMutation.isPending ? 'Saving...' : isEditingTiers ? 'Save Tiers' : 'Edit Tiers'}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="referral" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Gift className="mr-2 h-5 w-5" />
                Referral Program
              </CardTitle>
              <CardDescription>
                Configure referral rewards and incentives for customers.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <Switch
                  id="referral-enabled"
                  checked={settings.referral.isEnabled}
                  onCheckedChange={(checked) => updateReferralSetting('isEnabled', checked)}
                  disabled={!isEditingReferral}
                />
                <Label htmlFor="referral-enabled">Enable referral program</Label>
              </div>

              {settings.referral.isEnabled && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="referrer-reward">Referrer Reward (₹)</Label>
                    <Input
                      id="referrer-reward"
                      type="number"
                      value={settings.referral.referrerReward}
                      onChange={(e) => updateReferralSetting('referrerReward', parseFloat(e.target.value) || 0)}
                      placeholder="100"
                      disabled={!isEditingReferral}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="referee-reward">Referee Reward (₹)</Label>
                    <Input
                      id="referee-reward"
                      type="number"
                      value={settings.referral.refereeReward}
                      onChange={(e) => updateReferralSetting('refereeReward', parseFloat(e.target.value) || 0)}
                      placeholder="50"
                      disabled={!isEditingReferral}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="min-order-value">Minimum Order Value (₹)</Label>
                    <Input
                      id="min-order-value"
                      type="number"
                      value={settings.referral.minOrderValue}
                      onChange={(e) => updateReferralSetting('minOrderValue', parseFloat(e.target.value) || 0)}
                      placeholder="300"
                      disabled={!isEditingReferral}
                    />
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="justify-end">
              <div className="flex items-center space-x-2">
                {isEditingReferral && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (originalReferral) {
                        setSettings(prev => ({ ...prev, referral: originalReferral }))
                      }
                      setOriginalReferral(null)
                      setIsEditingReferral(false)
                    }}
                    disabled={referralMutation.isPending}
                  >
                    Cancel
                  </Button>
                )}

                <Button
                  onClick={() => {
                    if (isEditingReferral) {
                      handleSaveReferral()
                    } else {
                      setOriginalReferral({ ...settings.referral })
                      setIsEditingReferral(true)
                    }
                  }}
                  disabled={referralMutation.isPending}
                >
                  {referralMutation.isPending ? 'Saving...' : isEditingReferral ? 'Save Referral' : 'Edit Referral'}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* <TabsContent value="scheduling" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="mr-2 h-5 w-5" />
                Reservation Scheduling
              </CardTitle>
              <CardDescription>
                Configure reservation policies and time settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="advance-booking">Advance Booking (days)</Label>
                  <Input
                    id="advance-booking"
                    type="number"
                    value={settings.scheduling.advanceBookingDays}
                    onChange={(e) => updateSchedulingSetting('advanceBookingDays', parseInt(e.target.value) || 0)}
                    placeholder="30"
                    disabled={!isEditingScheduling}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cancellation-hours">Cancellation Notice (hours)</Label>
                  <Input
                    id="cancellation-hours"
                    type="number"
                    value={settings.scheduling.cancellationHours}
                    onChange={(e) => updateSchedulingSetting('cancellationHours', parseInt(e.target.value) || 0)}
                    placeholder="2"
                    disabled={!isEditingScheduling}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max-guests">Maximum Guests per Reservation</Label>
                  <Input
                    id="max-guests"
                    type="number"
                    value={settings.scheduling.maxGuestsPerReservation}
                    onChange={(e) => updateSchedulingSetting('maxGuestsPerReservation', parseInt(e.target.value) || 0)}
                    placeholder="20"
                    disabled={!isEditingScheduling}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reservation-duration">Default Reservation Duration (minutes)</Label>
                  <Input
                    id="reservation-duration"
                    type="number"
                    value={settings.scheduling.reservationDuration}
                    onChange={(e) => updateSchedulingSetting('reservationDuration', parseInt(e.target.value) || 0)}
                    placeholder="120"
                    disabled={!isEditingScheduling}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="justify-end">
              <div className="flex items-center space-x-2">
                {isEditingScheduling && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (originalScheduling) {
                        setSettings(prev => ({ ...prev, scheduling: originalScheduling }))
                      }
                      setOriginalScheduling(null)
                      setIsEditingScheduling(false)
                    }}
                    disabled={schedulingMutation.isPending}
                  >
                    Cancel
                  </Button>
                )}

                <Button
                  onClick={() => {
                    if (isEditingScheduling) {
                      handleSaveScheduling()
                    } else {
                      setOriginalScheduling({ ...settings.scheduling })
                      setIsEditingScheduling(true)
                    }
                  }}
                  disabled={schedulingMutation.isPending}
                >
                  {schedulingMutation.isPending ? 'Saving...' : isEditingScheduling ? 'Save Scheduling' : 'Edit Scheduling'}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </TabsContent> */}
      </Tabs>
    </div>
  )
}