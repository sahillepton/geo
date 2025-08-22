import { Button } from "@/components/ui/button";
import VideoWithMap from "@/components/video-player";
import { createClient } from "@/lib/supabase-server";
import { ArrowLeftIcon, PlusIcon } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

const VideoPage = async ({ params }: { params: { surveyId: string } }) => {
  const { surveyId } = await params;
  const user = (await cookies()).get("user");

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

  if (!videoData?.url && !videoData?.mux_playback_id) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <h1 className="text-2xl font-bold">No video found for this survey</h1>
        <Link
          href="/geotaggedvideos"
          className="text-gray-800 hover:text-gray-600 underline text-sm"
        >
          Go back to surveys?
        </Link>
      </div>
    );
  }

  if (videoData.mux_playback_id) {
    const id = videoData.mux_playback_id.substring(
      videoData.mux_playback_id.lastIndexOf("/") + 1,
      videoData.mux_playback_id.lastIndexOf(".")
    );
    const url = `https://api.mux.com/video/v1/playback-ids/${id}`;
    const MUX_TOKEN_ID = "7f1ca50f-349b-464a-95b2-73fa0751925b";
    const MUX_TOKEN_SECRET =
      "MdHABlNRtlqfKmcL3p6W90iK3+ZWMh9OhoxN0D3THJoWAAcbIiCTNIECZjcCEJfDUPH85fPnGHe";
    const asset = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: "Basic " + btoa(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`),
        "Content-Type": "application/json",
      },
    });
    const data = await asset.json();
    // console.log(data.data, "data asset");
    const asset_id = data.data.object.id;
    const asset_url = `https://api.mux.com/video/v1/assets/${asset_id}`;
    const asset_response = await fetch(asset_url, {
      method: "GET",
      headers: {
        Authorization: "Basic " + btoa(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`),
        "Content-Type": "application/json",
      },
    });
    const asset_data = await asset_response.json();
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
  }

  return (
    <div className="px-4 ">
      <h1 className="text-4xl font-extrabold tracking-tight text-balance text-[#262626]">
        {videoData.name}
      </h1>
      {user && (
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
      )}

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
