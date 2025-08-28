import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ArrowRightIcon,
  DownloadIcon,
  Loader2,
  MoreHorizontalIcon,
  PencilIcon,
} from "lucide-react";
import { Button } from "../ui/button";
import { supabase } from "@/lib/supabase";
import Papa from "papaparse";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { useState } from "react";

const RowAction = ({
  gpsTrackId,
  surveyId,
  routeName,
  role,
}: {
  gpsTrackId: string;
  surveyId: string;
  routeName: string;
  role: string;
}) => {
  const [newRouteName, setNewRouteName] = useState(routeName);
  const queryClient = useQueryClient();
  const handleDownloadGeoJSON = async (gpsTrackId: string) => {
    try {
      const { data, error } = await supabase
        .from("gps_tracks")
        .select("location_data, name")
        .eq("id", gpsTrackId)
        .single();
      if (error) {
        console.error("Error downloading GPS data as CSV:", error);
        //toast.error("Failed to download location data");
        return;
      }
      const csv = Papa.unparse(data.location_data);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${data.name}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      //  toast.success(`${data.name} downloaded successfully`);
    } catch (error) {
      console.error("Error downloading GPS data as CSV:", error);
      //toast.error("Failed to download location data");
    }
  };

  const { mutate: downloadSurvey, isPending: isDownloading } = useMutation({
    mutationKey: ["download-survey"],
    mutationFn: async (gpsTrackId: string) => {
      await handleDownloadGeoJSON(gpsTrackId);
      return true;
    },
    onSuccess: () => {
      toast.success("Survey downloaded successfully");
    },
    onError: () => {
      toast.error("Failed to download survey");
    },
  });

  const { mutate: editRouteName, isPending: isEditing } = useMutation({
    mutationKey: ["edit-route-name"],
    mutationFn: async () => {
      const { error } = await supabase
        .from("surveys")
        .update({ name: newRouteName.trim() })
        .eq("id", surveyId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["videos"] });
      toast.success("Route name updated successfully");
    },
    onError: () => {
      toast.error("Failed to update route name");
    },
  });

  return (
    <Popover>
      <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontalIcon className="w-4 h-4 transition-colors group-hover:text-accent-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="flex flex-col gap-1 p-2 w-56 rounded-xl shadow-lg"
      >
        <Button
          variant="ghost"
          className="group w-full justify-between px-3 py-2 rounded-lg transition-all 
                       hover:bg-accent hover:text-accent-foreground"
          onClick={() => downloadSurvey(gpsTrackId)}
        >
          <span className="flex items-center">
            {isDownloading ? (
              <Loader2 className="w-4 h-4 mr-2 transition-colors group-hover:text-accent-foreground animate-spin" />
            ) : (
              <DownloadIcon className="w-4 h-4 mr-2 transition-colors group-hover:text-accent-foreground" />
            )}
            {isDownloading ? "Downloading..." : "Download GPS Track"}
          </span>
          <ArrowRightIcon className="w-4 h-4 opacity-70 transition-all group-hover:translate-x-1 group-hover:text-accent-foreground" />
        </Button>

        <Dialog>
          <DialogTrigger
            asChild
            disabled={(role !== "admin" && role !== "manager") || isEditing}
          >
            <Button
              variant="ghost"
              className="group w-full justify-between px-3 py-2 rounded-lg transition-all 
                       hover:bg-accent hover:text-accent-foreground"
            >
              <span className="flex items-center">
                <PencilIcon className="w-4 h-4 mr-2 transition-colors group-hover:text-accent-foreground" />
                Edit Route Name
              </span>
              <ArrowRightIcon className="w-4 h-4 opacity-70 transition-all group-hover:translate-x-1 group-hover:text-accent-foreground" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Route Name</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="route-name">Route Name</Label>
                <Input
                  id="route-name"
                  value={newRouteName}
                  onChange={(e) => setNewRouteName(e.target.value)}
                  placeholder="Enter new route name"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline">Cancel</Button>
              <Button onClick={() => editRouteName()}>
                {isEditing ? <Loader2 size={16} /> : "Update Route Name"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PopoverContent>
    </Popover>
  );
};

export default RowAction;
