"use client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, Check, X, ExternalLink } from "lucide-react";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import api from "@/lib/api";

export interface Review {
  id: string;
  user: { name: string; id: string };
  chef: { name: string; id: string };
  rating: number;
  comment: string;
  createdAt: string;
  // Optionally: dishName?: string;
}

const renderStars = (rating: number) => {
  const stars = []
  const fullStars = Math.floor(rating)
  const halfStar = rating % 1 >= 0.5

  for (let i = 0; i < fullStars; i++) {
    stars.push(<Star key={`full-${i}`} className="h-3 w-3 fill-yellow-400 text-yellow-400" />)
  }

  if (halfStar) {
    stars.push(
      <div key="half" className="relative">
        <Star className="h-3 w-3 text-yellow-400" />
        <div className="absolute top-0 left-0 w-[50%] overflow-hidden">
          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
        </div>
      </div>,
    )
  }

  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0)
  for (let i = 0; i < emptyStars; i++) {
    stars.push(<Star key={`empty-${i}`} className="h-3 w-3 text-yellow-400" />)
  }

  return stars
}

export function RecentReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const router = useRouter();
  useEffect(() => {
    setLoading(true);
    setError(null);
    const fetchReviews = async () => {
      try {
        const res = await api.get('/admin/reviews-pending');
        setReviews(res.data.reviews || []);
      } catch (err) {
        let message = "Failed to load reviews.";
        if (err && typeof err === "object") {
          if (err instanceof Error) message = err.message;
          else if (typeof (err as { message?: unknown }).message === "string") message = (err as { message: string }).message;
        }
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    fetchReviews();
  }, []);

  const handleAction = async (id: string, action: "approve" | "reject") => {
    setActionLoading(id + action);
    try {
      await api.post(`/admin/reviews/${id}/${action}`);
      setReviews(rs => rs.filter(r => r.id !== id));
    } catch (err) {
      let message = `Failed to ${action} review.`;
      if (err && typeof err === "object") {
        if (err instanceof Error) message = err.message;
        else if (typeof (err as { message?: unknown }).message === "string") message = (err as { message: string }).message;
      }
      setError(message);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-500 text-sm">{error}</div>}
      {!loading && !error && reviews.length === 0 && <div>No reviews pending moderation.</div>}
      {!loading && !error && reviews.map((review) => (
        <div key={review.id} className="border-b pb-4">
          <div className="flex justify-between items-start">
            <div className="flex items-start gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={`/placeholder.svg?height=32&width=32`} alt={review.user.name} />
                <AvatarFallback>{review.user.name?.[0] ?? "U"}</AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{review.user.name}</span>
                  <div className="flex">{renderStars(review.rating)}</div>
                </div>
                <p className="text-xs text-muted-foreground">
                  By {review.chef.name}
                </p>
                <p className="text-sm">{review.comment}</p>
                <p className="text-xs text-muted-foreground">{new Date(review.createdAt).toLocaleString()}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-2 flex gap-2 justify-end">
            <Button
              size="sm"
              variant="outline"
              className="h-7 bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
              onClick={() => handleAction(review.id, "approve")}
              disabled={actionLoading === review.id + "approve"}
            >
              <Check className="mr-1 h-4 w-4" /> Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
              onClick={() => handleAction(review.id, "reject")}
              disabled={actionLoading === review.id + "reject"}
            >
              <X className="mr-1 h-4 w-4" /> Reject
            </Button>
          </div>
        </div>
      ))}
      <Button variant="outline" className="w-full" onClick={() => router.push("/dashboard/reviews")}>
        View All Reviews
      </Button>
    </div>
  );
}


