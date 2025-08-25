//@ts-nocheck
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import VideoWithMap from "@/components/video-player";
import MP4VideoWithMap from "@/components/video-player/mp4-player";
import { createClient } from "@/lib/supabase-server";
import { ArrowLeftIcon, PlusIcon } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import axios from "axios";

export const experimental_ppr = true;

const VideoPage = async ({
  params,
}: {
  params: Promise<{ surveyId: string }>;
}) => {
  const { surveyId } = await params;
  const user = (await cookies()).get("user");

  if (!user) {
    redirect(`/preview/${surveyId}`);
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

  if (!videoData?.url && !videoData?.mux_playback_id) {
    return (
      <div className="flex flex-col justify-center items-center h-screen gap-4">
        <Badge
          variant="destructive"
          className="text-2xl font-bold bg-red-500 text-white animate-pulse border-red-700 shadow-lg"
        >
          No video found for this survey
        </Badge>
        <Link
          href="/geotaggedvideos"
          className="text-red-500 hover:text-red-700 underline text-sm"
        >
          Go back to surveys?
        </Link>
      </div>
    );
  }

  if (videoData.mux_playback_id && videoData.status !== "ready") {
    //  console.log("getting mux status");
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
      <div className="px-4 ">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline">
              <Link
                href="/geotaggedvideos"
                className="flex items-center gap-2 w-fit h-fit"
              >
                <ArrowLeftIcon size={16} />
                Back
              </Link>
            </Button>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-balance text-[#262626]">
            {videoData.name}
          </h1>
        </div>

        <div className=" mt-4">
          {videoData.mux_playback_id ? (
            <VideoWithMap
              videoUrl={videoData.mux_playback_id}
              locationData={surveyData?.gps_tracks?.location_data}
            />
          ) : (
            <MP4VideoWithMap
              videoUrl={videoData?.url}
              locationData={surveyData?.gps_tracks?.location_data}
            />
          )}
        </div>
      </div>
    </Suspense>
  );
};
export default VideoPage;
