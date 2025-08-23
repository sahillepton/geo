//@ts-nocheck
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Check, Copy, Link, Loader2 } from "lucide-react";
import { User } from "@/lib/types";
import { verifyVideo } from "./action";
import { toast } from "sonner";

const Header = ({ user }: { user: User }) => {
  const pathname = usePathname();
  const breadcrumbItems = pathname.split("/").filter((item) => item !== "");
  //console.log(breadcrumbItems);
  const surveyId = breadcrumbItems.length > 1 ? breadcrumbItems[1] : null;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const { data: surveyData, isLoading: isSurveyLoading } = useQuery({
    queryKey: ["survey", surveyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("surveys")
        .select("video_id, videos(verified_by))")
        .eq("id", surveyId)
        .single();
      return data;
    },
    enabled: !!surveyId,
  });

  //console.log(surveyData, "survey data in header ");

  const isVideoVerified = surveyData?.videos[0]?.verified_by;

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

            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Survey {surveyId}</BreadcrumbPage>
            </BreadcrumbItem>
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
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                disabled={isSurveyLoading || !surveyData?.video_id}
              >
                <Link className="h-4 w-4 mr-1" />
                Share Link
              </Button>
            </DialogTrigger>
            <DialogContent className="z-9999">
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
          {(user.role === "admin" || user.role === "manager") && (
            <Dialog>
              <DialogTrigger asChild disabled={isVideoVerified}>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 bg-[#baf3db] hover:bg-[#baf3db] text-[#2196ae] hover:text-[#2196ae]"
                  disabled={
                    isSurveyLoading || !surveyData?.video_id || isVideoVerified
                  }
                >
                  {isVideoVerified ? (
                    <Check className="h-4 w-4 mr-1" />
                  ) : (
                    <Link className="h-4 w-4 mr-1" />
                  )}
                  {isVideoVerified ? "Verified" : "Verify Video"}
                </Button>
              </DialogTrigger>
              <DialogContent className="z-9999">
                <DialogHeader>
                  <DialogTitle>Are you absolutely sure?</DialogTitle>
                  <DialogDescription>
                    This action cannot be undone. This will permanently mark the
                    video as verified
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    disabled={isVerifying}
                    onClick={async () => {
                      setIsVerifying(true);
                      try {
                        await verifyVideo(surveyData?.video_id, user.user_id);
                        toast.success("Video verified successfully");
                      } catch {
                        toast.error("Failed to verify video");
                      } finally {
                        setIsVerifying(false);
                        setIsDialogOpen(false);
                      }
                    }}
                  >
                    {isVerifying ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      "Verify"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      )}
    </header>
  );
};

export default Header;
