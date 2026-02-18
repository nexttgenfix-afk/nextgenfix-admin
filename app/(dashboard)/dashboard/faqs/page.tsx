'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Plus, Edit, Trash2, Eye, ThumbsUp } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import * as faqApi from '@/lib/api/faqs'

interface FAQForm {
  question: string
  answer: string
  category: string
  tags: string
}

export default function FAQsPage() {
  const [faqs, setFaqs] = useState<faqApi.FAQ[]>([])
  const [stats, setStats] = useState<faqApi.FAQStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [category, setCategory] = useState<string>('all')
  const [form, setForm] = useState<FAQForm>({
    question: '',
    answer: '',
    category: 'general',
    tags: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadFAQs()
    loadStats()
  }, [category])

  const loadFAQs = async () => {
    try {
      setLoading(true)
      const response = await faqApi.getAllFAQsAdmin({
        category: category !== 'all' ? category : undefined,
        limit: 50,
      })
      setFaqs(response.data)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load FAQs',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const data = await faqApi.getFAQStats()
      setStats(data)
    } catch (error) {
      console.error('Failed to load FAQ stats:', error)
    }
  }

  const handleSave = async () => {
    if (!form.question.trim() || !form.answer.trim() || !form.category) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      })
      return
    }

    if (form.question.length < 10) {
      toast({
        title: 'Validation Error',
        description: 'Question must be at least 10 characters',
        variant: 'destructive',
      })
      return
    }

    if (form.answer.length < 20) {
      toast({
        title: 'Validation Error',
        description: 'Answer must be at least 20 characters',
        variant: 'destructive',
      })
      return
    }

    try {
      setSubmitting(true)

      const data = {
        question: form.question,
        answer: form.answer,
        category: form.category,
        tags: form.tags.split(',').filter((t) => t.trim()),
      }

      if (editingId) {
        await faqApi.updateFAQ(editingId, data)
        toast({
          title: 'Success',
          description: 'FAQ updated successfully',
        })
      } else {
        await faqApi.createFAQ(data)
        toast({
          title: 'Success',
          description: 'FAQ created successfully',
        })
      }

      setShowDialog(false)
      setForm({ question: '', answer: '', category: 'general', tags: '' })
      setEditingId(null)
      loadFAQs()
      loadStats()
    } catch (error) {
      toast({
        title: 'Error',
        description: editingId ? 'Failed to update FAQ' : 'Failed to create FAQ',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (faq: faqApi.FAQ) => {
    setForm({
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
      tags: faq.tags.join(', '),
    })
    setEditingId(faq._id || '')
    setShowDialog(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this FAQ?')) {
      try {
        await faqApi.deleteFAQ(id)
        toast({
          title: 'Success',
          description: 'FAQ deleted successfully',
        })
        loadFAQs()
        loadStats()
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to delete FAQ',
          variant: 'destructive',
        })
      }
    }
  }

  const getCategoryColor = (cat: string) => {
    const colors: { [key: string]: string } = {
      ordering: 'bg-blue-100 text-blue-800',
      payment: 'bg-green-100 text-green-800',
      delivery: 'bg-orange-100 text-orange-800',
      account: 'bg-purple-100 text-purple-800',
      menu: 'bg-pink-100 text-pink-800',
      general: 'bg-gray-100 text-gray-800',
    }
    return colors[cat] || colors.general
  }

  if (loading && faqs.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">FAQs Management</h1>
          <p className="text-muted-foreground mt-1">Create and manage frequently asked questions</p>
        </div>
        <Button onClick={() => {
          setForm({ question: '', answer: '', category: 'general', tags: '' })
          setEditingId(null)
          setShowDialog(true)
        }} className="gap-2">
          <Plus className="h-4 w-4" />
          Add FAQ
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total FAQs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalFAQs}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active FAQs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeFAQs}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.engagement.totalViews}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Helpful Ratings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.engagement.totalHelpful}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Category Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full md:w-64">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="ordering">Ordering</SelectItem>
              <SelectItem value="payment">Payment</SelectItem>
              <SelectItem value="delivery">Delivery</SelectItem>
              <SelectItem value="account">Account</SelectItem>
              <SelectItem value="menu">Menu</SelectItem>
              <SelectItem value="general">General</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* FAQs Table */}
      <Card>
        <CardHeader>
          <CardTitle>FAQs List</CardTitle>
          <CardDescription>{faqs.length} FAQs found</CardDescription>
        </CardHeader>
        <CardContent>
          {faqs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No FAQs found. Create one to get started!</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Question</TableHead>
                    <TableHead className="w-24">Category</TableHead>
                    <TableHead className="w-20 text-right">Views</TableHead>
                    <TableHead className="w-20 text-right">Helpful</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {faqs.map((faq) => (
                    <TableRow key={faq._id}>
                      <TableCell className="font-medium">
                        <div className="max-w-md">
                          <p className="truncate">{faq.question}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getCategoryColor(faq.category)}>
                          {faq.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Eye className="h-4 w-4 text-muted-foreground" />
                          {faq.views}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <ThumbsUp className="h-4 w-4 text-green-600" />
                          {faq.helpful}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(faq)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(faq._id || '')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit FAQ' : 'Create New FAQ'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Update the FAQ details' : 'Add a new frequently asked question'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="question">Question *</Label>
              <Input
                id="question"
                placeholder="Enter the question..."
                value={form.question}
                onChange={(e) => setForm({ ...form, question: e.target.value })}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {form.question.length}/200 characters
              </p>
            </div>

            <div>
              <Label htmlFor="answer">Answer *</Label>
              <Textarea
                id="answer"
                placeholder="Enter the answer..."
                value={form.answer}
                onChange={(e) => setForm({ ...form, answer: e.target.value })}
                rows={5}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {form.answer.length}/1000 characters
              </p>
            </div>

            <div>
              <Label htmlFor="category">Category *</Label>
              <Select value={form.category} onValueChange={(value) => setForm({ ...form, category: value })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ordering">Ordering</SelectItem>
                  <SelectItem value="payment">Payment</SelectItem>
                  <SelectItem value="delivery">Delivery</SelectItem>
                  <SelectItem value="account">Account</SelectItem>
                  <SelectItem value="menu">Menu</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                placeholder="e.g., beginner, quick, important"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editingId ? 'Update FAQ' : 'Create FAQ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
