import VideoWithMap from "@/components/video-player";
import { createClient } from "@/lib/supabase-server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const VideoPage = async ({ params }: { params: { surveyId: string } }) => {
  const { surveyId } = await params;
  const user = (await cookies()).get("user");
  if (!user) {
    redirect("/login");
  }

  const supabase = await createClient();
  const { data: videoData, error } = await supabase
    .from("videos")
    .select("*")
    .eq("survey_id", surveyId)
    .single();
  const { data: surveyData, error: surveyError } = await supabase
    .from("surveys")
    .select(
      `
      id,
      gps_track_id,
      gps_tracks(*)
    `
    )
    .eq("id", surveyId)
    .single();

  // console.log(surveyData);

  if (!videoData?.url) {
    return (
      <div className="flex justify-center items-center h-screen">
        <h1 className="text-2xl font-bold">No video found for this survey</h1>
      </div>
    );
  }

  return (
    <div className="px-4 ">
      <h1 className="text-4xl font-extrabold tracking-tight text-balance text-[#262626]">
        {videoData.name}
      </h1>
      <div className=" mt-4">
        <VideoWithMap
          videoUrl={videoData.mux_playback_id || videoData?.url}
          locationData={surveyData?.gps_tracks?.location_data}
        />
      </div>
    </div>
  );
};
export default VideoPage;
