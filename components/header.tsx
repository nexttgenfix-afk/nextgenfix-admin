"use client"

import { BellIcon, MenuIcon, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { setAuthToken } from "@/lib/api"
import api from "@/lib/api"
import { sendNotification, sendTopicNotification } from "@/lib/api/notifications"
import { useToast } from "@/hooks/use-toast"

export default function Header() {
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [notifDialogOpen, setNotifDialogOpen] = useState(false)
  const [notifTab, setNotifTab] = useState("user")
  const [notifUserId, setNotifUserId] = useState("")
  const [notifTopic, setNotifTopic] = useState("")
  const [notifTitle, setNotifTitle] = useState("")
  const [notifBody, setNotifBody] = useState("")
  const [notifSending, setNotifSending] = useState(false)

  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await api.post("/admin/auth/logout");
    } catch (e) {
      // ignore error, just clear token
      console.error(e);
    }
    setAuthToken();
    router.replace("/login");
  };

  const resetNotifForm = () => {
    setNotifUserId("")
    setNotifTopic("")
    setNotifTitle("")
    setNotifBody("")
  }

  const handleSendNotification = async () => {
    if (!notifTitle.trim() || !notifBody.trim()) {
      toast({ title: "Validation Error", description: "Title and body are required." })
      return
    }

    setNotifSending(true)
    try {
      if (notifTab === "user") {
        if (!notifUserId.trim()) {
          toast({ title: "Validation Error", description: "User ID is required." })
          setNotifSending(false)
          return
        }
        await sendNotification({ userId: notifUserId.trim(), title: notifTitle.trim(), body: notifBody.trim() })
        toast({ title: "Notification Sent", description: "Notification sent to user successfully." })
      } else {
        if (!notifTopic.trim()) {
          toast({ title: "Validation Error", description: "Topic is required." })
          setNotifSending(false)
          return
        }
        await sendTopicNotification({ topic: notifTopic.trim(), title: notifTitle.trim(), body: notifBody.trim() })
        toast({ title: "Notification Sent", description: "Topic notification sent successfully." })
      }
      resetNotifForm()
      setNotifDialogOpen(false)
    } catch (err) {
      const message = err && typeof err === "object" && "response" in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message || "Failed to send notification."
        : "Failed to send notification."
      toast({ title: "Error", description: message })
    } finally {
      setNotifSending(false)
    }
  }

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 sm:px-6">
        <Button variant="outline" size="icon" className="md:hidden" onClick={() => setShowMobileMenu(!showMobileMenu)}>
          <MenuIcon className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
        <div className="flex-1">
        </div>
        <div className="items-center gap-2 flex">
          <Button
            variant="outline"
            size="icon"
            className="relative"
            onClick={() => {
              resetNotifForm()
              setNotifDialogOpen(true)
            }}
          >
            <BellIcon className="h-5 w-5" />
            <span className="sr-only">Send Notification</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="relative">
                <span className="flex items-center">
                  <span className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white mr-2">
                    A
                  </span>
                  <span className="hidden md:inline-flex">Admin</span>
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleLogout}>Log out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <Dialog open={notifDialogOpen} onOpenChange={setNotifDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Send Notification</DialogTitle>
            <DialogDescription>Send a push notification to a user or topic.</DialogDescription>
          </DialogHeader>
          <Tabs value={notifTab} onValueChange={setNotifTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="user">To User</TabsTrigger>
              <TabsTrigger value="topic">To Topic</TabsTrigger>
            </TabsList>
            <TabsContent value="user" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="notif-userId">User ID</Label>
                <Input
                  id="notif-userId"
                  placeholder="Enter user MongoDB ID"
                  value={notifUserId}
                  onChange={(e) => setNotifUserId(e.target.value)}
                />
              </div>
            </TabsContent>
            <TabsContent value="topic" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="notif-topic">Topic</Label>
                <Input
                  id="notif-topic"
                  placeholder="e.g., promotions, new-items"
                  value={notifTopic}
                  onChange={(e) => setNotifTopic(e.target.value)}
                />
              </div>
            </TabsContent>
          </Tabs>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notif-title">Title</Label>
              <Input
                id="notif-title"
                placeholder="Notification title"
                value={notifTitle}
                onChange={(e) => setNotifTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notif-body">Body</Label>
              <Textarea
                id="notif-body"
                placeholder="Notification message"
                value={notifBody}
                onChange={(e) => setNotifBody(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotifDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSendNotification} disabled={notifSending}>
              <Send className="h-4 w-4 mr-2" />
              {notifSending ? "Sending..." : "Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
