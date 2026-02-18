'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, ArrowLeft, Plus, Minus, TrendingUp, TrendingDown } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import * as walletApi from '@/lib/api/wallet'

interface WalletUserData {
  user: {
    id: string
    name: string
    email: string
    phone: string
    tier: string
    totalOrders: number
    totalSpent: number
    walletBalance: number
  }
  statsByType: { [key: string]: { count: number; totalAmount: number } }
  recentTransactions: walletApi.WalletTransaction[]
}

export default function UserWalletPage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.userId as string

  const [wallet, setWallet] = useState<WalletUserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddBonus, setShowAddBonus] = useState(false)
  const [showDeduct, setShowDeduct] = useState(false)
  const [bonusAmount, setBonusAmount] = useState('')
  const [bonusDescription, setBonusDescription] = useState('')
  const [deductAmount, setDeductAmount] = useState('')
  const [deductReason, setDeductReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadWallet()
  }, [userId])

  const loadWallet = async () => {
    try {
      setLoading(true)
      const data = await walletApi.getUserWallet(userId)
      setWallet(data)
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to load wallet details'
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddBonus = async () => {
    if (!bonusAmount || parseFloat(bonusAmount) <= 0) {
      toast({
        title: 'Invalid amount',
        description: 'Please enter a valid amount',
        variant: 'destructive',
      })
      return
    }

    try {
      setSubmitting(true)
      await walletApi.addWalletBonus(userId, parseFloat(bonusAmount), bonusDescription)
      toast({
        title: 'Success',
        description: `Bonus of ₹${bonusAmount} added successfully`,
      })
      setShowAddBonus(false)
      setBonusAmount('')
      setBonusDescription('')
      loadWallet()
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to add bonus'
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeduct = async () => {
    if (!deductAmount || parseFloat(deductAmount) <= 0) {
      toast({
        title: 'Invalid amount',
        description: 'Please enter a valid amount',
        variant: 'destructive',
      })
      return
    }

    try {
      setSubmitting(true)
      await walletApi.deductWalletAmount(userId, parseFloat(deductAmount), deductReason)
      toast({
        title: 'Success',
        description: `Amount of ₹${deductAmount} deducted successfully`,
      })
      setShowDeduct(false)
      setDeductAmount('')
      setDeductReason('')
      loadWallet()
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to deduct amount'
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'top_up':
        return 'bg-green-100 text-green-800'
      case 'order_payment':
        return 'bg-blue-100 text-blue-800'
      case 'refund':
        return 'bg-orange-100 text-orange-800'
      case 'bonus':
        return 'bg-purple-100 text-purple-800'
      case 'deduction':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getTransactionTypeLabel = (type: string) => {
    return type.split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!wallet) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground mb-4">User wallet not found</p>
        <Button onClick={() => router.back()} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button onClick={() => router.back()} variant="outline" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{wallet.user.name}</h1>
          <p className="text-muted-foreground">{wallet.user.email}</p>
        </div>
      </div>

      {/* User Info */}
      <Card>
        <CardHeader>
          <CardTitle>User Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{wallet.user.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="font-medium">{wallet.user.phone}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tier</p>
              <Badge className="mt-1">{wallet.user.tier}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Orders</p>
              <p className="font-medium">{wallet.user.totalOrders}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Wallet Balance */}
      <Card className="border-2 border-primary">
        <CardHeader>
          <CardTitle className="text-2xl">Wallet Balance</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <p className="text-4xl font-bold text-primary">{formatCurrency(wallet.user.walletBalance)}</p>
            <p className="text-muted-foreground mt-2">Current available balance</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={showAddBonus} onOpenChange={setShowAddBonus}>
              <Button onClick={() => setShowAddBonus(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Bonus
              </Button>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Wallet Bonus</DialogTitle>
                  <DialogDescription>Add bonus amount to user's wallet</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="bonus-amount">Amount (₹)</Label>
                    <Input
                      id="bonus-amount"
                      type="number"
                      placeholder="Enter amount"
                      value={bonusAmount}
                      onChange={(e) => setBonusAmount(e.target.value)}
                      min="0"
                      step="1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="bonus-desc">Description (Optional)</Label>
                    <Textarea
                      id="bonus-desc"
                      placeholder="Reason for bonus..."
                      value={bonusDescription}
                      onChange={(e) => setBonusDescription(e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddBonus(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddBonus} disabled={submitting}>
                    {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Add Bonus
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={showDeduct} onOpenChange={setShowDeduct}>
              <Button onClick={() => setShowDeduct(true)} variant="destructive" className="gap-2">
                <Minus className="h-4 w-4" />
                Deduct Amount
              </Button>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Deduct from Wallet</DialogTitle>
                  <DialogDescription>Deduct amount from user's wallet</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="deduct-amount">Amount (₹)</Label>
                    <Input
                      id="deduct-amount"
                      type="number"
                      placeholder="Enter amount"
                      value={deductAmount}
                      onChange={(e) => setDeductAmount(e.target.value)}
                      min="0"
                      step="1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="deduct-reason">Reason (Optional)</Label>
                    <Textarea
                      id="deduct-reason"
                      placeholder="Reason for deduction..."
                      value={deductReason}
                      onChange={(e) => setDeductReason(e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowDeduct(false)}>
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={handleDeduct} disabled={submitting}>
                    {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Deduct Amount
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Statistics */}
      {wallet.statsByType && Object.keys(wallet.statsByType).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Transaction Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Object.entries(wallet.statsByType).map(([type, stats]) => (
                <div key={type}>
                  <p className="text-sm text-muted-foreground">{getTransactionTypeLabel(type)}</p>
                  <p className="text-lg font-semibold">{stats.count}</p>
                  <p className="text-xs text-primary">{formatCurrency(stats.totalAmount)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>All wallet transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wallet.recentTransactions.map((transaction) => (
                  <TableRow key={transaction.transactionId}>
                    <TableCell className="text-sm">{formatDate(transaction.createdAt)}</TableCell>
                    <TableCell>
                      <Badge className={getTransactionTypeColor(transaction.type)}>
                        {getTransactionTypeLabel(transaction.type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{transaction.description}</TableCell>
                    <TableCell className="text-right font-medium">
                      {['top_up', 'refund', 'bonus'].includes(transaction.type) ? (
                        <span className="text-green-600">+{formatCurrency(transaction.amount)}</span>
                      ) : (
                        <span className="text-red-600">-{formatCurrency(transaction.amount)}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(transaction.balanceAfter)}</TableCell>
                    <TableCell>
                      <Badge variant={transaction.status === 'completed' ? 'default' : 'secondary'}>
                        {transaction.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {wallet.recentTransactions.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No transactions yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
