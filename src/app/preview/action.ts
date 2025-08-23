"use server";

import { createClient } from "@/lib/supabase-server";

export async function submitFeedback(prevState: any, formData: FormData) {
  const videoId = formData.get("videoId");
  const feedback = formData.get("feedback");

  try {
    const supabase = await createClient();
    await supabase.from("feedbacks").insert({
      video_id: videoId,
      feedback: feedback,
    });
  
    return {
      success: true,
    };

  } catch (error) {
    console.error(error);
    return {
      success: false,
      error: "Failed to submit feedback",
    };
  }

}