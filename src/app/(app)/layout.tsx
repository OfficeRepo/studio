'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  BotMessageSquare,
  LayoutDashboard,
} from 'lucide-react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { DataProvider } from '@/context/DataContext';
import { ThemeToggle } from '@/components/ThemeToggle';


const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();

  const menuItems = [
    {
      href: '/chat',
      label: 'DojoGPT Chat',
      icon: BotMessageSquare,
    },
    {
        href: '/kpis',
        label: 'KPI Dashboard',
        icon: LayoutDashboard,
    }
  ];

  return (
    <SidebarProvider>
      <DataProvider>
        <Sidebar collapsible="icon" className="border-r bg-card">
          <SidebarHeader className="h-16 flex items-center justify-center p-2">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-12 w-12 text-primary" asChild>
                  <Link href="/chat">
                      <Image src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRvCKHps5VfsykZJte_7fqTNw3ccC_bVn3jzA&s" width={48} height={48} alt="Medtronic Logo" className="rounded-full" />
                  </Link>
              </Button>
              <h1 className="text-lg font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
                  DojoGPT
              </h1>
            </div>
          </SidebarHeader>
          <SidebarContent className="p-2">
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith(item.href)}
                    tooltip={{ children: item.label, side: 'right' }}
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="p-2">
            <Separator className="my-2" />
            <div className="flex items-center gap-3 p-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:py-2">
              <Avatar className="h-9 w-9">
                <AvatarImage src="https://placehold.co/100x100.png" alt="@user" data-ai-hint="man" />
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
              <div className="flex flex-col group-data-[collapsible=icon]:hidden">
                <span className="text-sm font-medium">User</span>
                <span className="text-xs text-muted-foreground">user@example.com</span>
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm md:justify-end">
            <SidebarTrigger className="md:hidden" />
            <ThemeToggle />
          </header>
          <main className="flex-1 p-4 md:p-6 animate-fade-in">
              {children}
          </main>
        </SidebarInset>
      </DataProvider>
    </SidebarProvider>
  );
};

export default AppLayout;
