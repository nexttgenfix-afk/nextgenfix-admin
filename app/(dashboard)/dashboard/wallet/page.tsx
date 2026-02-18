'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Search, TrendingUp, Users, Wallet as WalletIcon, Phone, Mail } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import * as walletApi from '@/lib/api/wallet'
import { useRouter } from 'next/navigation'

interface WalletStatsData {
  totalBalance: number
  usersWithBalance: number
  transactionStats: { [key: string]: { count: number; totalAmount: number } }
  summary: {
    topUps: { count: number; totalAmount: number }
    payments: { count: number; totalAmount: number }
    refunds: { count: number; totalAmount: number }
    bonuses: { count: number; totalAmount: number }
    deductions: { count: number; totalAmount: number }
  }
}

export default function WalletPage() {
  const [stats, setStats] = useState<WalletStatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<walletApi.SearchUser[]>([])
  const [showResults, setShowResults] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    loadStats()
  }, [])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  // Handle clicking outside dropdown
  useEffect(() => {
    const handleClickOutside = () => {
      setShowResults(false)
    }

    if (showResults) {
      document.addEventListener('click', handleClickOutside)
      return () => {
        document.removeEventListener('click', handleClickOutside)
      }
    }
  }, [showResults])

  const loadStats = async () => {
    try {
      setLoading(true)
      const data = await walletApi.getWalletStats()
      setStats(data)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load wallet statistics',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async (value: string) => {
    setSearchQuery(value)

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (value.length < 2) {
      setSearchResults([])
      setShowResults(false)
      return
    }

    setSearchLoading(true)
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await walletApi.searchUsers(value)
        setSearchResults(results)
        setShowResults(true)
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to search users',
          variant: 'destructive',
        })
      } finally {
        setSearchLoading(false)
      }
    }, 300)
  }

  const handleSelectUser = (userId: string) => {
    setShowResults(false)
    router.push(`/dashboard/wallet/user/${userId}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount)
  }

  return (
    <div className="space-y-6 p-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Wallet Management</h1>
          <p className="text-muted-foreground mt-1">Monitor and manage user wallets and transactions</p>
        </div>
      </div>

      {/* Search User Wallet */}
      <Card>
        <CardHeader>
          <CardTitle>Search User Wallet</CardTitle>
          <CardDescription>Search by user name or phone number to view and manage their wallet</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  placeholder="Search by name or phone number..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  onFocus={() => searchResults.length > 0 && setShowResults(true)}
                  className="flex-1"
                />
                {searchLoading && (
                  <Loader2 className="absolute right-3 top-2.5 h-5 w-5 animate-spin text-muted-foreground" />
                )}
              </div>
            </div>

            {/* Search Results Dropdown */}
            {showResults && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-input rounded-md shadow-lg z-50">
                <div className="max-h-64 overflow-y-auto">
                  {searchResults.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => handleSelectUser(user.id)}
                      className="w-full text-left px-4 py-3 hover:bg-accent border-b last:border-b-0 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{user.name}</p>
                          <div className="flex items-center gap-4 mt-1">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {user.phone}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              {user.email}
                            </div>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <Badge variant="outline" className="whitespace-nowrap">
                            ₹{user.walletBalance.toFixed(2)}
                          </Badge>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* No Results Message */}
            {showResults && searchResults.length === 0 && searchQuery.length >= 2 && !searchLoading && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-input rounded-md shadow-lg z-50 p-4 text-center text-sm text-muted-foreground">
                No users found matching "{searchQuery}"
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Wallet Balance</CardTitle>
            <WalletIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats?.totalBalance || 0)}</div>
            <p className="text-xs text-muted-foreground">Across all users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Users with Balance</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.usersWithBalance || 0}</div>
            <p className="text-xs text-muted-foreground">Active wallet users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top-ups</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.summary.topUps.count || 0}</div>
            <p className="text-xs text-muted-foreground">{formatCurrency(stats?.summary.topUps.totalAmount || 0)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payments</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.summary.payments.count || 0}</div>
            <p className="text-xs text-muted-foreground">{formatCurrency(stats?.summary.payments.totalAmount || 0)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Transaction Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction Summary</CardTitle>
          <CardDescription>Overview of all wallet transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Top-ups</p>
              <p className="text-lg font-semibold">{stats?.summary.topUps.count || 0}</p>
              <p className="text-xs text-green-600">{formatCurrency(stats?.summary.topUps.totalAmount || 0)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Payments</p>
              <p className="text-lg font-semibold">{stats?.summary.payments.count || 0}</p>
              <p className="text-xs text-blue-600">{formatCurrency(stats?.summary.payments.totalAmount || 0)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Refunds</p>
              <p className="text-lg font-semibold">{stats?.summary.refunds.count || 0}</p>
              <p className="text-xs text-orange-600">{formatCurrency(stats?.summary.refunds.totalAmount || 0)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Bonuses</p>
              <p className="text-lg font-semibold">{stats?.summary.bonuses.count || 0}</p>
              <p className="text-xs text-purple-600">{formatCurrency(stats?.summary.bonuses.totalAmount || 0)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Deductions</p>
              <p className="text-lg font-semibold">{stats?.summary.deductions.count || 0}</p>
              <p className="text-xs text-red-600">{formatCurrency(stats?.summary.deductions.totalAmount || 0)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Refresh Button */}
      <div className="flex justify-end">
        <Button onClick={loadStats} variant="outline" size="sm">
          Refresh Stats
        </Button>
      </div>
    </div>
  )
}
