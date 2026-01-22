"use client"

import * as React from "react"
import {
  IconLayoutDashboard,
  IconUpload,
  IconLeaf,
  IconChartBar,
  IconPlant,
  IconHistory,
  IconTarget,
  IconTrophy,
  IconBulb,
  IconSettings,
  IconFileAnalytics,
} from "@tabler/icons-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const navSections = [
  {
    label: "Main",
    items: [
      {
        title: "Dashboard",
        url: "/Dashboard",
        icon: IconLayoutDashboard,
      },
      {
        title: "Upload Bill",
        url: "/Dashboard/upload",
        icon: IconUpload,
      },
      {
        title: "Carbon Score",
        url: "/Dashboard/score",
        icon: IconLeaf,
      },
    ],
  },
  {
    label: "Analytics",
    items: [
      {
        title: "Breakdown",
        url: "/Dashboard/breakdown",
        icon: IconChartBar,
      },
      {
        title: "Impact",
        url: "/Dashboard/impact",
        icon: IconPlant,
      },
      {
        title: "History",
        url: "/Dashboard/history",
        icon: IconHistory,
      },
      {
        title: "Full Report",
        url: "/Dashboard/report",
        icon: IconFileAnalytics,
      },
    ],
  },
  {
    label: "Goals",
    items: [
      {
        title: "Carbon Budget",
        url: "/Dashboard/budget",
        icon: IconTarget,
      },
      {
        title: "Challenges",
        url: "/Dashboard/challenges",
        icon: IconTrophy,
      },
      {
        title: "Eco Tips",
        url: "/Dashboard/tips",
        icon: IconBulb,
      },
    ],
  },
  {
    label: "Settings",
    items: [
      {
        title: "Settings",
        url: "/Dashboard/settings",
        icon: IconSettings,
      },
    ],
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const userData = {
    name: 'User',
    email: 'user@example.com',
    avatar: '',
  }

  return (
    <Sidebar collapsible="none" className="bg-sidebar border-r border-sidebar-border" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="/Dashboard">
                <IconLeaf className="!size-5 text-green-500" />
                <span className="text-base font-semibold">CarbonTrack</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain sections={navSections} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
    </Sidebar>
  )
}
