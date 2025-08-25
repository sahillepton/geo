import { supabase } from "./supabase";

export const getStateDistrictFromBlockName = async (blockName: string) => {
  const { data, error } = await supabase
    .from("state_names")
    .select("st_name, dt_name")
    .eq("blk_name", blockName).limit(1);
 // console.log(data, "state and district");
  if (error) {
   // console.log(error, "error");
    throw error;
  }
  return data[0];
};


export const getStateFromDistrictName = async (districtName: string) => {
  const { data, error } = await supabase
    .from("state_name")
    .select("st_name")
    .eq("dt_name", districtName).limit(1);
 // console.log(data, "state");
  if (error) {
   // console.log(error, "error");
    throw error;
  }
  return data[0];
};