/**
 * Central API Export Point
 * 
 * Import all API functions from a single location:
 * import { analytics, auth, users, dashboard } from '@/lib/api'
 */

// Export the base client (in case you need direct access)
export { default as apiClient } from './client'

// Export all API modules as namespaces
export * as auth from './auth'
export * as dashboard from './dashboard'
export * as users from './users'
export * as orders from './orders'
export * as complaints from './complaints'
export * as menu from './menu'
export * as coupons from './coupons'
export * as tables from './tables'
export * as categories from './categories'
export * as analytics from './analytics'
export * as settings from './settings'
export * as admins from './admins'
export * as adminUsers from './admin-users'
export * as combos from './combos'
export * as wallet from './wallet'
export * as faqs from './faqs'

// Export commonly used types from analytics
export type {
  TimePeriod,
  AnalyticsResponse,
  TrendData,
  OrderOverview,
  AbandonedCartMetrics,
  PeakOrderTimes,
  RevenueOverview,
  UserOverview,
  UserDemographics,
  UserRetention,
  TopSellingProduct,
  CategoryPerformance,
  SearchAnalytics,
  CustomizationAnalytics,
  SessionAnalytics,
  FavoritesAnalytics,
  PushNotificationAnalytics,
  LoyaltyAnalytics,
  CustomerLTV,
  GenderTrends,
  HighValueCustomers,
  TimeToSecondOrder,
} from './analytics'

// Export types from other modules
export type { Admin } from '../types'
