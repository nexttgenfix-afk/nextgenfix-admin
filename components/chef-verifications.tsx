"use client";
"use client";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle, XCircle} from "lucide-react";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useRouter } from "next/navigation";

export interface ChefVerificationDoc {
  fssai: boolean;
  gst: boolean;
  pan: boolean;
  bankDetails: boolean;
}

export interface ChefVerification {
  id: string;
  name: string;
  kitchenName?: string;
  documents: ChefVerificationDoc;
  status: "pending" | "approved" | "rejected";
  joinedOn: string;
}

export function ChefVerifications() {
  const [verifications, setVerifications] = useState<ChefVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    setLoading(true);
    setError(null);
    const fetchVerifications = async () => {
      try {
        const res = await api.get('/admin/chef-verifications');
        setVerifications(res.data.chefs || []);
      } catch (err) {
        let message = "Failed to load chef verifications.";
        if (err && typeof err === "object") {
          if (err instanceof Error) message = err.message;
          else if (typeof (err as { message?: unknown }).message === "string") message = (err as { message: string }).message;
        }
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    fetchVerifications();
  }, []);

  const handleAction = async (id: string, action: "approve" | "reject") => {
    setActionLoading(id + action);
    try {
      await api.put(`/admin/chef-verifications/${id}/${action}`);
      setVerifications(vs => vs.map(v => v.id === id ? { ...v, status: action === "approve" ? "approved" : "rejected" } : v));
    } catch (err) {
      let message = `Failed to ${action} chef.`;
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
      {!loading && !error && verifications.length === 0 && <div>No pending verifications found.</div>}
      {!loading && !error && verifications.slice(0, 3).map((chef) => (
        <div key={chef.id} className="flex flex-col border-b pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="font-medium">{chef.name ? chef.name : "Unknown Chef"}</div>
              {chef.kitchenName && <div className="text-sm text-muted-foreground">{chef.kitchenName}</div>}
              <div className="text-xs text-muted-foreground">Joined: {new Date(chef.joinedOn).toLocaleString()}</div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                onClick={() => handleAction(chef.id, "approve")}
                disabled={chef.status !== "pending" || actionLoading === chef.id + "approve"}
              >
                Approve
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                onClick={() => handleAction(chef.id, "reject")}
                disabled={chef.status !== "pending" || actionLoading === chef.id + "reject"}
              >
                Reject
              </Button>
            </div>
          </div>
          <div className="mt-2 flex gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={`rounded-full p-1 ${chef.documents?.fssai ? "bg-green-100" : "bg-red-100"}`}>
                    {chef.documents?.fssai ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>FSSAI License</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={`rounded-full p-1 ${chef.documents?.gst ? "bg-green-100" : "bg-red-100"}`}>
                    {chef.documents?.gst ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>GST Number</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={`rounded-full p-1 ${chef.documents?.pan ? "bg-green-100" : "bg-red-100"}`}>
                    {chef.documents?.pan ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>PAN Card</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={`rounded-full p-1 ${chef.documents?.bankDetails ? "bg-green-100" : "bg-red-100"}`}>
                    {chef.documents?.bankDetails ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Bank Details</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          {/* Approve/Reject buttons moved above */}
        </div>
      ))}
      <Button 
      variant="outline" 
      className="w-full"
      onClick={() => {
          try {
            router.push("/dashboard/chefs/verification");
          } catch (err) {
            alert("Failed to redirect to orders page.");
            console.log(err);
          }
        }}
      >
        View All Verifications
      </Button>
    </div>
  )
}


