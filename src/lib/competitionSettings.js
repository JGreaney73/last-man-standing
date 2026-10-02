import { supabase } from "./supabase";

export async function loadCompetitionStartingRound() {
  const { data, error } = await supabase
    .from("competition_settings")
    .select("starting_round")
    .eq("id", true)
    .single();

  if (error) throw error;
  return data.starting_round;
}