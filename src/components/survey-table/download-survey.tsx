import { supabase } from "@/lib/supabase";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import Papa from "papaparse";
import { DownloadIcon, Loader2 } from "lucide-react";

const DownloadSurvey = ({ gpsTrackId }: { gpsTrackId: string }) => {
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

  const { mutate, isPending } = useMutation({
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

  return (
    <div
      className="flex gap-1 w-8 justify-center items-center "
      onClick={() => mutate(gpsTrackId)}
    >
      <div className="rounded-full p-1 hover:bg-[#e2f0cb] transition">
        {isPending ? (
          <Loader2
            size={16}
            className="animate-spin cursor-pointer text-[#6a9a23]"
          />
        ) : (
          <DownloadIcon size={16} className="cursor-pointer text-[#6a9a23]" />
        )}
      </div>
    </div>
  );
};

export default DownloadSurvey;
