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
    const headers = {
      Authorization: "Basic " + btoa(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`),
      "Content-Type": "application/json",
    };

    // First fetch the playback ID data
    const playbackData = await fetch(url, { method: "GET", headers }).then(
      (res) => res.json()
    );
    const asset_id = playbackData.data.object.id;
    const asset_url = `https://api.mux.com/video/v1/assets/${asset_id}`;

    // Fetch the asset data
    const asset_data = await fetch(asset_url, { method: "GET", headers }).then(
      (res) => res.json()
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
  }

  return (
    <div className="px-4 ">
      <div className="flex items-center gap-4">
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
        <h1 className="text-2xl font-extrabold tracking-tight text-balance text-[#262626]">
          {videoData.name}
        </h1>
      </div>

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
