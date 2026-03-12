"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ShoppingBag,
  Users,
  UserPlus,
  FileText,
  Gift,
  Ticket,
  Table,
  Settings,
  // UserCog,
  Layers,
  BarChart3,
  TrendingUp,
  DollarSign,
  Package,
  Heart,
  CircleDashed,
  Wallet,
  HelpCircle,
  ImagePlay,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface NavItem {
  title: string
  href: string
  icon: React.ReactNode
  submenu?: NavItem[]
}

export default function Sidebar() {
  const pathname = usePathname()
  const [expandedItems, setExpandedItems] = useState<string[]>([])

  const navItems: NavItem[] = [
    // {
    //   title: "Dashboard",
    //   href: "/dashboard",
    //   icon: <Home className="h-5 w-5" />,
    // },
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: <BarChart3 className="h-5 w-5" />,
      submenu: [
        {
          title: "Overview",
          href: "/dashboard",
          icon: <TrendingUp className="h-4 w-4" />,
        },
        {
          title: "Orders Analytics",
          href: "/dashboard/orders-analytics",
          icon: <ShoppingBag className="h-4 w-4" />,
        },
        {
          title: "Users Analytics",
          href: "/dashboard/users-analytics",
          icon: <Users className="h-4 w-4" />,
        },
        {
          title: "Products Analytics",
          href: "/dashboard/products-analytics",
          icon: <Package className="h-4 w-4" />,
        },
        {
          title: "Revenue Analytics",
          href: "/dashboard/revenue-analytics",
          icon: <DollarSign className="h-4 w-4" />,
        },
        {
          title: "Engagement",
          href: "/dashboard/engagement",
          icon: <Heart className="h-4 w-4" />,
        },
        {
          title: "Loyalty",
          href: "/dashboard/loyalty",
          icon: <Gift className="h-4 w-4" />,
        },
        {
          title: "Advanced",
          href: "/dashboard/advanced",
          icon: <TrendingUp className="h-4 w-4" />,
        },
      ],
    },
    {
      title: "Users",
      href: "/dashboard/users",
      icon: <Users className="h-5 w-5" />,
    },
    {
      title: "Orders",
      href: "/dashboard/orders",
      icon: <ShoppingBag className="h-5 w-5" />,
    },
    {
      title: "Menu Items",
      href: "/dashboard/menu",
      icon: <FileText className="h-5 w-5" />,
    },
    {
      title: "Categories",
      href: "/dashboard/categories",
      icon: <Layers className="h-5 w-5" />,
    },
    {
      title: "Combo Offers",
      href: "/dashboard/combos",
      icon: <Gift className="h-5 w-5" />,
    },
    {
      title: "Banners",
      href: "/dashboard/banners",
      icon: <ImagePlay className="h-5 w-5" />,
    },
    {
      title: "Coupons",
      href: "/dashboard/coupons",
      icon: <Ticket className="h-5 w-5" />,
    },
    {
      title: "Spin Wheel",
      href: "/dashboard/spin-wheel",
      icon: <CircleDashed className="h-5 w-5" />,
    },
    {
      title: "Referrals",
      href: "/dashboard/referrals",
      icon: <UserPlus className="h-5 w-5" />,
    },
    {
      title: "Help & Support",
      href: "/dashboard/complaints",
      icon: <HelpCircle className="h-5 w-5" />,
    },
    {
      title: "Wallet",
      href: "/dashboard/wallet",
      icon: <Wallet className="h-5 w-5" />,
    },
    // {
    //   title: "Tables",
    //   href: "/dashboard/tables",
    //   icon: <Table className="h-5 w-5" />,
    // },
    {
      title: "Settings",
      href: "/dashboard/settings",
      icon: <Settings className="h-5 w-5" />,
    },
    // {
    //   title: "Admin Users",
    //   href: "/dashboard/admin-users",
    //   icon: <UserCog className="h-5 w-5" />,
    // },
  ]

  const toggleSubmenu = (title: string) => {
    setExpandedItems((prev) => (prev.includes(title) ? prev.filter((item) => item !== title) : [...prev, title]))
  }

  const renderNavItem = (item: NavItem) => {
    const isActive = pathname === item.href
    const hasSubmenu = item.submenu && item.submenu.length > 0
    const isExpanded = expandedItems.includes(item.title)

    return (
      <li key={item.href} className={cn("mb-1", hasSubmenu && "flex flex-col")}>
        <Button
          asChild={!hasSubmenu}
          variant="ghost"
          className={cn(
            "w-full justify-start hover:bg-muted pl-3",
            isActive && "bg-muted font-semibold",
            hasSubmenu && "flex justify-between",
          )}
          onClick={hasSubmenu ? () => toggleSubmenu(item.title) : undefined}
        >
          {hasSubmenu ? (
            <>
              <div className="flex items-center">
                {item.icon}
                <span className="ml-3">{item.title}</span>
              </div>
              <span className={cn("transition-transform", isExpanded ? "rotate-180" : "")}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 8.5L1.5 4L2.55 2.95L6 6.4L9.45 2.95L10.5 4L6 8.5Z" fill="currentColor" />
                </svg>
              </span>
            </>
          ) : (
            <Link href={item.href} className="flex items-center">
              {item.icon}
              <span className="ml-3">{item.title}</span>
            </Link>
          )}
        </Button>

        {hasSubmenu && isExpanded && (
          <ul className="pl-8 pt-1 flex flex-col space-y-1">
            {item.submenu?.map((subItem) => (
              <li key={subItem.href}>
                <Button
                  asChild
                  variant="ghost"
                  className={cn(
                    "w-full justify-start hover:bg-muted",
                    pathname === subItem.href && "bg-muted font-semibold",
                  )}
                >
                  <Link href={subItem.href} className="flex items-center">
                    {subItem.icon}
                    <span className="ml-2">{subItem.title}</span>
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </li>
    )
  }

  return (
    <div className="hidden md:flex md:w-64 md:flex-col border-r border-gray-200 h-screen bg-white">
      <div className="flex flex-col h-full px-4 py-6">
        <div className="flex items-center justify-center mb-6">
          <span className="font-bold text-xl">NextGenFix Admin</span>
        </div>
        <nav className="flex-1 overflow-y-auto scrollbar-hide">
          <ul className="space-y-1">{navItems.map(renderNavItem)}</ul>
        </nav>
        {/* <div className="pt-4 border-t">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white">A</div>
            <div className="ml-3">
              <p className="text-sm font-medium">Admin User</p>
              <p className="text-xs text-muted-foreground">admin@naanly.com</p>
            </div>
          </div>
        </div> */}
      </div>
    </div>
  )
}

