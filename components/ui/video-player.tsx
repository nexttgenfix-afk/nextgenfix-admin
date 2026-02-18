'use client'

interface VideoPlayerProps {
  src: string
  poster?: string
  title?: string
  autoplay?: boolean
  controls?: boolean
  className?: string
}

export function VideoPlayer({
  src,
  poster,
  title,
  autoplay = false,
  controls = true,
  className = ''
}: VideoPlayerProps) {
  if (!src) {
    return (
      <div className={`bg-muted rounded-lg flex items-center justify-center ${className}`}>
        <p className="text-muted-foreground">No video available</p>
      </div>
    )
  }

  return (
    <div className={`bg-black rounded-lg overflow-hidden ${className}`}>
      <video
        src={src}
        poster={poster}
        title={title}
        autoPlay={autoplay}
        controls={controls}
        className="w-full h-full"
      />
    </div>
  )
}
