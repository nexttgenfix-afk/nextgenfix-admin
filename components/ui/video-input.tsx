'use client'

import { useState, useRef } from 'react'
import { Upload, Trash2, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

interface VideoInputProps {
  onVideoSelect?: (file: File) => void
  existingVideoUrl?: string
  onRemove?: () => void
  maxSizeMB?: number
  disabled?: boolean
}

export function VideoInput({
  onVideoSelect,
  existingVideoUrl,
  onRemove,
  maxSizeMB = 50,
  disabled = false
}: VideoInputProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string>('')
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const ACCEPTED_FORMATS = ['video/mp4', 'video/webm', 'video/ogg']
  const MAX_SIZE_BYTES = maxSizeMB * 1024 * 1024

  const validateFile = (file: File): boolean => {
    if (!ACCEPTED_FORMATS.includes(file.type)) {
      setError('Please upload a valid video format (MP4, WebM, or OGG)')
      toast({
        title: 'Invalid Format',
        description: 'Please upload a valid video format (MP4, WebM, or OGG)',
        variant: 'destructive'
      })
      return false
    }

    if (file.size > MAX_SIZE_BYTES) {
      setError(`File size must be less than ${maxSizeMB}MB`)
      toast({
        title: 'File Too Large',
        description: `File size must be less than ${maxSizeMB}MB`,
        variant: 'destructive'
      })
      return false
    }

    return true
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (validateFile(file)) {
      setSelectedFile(file)
      setError('')

      // Create preview URL
      const url = URL.createObjectURL(file)
      setPreview(url)

      onVideoSelect?.(file)

      toast({
        title: 'Success',
        description: 'Video selected successfully'
      })
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files?.[0]
    if (!file) return

    if (validateFile(file)) {
      setSelectedFile(file)
      setError('')

      const url = URL.createObjectURL(file)
      setPreview(url)

      onVideoSelect?.(file)

      toast({
        title: 'Success',
        description: 'Video selected successfully'
      })
    }
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    setPreview('')
    setError('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onRemove?.()

    toast({
      title: 'Removed',
      description: 'Video removed'
    })
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={() => !disabled && fileInputRef.current?.click()}
        >
          <Input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileChange}
            className="hidden"
            disabled={disabled}
          />

          <div className="flex flex-col items-center gap-2">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Drag and drop your video here</p>
              <p className="text-xs text-muted-foreground">
                or click to select (max {maxSizeMB}MB, MP4/WebM/OGG)
              </p>
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      {/* Show selected file preview */}
      {(selectedFile || preview) && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Selected Video:</p>
          <div className="bg-muted rounded-lg overflow-hidden">
            <video
              src={preview}
              controls
              className="w-full max-h-64"
            />
            <div className="p-3 border-t bg-background">
              <div className="flex items-center justify-between">
                <p className="text-sm truncate">{selectedFile?.name || 'Video file'}</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveFile}
                  disabled={disabled}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Show existing video */}
      {existingVideoUrl && !selectedFile && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Current Video:</p>
          <div className="bg-muted rounded-lg overflow-hidden">
            <video
              src={existingVideoUrl}
              controls
              className="w-full max-h-64"
            />
            <div className="p-3 border-t bg-background">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleRemoveFile}
                disabled={disabled}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remove Current Video
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
