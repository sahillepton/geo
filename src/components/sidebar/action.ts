
"use server";
import { createClient } from "@/lib/supabase-server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function logout() {
  (await cookies()).delete("user");
  redirect("/login");
}

type RouteFilters = {
  name: string;
  dateFrom: string;
  dateTo: string;
}

export type VideoListFilters = {
  locationName: string;
  state: string;
  district: string;
  block: string;
  ring: string;
  childRing: string;
  routeName: string;
  userRole: string;
  userId: string;
  dateKey: string;
  dateFrom: string;
  dateTo: string;
} | {}

export async function getRoutes(filters : RouteFilters) {
  try {
    const supabase = await createClient();
    let query = supabase
      .from('surveys')
      .select(`
        id,
        name,
        timestamp,
        gps_track_id,
        is_video_uploaded,
        video_id,
        created_at,
        gps_tracks (
          id,
          name,
          location_data,
          route_id,
          entity_id
        ),
        videos (
          id,
          name,
          url,
          duration
        )
      `)
      .order('created_at', { ascending: false })

    if (filters.name) {
      query = query.ilike('name', `%${filters.name}%`)
    }
    if (filters.dateFrom && filters.dateTo) {
      query = query
        .gte('created_at', filters.dateFrom)
        .lte('created_at', filters.dateTo)
    }

    const { data, error } = await query

    if (error) throw error

    return {
      data: JSON.stringify({
        Status: "5001",
        Result: data.map(survey => ({
          autoId: survey.id,
          routeName: survey.name,
          isActive: survey.is_video_uploaded === 'true',
          remarks: survey.videos?.name || 'No video uploaded',
          createdBy: 'System',
          createdOn: survey.created_at,
          video_url: survey.videos?.url,
          gps_data: survey.gps_tracks?.location_data,
          video_id: survey.video_id,
          gps_track_id: survey.gps_track_id,
          route_id: survey.gps_tracks?.route_id,
          entity_id: survey.gps_tracks?.entity_id
        }))
      })
    }
  } catch (error) {
    console.error('Error:', error)
    return {
      data: JSON.stringify({
        Status: "5000",
        Message: error.message
      })
    }
  }
}

export async function deleteRoute(id: string, deletedBy: string) {
  try {
    const supabase = await createClient();

    const { data: survey, error: fetchError } = await supabase
      .from('surveys')
      .select('video_id, gps_track_id')
      .eq('id', id)
      .single()

    if (fetchError) throw fetchError

    if (survey.video_id) {
      const { error: videoError } = await supabase
        .from('videos')
        .delete()
        .eq('id', survey.video_id)

      if (videoError) throw videoError
    }

    if (survey.gps_track_id) {
      const { error: gpsError } = await supabase
        .from('gps_tracks')
        .delete()
        .eq('id', survey.gps_track_id)

      if (gpsError) throw gpsError
    }

    const { error: surveyError } = await supabase
      .from('surveys')
      .delete()
      .eq('id', id)

    if (surveyError) throw surveyError

    return {
      data: JSON.stringify({
        Status: "5001",
        Message: "Survey and related data deleted successfully"
      })
    }
  } catch (error) {
    console.error('Error:', error)
    return {
      data: JSON.stringify({
        Status: "5000",
        Message: error.message
      })
    }
  }
}

export async function getVideoList(filters : VideoListFilters, page = 1, pageSize = 10) {
  try {
    const supabase = await createClient();
    let query = supabase
      .from('surveys')
      .select(`
        id,
        name,
        timestamp,
        is_video_uploaded,
        created_at,
        video_id,
        gps_track_id,
        user_id,
        state,
        district,
        block,
        ring,
        child_ring
      `)
      .order('created_at', { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1);


      
          if (filters.locationName) {
            query = query.ilike('name', `%${filters.locationName}%`);
          }
          if (filters.state) {
            query = query.ilike('state', `%${filters.state}%`);
          }
          if (filters.district) {
            query = query.ilike('district', `%${filters.district}%`);
          }
          if (filters.block) {
            query = query.ilike('block', `%${filters.block}%`);
          }
          if (filters.ring) {
            query = query.eq('ring', filters.ring);
          }
          if (filters.childRing) {
            query = query.ilike('child_ring', `%${filters.childRing}%`);
            }
          if (filters.routeName) {
            query = query.ilike('name', `%${filters.routeName}%`);
          }



    if (filters.userRole) {
      const userRole = filters.userRole.toLowerCase(); 
      
      if (userRole === 'manager' && filters.userId) {
        const { data: managedUsers } = await supabase
          .from('users')
          .select('user_id')
          .eq('manager_id', filters.userId);
          
        const managedUserIds = managedUsers ? managedUsers.map(user => user.user_id) : [];
        
        managedUserIds.push(filters.userId);
        
        query = query.in('user_id', managedUserIds);
      } else if (userRole === 'surveyor' && filters.userId) {
        query = query.eq('user_id', filters.userId);
      }
    }

    if (filters.dateKey && filters.dateFrom && filters.dateTo) {
      const column = filters.dateKey === 'Mobile_Video_Capture_Time' ? 'timestamp' :
                    filters.dateKey === 'Created_On' ? 'created_at' : null;
      
      if (column) {
        query = query
          .gte(column, filters.dateFrom)
          .lte(column, filters.dateTo);
      }
    }

    const { data: surveys, error: surveysError } = await query;
    if (surveysError) throw surveysError;


    const videoIds = surveys.filter(s => s.video_id).map(s => s.video_id);
    const gpsTrackIds = surveys.filter(s => s.gps_track_id).map(s => s.gps_track_id);
    const userIds = surveys.filter(s => s.user_id).map(s => s.user_id);

    const [videosResponse, gpsTracksResponse, usersResponse] = await Promise.all([
      videoIds.length > 0 ? 
        supabase.from('videos').select('*').in('id', videoIds) :
        { data: [] },
      gpsTrackIds.length > 0 ?
        supabase.from('gps_tracks').select('*').in('id', gpsTrackIds) :
        { data: [] },
      userIds.length > 0 ?
        supabase.from('users').select('*').in('user_id', userIds) :
        { data: [] }
    ]);

    const videosMap = new Map(videosResponse.data?.map(v => [v.id, v]) || []);
    const gpsTracksMap = new Map(gpsTracksResponse.data?.map(g => [g.id, g]) || []);
    const usersMap = new Map(usersResponse.data?.map(u => [u.user_id, u]) || []);

    return {
      data: JSON.stringify({
        Status: "5001",
        Result: surveys.map(survey => {
          const video = videosMap.get(survey.video_id) || {};
          const gpsTrack = gpsTracksMap.get(survey.gps_track_id) || {};
          const user = usersMap.get(survey.user_id) || {};
          
          let locationData = [];
          
          try {
            if (gpsTrack.location_data) {
              if (typeof gpsTrack.location_data === 'string') {
                locationData = JSON.parse(gpsTrack.location_data);
              } else {
                locationData = gpsTrack.location_data;
              }
            }
          } catch (e) {
            console.error('Error parsing location data:', e);
            console.log('Raw location data:', gpsTrack.location_data);
          }

          return {
            hasMore: true,
            routeName: survey.name || "-",
            surveyId: survey.id,
            videoName: video.name || "-",
            locationName: "-",
            videoDuration: video.duration || "-",
            mobileVideoCaptureTime: survey.created_at,
            videoId: survey.video_id,
            createdOn: video.created_at,
            createdBy: user.username || "System",
            userId: survey.user_id,
            verifiedStatus: survey.is_video_uploaded ? "APPROVED" : "PENDING",
            
            videoUrl: video.url || null,
            locationData: locationData,
            entityName: gpsTrack.entity_id || "-",
            state: survey.state || "-",
            district: survey.district || "-",
            block: survey.block || "-",
            ring: survey.ring || "-",
            childRing: survey.child_ring || "-"
          };
        })
      })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      data: JSON.stringify({
        Status: "5000",
        Message: error.message
      })
    };
  }
} 


export async function getStates() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_distinct_states")
  if (error) throw error;
  return data;
}

// Get distinct districts
export async function getDistricts() {

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_distinct_districts")
  if (error) throw error;
  return data;
}

// Get distinct blocks
export async function getBlocks() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_distinct_blocks")
  if (error) throw error;
  return data;
}

export async function getStateBlocksAndDistricts() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_state_blocks_and_districts")

  console.log(data, 'districts')

  if (error) {
    console.error('Error fetching data:', error);
    return [];
  }

  return data;
}