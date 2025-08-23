import VideoWithMap from "@/components/video-player";
import { createClient } from "@/lib/supabase-server";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import axios from "axios";
import { Suspense } from "react";
import MP4VideoWithMap from "@/components/video-player/mp4-player";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import Feedback from "../feedback";

const PreviewPage = async ({
  params,
}: {
  params: Promise<{ surveyId: string }>;
}) => {
  const { surveyId } = await params;
  const user = (await cookies()).get("user");

  if (user) {
    redirect(`/video/${surveyId}`);
  }
  const supabase = await createClient();
  const [videoResult, surveyResult] = await Promise.all([
    supabase.from("videos").select("*").eq("survey_id", surveyId).single(),
    supabase
      .from("surveys")
      .select(
        `
        id,
        gps_track_id,
        gps_tracks(*)
      `
      )
      .eq("id", surveyId)
      .single(),
  ]);

  const { data: videoData, error: videoError } = videoResult;
  const { data: surveyData, error: surveyError } = surveyResult;

  if (videoData.mux_playback_id && videoData.status !== "ready") {
    const id = videoData.mux_playback_id.substring(
      videoData.mux_playback_id.lastIndexOf("/") + 1,
      videoData.mux_playback_id.lastIndexOf(".")
    );

    const asset_data = await axios.get(
      `http://localhost:3000/api/mux-status/${id}`
    );

    if (asset_data.data.status !== "ready") {
      return (
        <div className="flex flex-col justify-center items-center h-screen">
          <h1 className="text-2xl font-bold">Video is still processing</h1>
          <Link
            href="/geotaggedvideos"
            className="text-gray-800 hover:text-gray-600 underline text-sm"
          >
            Go back to surveys?
          </Link>
        </div>
      );
    }

    if (asset_data.data.status === "ready") {
      await supabase
        .from("videos")
        .update({ status: "ready" })
        .eq("id", videoData.id);
    }
  }

  return (
    <Suspense
      fallback={
        <div className="flex flex-col justify-center items-center h-screen">
          <Badge
            variant={"secondary"}
            className="
    text-2xl 
    font-bold 
    bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-200 
    animate-pulse 
    border-2 border-yellow-500 
    text-yellow-800
    shadow-lg
    "
          >
            Fetching video and GPS tracks
          </Badge>
        </div>
      }
    >
      <div className="w-[1200px] flex justify-between items-center ml-4 mr-4 mt-4">
        <p className="text-2xl font-bold">{videoData.name}</p>
        <Feedback videoId={videoData.id} />
      </div>
      {videoData.mux_playback_id ? (
        <div className="p-4">
          <VideoWithMap
            videoUrl={videoData?.url}
            locationData={surveyData?.gps_tracks?.location_data}
          />
        </div>
      ) : (
        <div>
          <MP4VideoWithMap
            videoUrl={videoData?.url}
            locationData={surveyData?.gps_tracks?.location_data}
          />
        </div>
      )}
    </Suspense>
  );
};

export default PreviewPage;
