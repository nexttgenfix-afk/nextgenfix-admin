export interface Admin {
  _id: string
  name: string
  email: string
  phone?: string
  role: 'super_admin' | 'manager' | 'support'
  permissions: string[]
  isActive: boolean
  lastLogin?: string | Date
  profilePicture?: string
}

export interface User {
  _id: string
  name: string
  email?: string
  phone?: string
  tier: 'bronze' | 'silver' | 'gold'
  tierProgress: {
    monthlyOrders: number
    monthlySpend: number
  }
  referralCode: string
  referredBy?: string
  referralCount?: number
  isActive: boolean
  createdAt: string | Date
  calorieGoal?: number
  preferences?: {
    allergens?: string[]
    dietaryPreferences?: string[]
    eatingHabits?: string[]
    spiceLevel?: string
  }
}

export interface MenuItem {
  _id: string
  name: string
  description: string
  category: string
  price: number
  discountedPrice?: number
  image?: string
  allergens: string[]
  nutritionInfo?: {
    calories: number
  }
  preparationTime?: number
  recommendedItems: string[]
  moodTag?: 'locked_in' | 'bougie' | 'homesick' | 'burnt_tf_out' | 'need_a_hug' | null
  hungerLevelTag?: 'little_hungry' | 'quite_hungry' | 'very_hungry' | 'super_hungry' | null
  isAvailable: boolean
  isVegetarian: boolean
}

export interface OrderItem {
  menuItem: MenuItem
  quantity: number
  price: number
}

export interface Order {
  _id: string
  userId: string
  type: 'delivery' | 'take_away' | 'car'
  items: OrderItem[]
  subtotal: number
  tierDiscount: number
  couponDiscount: number
  tax: number
  deliveryCharges: number
  total: number
  status: string
  paymentStatus: string
  paymentMethod: string
  scheduledTime?: string | Date
  tableNumber?: string
  createdAt: string | Date
}
