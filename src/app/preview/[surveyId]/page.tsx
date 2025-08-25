//@ts-nocheck

import VideoWithMap from "@/components/video-player";
import { createClient } from "@/lib/supabase-server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import MP4VideoWithMap from "@/components/video-player/mp4-player";
import { Badge } from "@/components/ui/badge";
import Feedback from "../feedback";

const PreviewPage = async ({
  params,
  searchParams,
}: {
  params: Promise<{ surveyId: string }>;
  searchParams: Promise<{ x?: string; y?: string }>;
}) => {
  const { surveyId } = await params;
  const { x, y } = await searchParams;

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
            videoUrl={videoData?.mux_playback_id}
            locationData={surveyData?.gps_tracks?.location_data}
            initialX={x}
            initialY={y}
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
