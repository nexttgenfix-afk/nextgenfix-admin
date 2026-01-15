"use client";

import { useState, useEffect } from "react";
import { 
  Search, 
  Download, 
  RefreshCw, 
  UserPlus,
  ArrowUpDown,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import StatusBadge from "@/components/status-badge";
import { useToast } from "@/hooks/use-toast";
import * as couponsApi from "@/lib/api/coupons";
import { format } from "date-fns";

interface ReferralRelationship {
  referrerName: string;
  referrerEmail: string;
  referrerCode: string;
  referredUserName: string;
  referredUserEmail: string;
  referredUserPhone: string;
  dateReferred: string;
  rewardClaimed: boolean;
  rewardDetails: string;
}

export default function ReferralsPage() {
  const [loading, setLoading] = useState(true);
  const [referrals, setReferrals] = useState<ReferralRelationship[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    const fetchReferralAudit = async () => {
      setLoading(true);
      try {
        const data = await couponsApi.getReferralAudit();
        
        // Flatten the data: one row per referral relationship
        const flattenedReferrals: ReferralRelationship[] = [];
        
        data.referrers.forEach((referrer: any) => {
          referrer.referrals.forEach((referral: any) => {
            // Find reward details if any
            let rewardDetails = "No coupon issued";
            if (referrer.referralCoupons && referrer.referralCoupons.length > 0) {
              // Try to find if this specific referral triggered a specific coupon 
              // (backend doesn't link them specifically, but we can show all coupons for this referrer)
              // For simplicity, we just list the codes and types
              rewardDetails = data.coupons
                .filter((c: any) => referrer.referralCoupons.includes(c._id))
                .map((c: any) => `${c.code} (${c.discountValue}${c.discountType === 'percentage' ? '%' : '₹'})`)
                .join(", ");
            }

            flattenedReferrals.push({
              referrerName: referrer.name || "N/A",
              referrerEmail: referrer.email || "N/A",
              referrerCode: referrer.referralCode || "N/A",
              referredUserName: referral.user?.name || "N/A",
              referredUserEmail: referral.user?.email || "N/A",
              referredUserPhone: referral.user?.phone || "N/A",
              dateReferred: referral.dateReferred,
              rewardClaimed: referral.rewardClaimed,
              rewardDetails: rewardDetails
            });
          });
        });

        setReferrals(flattenedReferrals);
      } catch (err) {
        console.error("Error fetching referrals:", err);
        toast({
          title: "Error",
          description: "Failed to fetch referral data. Please try again.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchReferralAudit();
  }, [refreshKey, toast]);

  const filteredReferrals = referrals.filter(r => 
    r.referrerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.referrerCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.referredUserName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.referredUserEmail.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleExportCSV = () => {
    if (filteredReferrals.length === 0) return;

    const headers = ["Referrer Name", "Referrer Code", "Referred User", "Referred Email", "Date", "Reward Claimed", "Reward Details"];
    const csvContent = [
      headers.join(","),
      ...filteredReferrals.map(r => [
        `"${r.referrerName}"`,
        `"${r.referrerCode}"`,
        `"${r.referredUserName}"`,
        `"${r.referredUserEmail}"`,
        `"${format(new Date(r.dateReferred), 'yyyy-MM-dd HH:mm')}"`,
        r.rewardClaimed ? "Yes" : "No",
        `"${r.rewardDetails}"`
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `referrals_export_${format(new Date(), 'yyyyMMdd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Success",
      description: "Referral data exported successfully."
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Referral Audit</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setRefreshKey(prev => prev + 1)}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={filteredReferrals.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by referrer or referred user..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Referrer</TableHead>
              <TableHead>Referral Code</TableHead>
              <TableHead>Referred User</TableHead>
              <TableHead>Date Referred</TableHead>
              <TableHead>Reward Status</TableHead>
              <TableHead>Reward Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  Loading referrals...
                </TableCell>
              </TableRow>
            ) : filteredReferrals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No referrals found.
                </TableCell>
              </TableRow>
            ) : (
              filteredReferrals.map((referral, index) => (
                <TableRow key={`${referral.referrerCode}-${index}`}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{referral.referrerName}</span>
                      <span className="text-xs text-muted-foreground">{referral.referrerEmail}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">
                      {referral.referrerCode}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{referral.referredUserName}</span>
                      <span className="text-xs text-muted-foreground">{referral.referredUserEmail}</span>
                      <span className="text-xs text-muted-foreground">{referral.referredUserPhone}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {referral.dateReferred ? format(new Date(referral.dateReferred), 'MMM dd, yyyy HH:mm') : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={referral.rewardClaimed ? "Claimed" : "Pending"} />
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate" title={referral.rewardDetails}>
                    {referral.rewardDetails}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
