"use client";
import { usePathname } from "next/navigation";
import { Breadcrumb, BreadcrumbList } from "../ui/breadcrumb";
import { BreadcrumbItem } from "../ui/breadcrumb";
import { BreadcrumbLink } from "../ui/breadcrumb";
import { BreadcrumbSeparator } from "../ui/breadcrumb";
import { BreadcrumbPage } from "../ui/breadcrumb";
import { Separator } from "../ui/separator";
import { SidebarTrigger } from "../ui/sidebar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useState } from "react";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Copy, Link } from "lucide-react";

const Header = () => {
  const pathname = usePathname();
  const breadcrumbItems = pathname.split("/").filter((item) => item !== "");
  //console.log(breadcrumbItems);
  const surveyId = breadcrumbItems.length > 1 ? breadcrumbItems[1] : null;
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: surveyData, isLoading: isSurveyLoading } = useQuery({
    queryKey: ["survey", surveyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("surveys")
        .select("*")
        .eq("id", surveyId)
        .single();
      return data;
    },
    enabled: !!surveyId,
  });

  const currentLink = typeof window !== "undefined" ? window.location.href : "";

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(currentLink);
      alert("Link copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy link:", err);
      alert("Failed to copy link");
    }
  };

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 justify-between">
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>{breadcrumbItems[0]}</BreadcrumbPage>
            </BreadcrumbItem>
            {surveyId && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Survey {surveyId}</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      {surveyId && (
        <div className="flex items-center gap-2 px-4">
          <p className="text-sm text-muted-foreground">
            {surveyData?.routeName}
          </p>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <Link className="h-4 w-4 mr-1" />
                Share Link
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Share Survey Link</DialogTitle>
              </DialogHeader>
              <div className="flex items-center gap-2">
                <Input
                  value={currentLink}
                  readOnly
                  className="flex-1"
                  placeholder="Loading link..."
                />
                <Button onClick={handleCopyLink} size="sm">
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </header>
  );
};

export default Header;
