"use client"
import SidePanel from '@/app/side-panel/SidePanel'
import { Editor } from '@/app/editor-panel/editor'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function Home() {
  return (
    <div className="h-screen overflow-hidden p-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-10 h-[calc(100vh-3rem)]">
        <div className="md:col-span-7 h-full min-h-0">
          <Editor />
        </div>
        <div className="md:col-span-3 h-full min-h-0"> 
          <SidePanel />
        </div>
      </div>
    </div>
  )
}
