"use client"

import Link from "next/link"
import { type Icon } from "@tabler/icons-react"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

interface NavItem {
  title: string
  url: string
  icon?: Icon
  badge?: string
}

interface NavSection {
  label?: string
  items: NavItem[]
}

export function NavMain({
  sections,
}: {
  sections: NavSection[]
}) {
  return (
    <>
      {sections.map((section, index) => (
        <SidebarGroup key={section.label || index}>
          {section.label && (
            <SidebarGroupLabel className="text-xs text-muted-foreground uppercase tracking-wider px-2 mb-1">
              {section.label}
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent className="flex flex-col">
            <SidebarMenu className="flex flex-col gap-0">
              {section.items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton tooltip={item.title} asChild>
                    <Link href={item.url} className="flex items-center justify-between w-full">
                      <span className="flex items-center gap-2">
                        {item.icon && <item.icon className="h-4 w-4" />}
                        <span>{item.title}</span>
                      </span>
                      {item.badge && (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-white">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  )
}
