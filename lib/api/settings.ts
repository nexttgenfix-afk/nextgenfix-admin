import apiClient from './client'

export interface BusinessInfo {
  name: string
  description: string
  phone: string
  email: string
  address: string
  website: string
  logo: string
}

export interface DayHours {
  open: string
  close: string
  isOpen: boolean
}

export interface BusinessHoursMap {
  monday: DayHours
  tuesday: DayHours
  wednesday: DayHours
  thursday: DayHours
  friday: DayHours
  saturday: DayHours
  sunday: DayHours
}

export interface TaxConfig {
  gstRate: number
  serviceChargeRate: number
  isInclusive: boolean
}

export interface DeliveryConfig {
  isEnabled: boolean
  minimumOrder: number
  deliveryFee: number
  freeDeliveryThreshold: number
  estimatedTime: number
  maxDistance: number
}

export interface TierInfo {
  minOrders: number
  discount: number
  benefits: string[]
}

export interface TierConfig {
  silver: TierInfo
  gold: TierInfo
  platinum: TierInfo
}

export interface ReferralConfig {
  isEnabled: boolean
  referrerReward: number
  refereeReward: number
  minOrderValue: number
}

export interface SchedulingConfig {
  advanceBookingDays: number
  cancellationHours: number
  maxGuestsPerReservation: number
  reservationDuration: number
}

export interface Settings {
  business: BusinessInfo
  hours: BusinessHoursMap
  tax: TaxConfig
  delivery: DeliveryConfig
  tiers: TierConfig
  referral: ReferralConfig
  scheduling: SchedulingConfig
}

export const getSettings = async () => {
  const response = await apiClient.get('/settings')
  const respData = response.data as unknown
  const raw = (respData as { settings?: unknown }).settings ?? (respData as { data?: unknown }).data ?? respData
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw2 = raw as any

  // Map backend shape to frontend Settings shape
  const mapped: Settings = {
    business: {
      name: raw2?.business?.name ?? '' ,
      description: raw2?.business?.description ?? '' ,
      phone: raw2?.business?.phone ?? '' ,
      email: raw2?.business?.email ?? '' ,
      address: raw2?.business?.address ?? '' ,
      website: raw2?.business?.website ?? '' ,
      logo: raw2?.business?.logo ?? '' ,
    },
    hours: {
      monday: { open: '09:00', close: '22:00', isOpen: true },
      tuesday: { open: '09:00', close: '22:00', isOpen: true },
      wednesday: { open: '09:00', close: '22:00', isOpen: true },
      thursday: { open: '09:00', close: '22:00', isOpen: true },
      friday: { open: '09:00', close: '22:00', isOpen: true },
      saturday: { open: '09:00', close: '22:00', isOpen: true },
      sunday: { open: '09:00', close: '22:00', isOpen: false },
    },
    tax: {
  gstRate: raw2?.taxInfo?.gstRate ?? 0,
  serviceChargeRate: raw2?.taxInfo?.serviceTax ?? 0,
  isInclusive: raw2?.taxInfo?.isInclusive ?? false,
    },
    delivery: {
  isEnabled: raw2?.deliveryCharges ? true : false,
  minimumOrder: raw2?.deliveryCharges?.minOrderAmount ?? 0,
  deliveryFee: raw2?.deliveryCharges?.baseFee ?? 0,
  freeDeliveryThreshold: raw2?.deliveryCharges?.freeDeliveryThreshold ?? 0,
  estimatedTime: raw2?.deliveryCharges?.estimatedTime ?? 0,
  maxDistance: raw2?.deliveryCharges?.maxDeliveryDistance ?? raw2?.deliveryCharges?.maxDeliveryDistance ?? 0,
    },
    tiers: {
  silver: { minOrders: raw2?.tierConfig?.silver?.minOrders ?? 0, discount: raw2?.tierConfig?.silver?.discount ?? 0, benefits: raw2?.tierConfig?.silver?.benefits ?? [] },
  gold: { minOrders: raw2?.tierConfig?.gold?.minOrders ?? 0, discount: raw2?.tierConfig?.gold?.discount ?? 0, benefits: raw2?.tierConfig?.gold?.benefits ?? [] },
  platinum: { minOrders: raw2?.tierConfig?.platinum?.minOrders ?? 0, discount: raw2?.tierConfig?.platinum?.discount ?? 0, benefits: raw2?.tierConfig?.platinum?.benefits ?? [] },
    },
    referral: {
  isEnabled: raw2?.referralConfig?.enabled ?? false,
  referrerReward: raw2?.referralConfig?.referrerReward ?? 0,
  refereeReward: raw2?.referralConfig?.refereeReward ?? 0,
  minOrderValue: raw2?.referralConfig?.minOrderAmount ?? 0,
    },
    scheduling: {
      advanceBookingDays: raw2?.schedulingConfig?.maxDaysInAdvance ?? 0,
      cancellationHours: raw2?.schedulingConfig?.cancellationHours ?? 0,
      maxGuestsPerReservation: raw2?.schedulingConfig?.maxGuestsPerReservation ?? 0,
      reservationDuration: raw2?.schedulingConfig?.slotDuration ?? 0,
    },
  }

  // Map business hours if present (backend uses businessHours with isClosed flag)
  if (raw2?.businessHours && typeof raw2.businessHours === 'object') {
    for (const day of Object.keys(mapped.hours) as Array<keyof Settings['hours']>) {
      const b = raw2.businessHours[day]
      if (b) {
        mapped.hours[day] = {
          open: b.open ?? mapped.hours[day].open,
          close: b.close ?? mapped.hours[day].close,
          isOpen: b.isClosed === undefined ? (b.isOpen ?? mapped.hours[day].isOpen) : !b.isClosed,
        }
      }
    }
  }

  return { settings: mapped }
}

export const updateSettings = async (data: Partial<Settings>) => {
  // Legacy: single-endpoint update (not supported by backend routes in some deployments)
  const response = await apiClient.put<{ settings: Settings }>('/settings', data)
  return response.data
}

// Per-section update functions matching backend routes
export const updateBusinessHours = async (businessHours: Partial<Settings['hours']>) => {
  const response = await apiClient.put('/settings/business-hours', { businessHours })
  return response.data
}

export const updateBusiness = async (payload: Partial<Settings['business']>) => {
  const body: Partial<Settings['business']> = {}
  if (payload.name !== undefined) body.name = payload.name
  if (payload.description !== undefined) body.description = payload.description
  if (payload.phone !== undefined) body.phone = payload.phone
  if (payload.email !== undefined) body.email = payload.email
  if (payload.address !== undefined) body.address = payload.address
  if (payload.website !== undefined) body.website = payload.website
  if (payload.logo !== undefined) body.logo = payload.logo

  const response = await apiClient.put('/settings/business', body)
  return response.data
}

export const updateDelivery = async (payload: Partial<Settings['delivery']>) => {
  // map frontend delivery keys to backend expected keys where appropriate
  const body: Record<string, number | string | boolean | undefined> = {}
  if (payload.deliveryFee !== undefined) body.baseFee = payload.deliveryFee
  if ((payload as unknown as { minimumOrder?: number }).minimumOrder !== undefined) body.minOrderAmount = (payload as unknown as { minimumOrder?: number }).minimumOrder
  if ((payload as unknown as { freeDeliveryThreshold?: number }).freeDeliveryThreshold !== undefined) body.freeDeliveryThreshold = (payload as unknown as { freeDeliveryThreshold?: number }).freeDeliveryThreshold
  if ((payload as unknown as { maxDistance?: number }).maxDistance !== undefined) body.maxDeliveryDistance = (payload as unknown as { maxDistance?: number }).maxDistance
  if ((payload as unknown as { perKm?: number }).perKm !== undefined) body.perKm = (payload as unknown as { perKm?: number }).perKm

  const response = await apiClient.put('/settings/delivery', body)
  return response.data
}

export const updateTiers = async (tiers: Partial<Settings['tiers']>) => {
  // backend expects { tierConfig: { silver: {minOrders, discount, benefits}, ... } }
  const tierConfig: Record<string, { minOrders?: number; discount?: number; benefits?: string[] }> = {}
  for (const k of Object.keys(tiers)) {
    const t = (tiers as unknown as Record<string, Partial<TierInfo>>)[k]
    tierConfig[k] = {
      minOrders: t?.minOrders,
      discount: t?.discount,
      benefits: t?.benefits,
    }
  }
  const response = await apiClient.put('/settings/tiers', { tierConfig })
  return response.data
}

export const updateReferral = async (payload: Partial<Settings['referral']>) => {
  const body: Record<string, number | boolean | undefined> = {}
  if (payload.isEnabled !== undefined) body.enabled = payload.isEnabled
  if ((payload as unknown as { referrerReward?: number }).referrerReward !== undefined) body.referrerReward = (payload as unknown as { referrerReward?: number }).referrerReward
  if ((payload as unknown as { refereeReward?: number }).refereeReward !== undefined) body.refereeReward = (payload as unknown as { refereeReward?: number }).refereeReward
  if ((payload as unknown as { minOrderValue?: number }).minOrderValue !== undefined) body.minOrderAmount = (payload as unknown as { minOrderValue?: number }).minOrderValue

  const response = await apiClient.put('/settings/referral', body)
  return response.data
}

export const updateTax = async (payload: Partial<Settings['tax']>) => {
  const body: Record<string, number | undefined> = {}
  if ((payload as unknown as { gstRate?: number }).gstRate !== undefined) body.gstRate = (payload as unknown as { gstRate?: number }).gstRate
  if ((payload as unknown as { serviceChargeRate?: number }).serviceChargeRate !== undefined) body.serviceTax = (payload as unknown as { serviceChargeRate?: number }).serviceChargeRate
  if ((payload as unknown as { packagingCharge?: number }).packagingCharge !== undefined) body.packagingCharge = (payload as unknown as { packagingCharge?: number }).packagingCharge

  const response = await apiClient.put('/settings/tax', body)
  return response.data
}

export const updateScheduling = async (payload: Partial<Settings['scheduling']>) => {
  const body: Record<string, number | boolean | undefined> = {}
  if ((payload as unknown as { advanceBookingDays?: number }).advanceBookingDays !== undefined) body.maxDaysInAdvance = (payload as unknown as { advanceBookingDays?: number }).advanceBookingDays
  if ((payload as unknown as { reservationDuration?: number }).reservationDuration !== undefined) body.slotDuration = (payload as unknown as { reservationDuration?: number }).reservationDuration
  if ((payload as unknown as { allowPreOrders?: boolean }).allowPreOrders !== undefined) body.allowPreOrders = (payload as unknown as { allowPreOrders?: boolean }).allowPreOrders
  if ((payload as unknown as { allowTableReservation?: boolean }).allowTableReservation !== undefined) body.allowTableReservation = (payload as unknown as { allowTableReservation?: boolean }).allowTableReservation

  const response = await apiClient.put('/settings/scheduling', body)
  return response.data
}
