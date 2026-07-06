import { supabase } from "../config/db.js";

// Get next appointment (single)
export const getNextAppointment = async (patientId) => {
  try {
    const { data, error } = await supabase
      .from("appointments")
      .select(`
        appointment_id,
        scheduled_at,
        scheduled_date,
        duration_minutes,
        procedure_title,
        reason,
        status,
        type,
        room_no,
        dentist_profile (
          dentist_id,
          staff (
            users (
              full_name
            )
          )
        )
      `)
      .eq("patient_id", patientId)
      .gte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(1)
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error("Error fetching next appointment:", error);
    throw new Error("Failed to fetch next appointment");
  }
};

// Get all upcoming appointments
export const getUpcomingAppointments = async (patientId) => {
  try {
    const { data, error } = await supabase
      .from("appointments")
      .select(`
        appointment_id,
        scheduled_at,
        scheduled_date,
        duration_minutes,
        procedure_title,
        reason,
        status,
        type,
        room_no,
        dentist_profile (
          dentist_id,
          staff (
            users (
              full_name
            )
          )
        )
      `)
      .eq("patient_id", patientId)
      .gte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true });

    if (error) throw error;

    return data;
  } catch (error) {
    console.error("Error fetching upcoming appointments:", error);
    throw new Error("Failed to fetch upcoming appointments");
  }
};

// Get past appointments
export const getPastAppointments = async (patientId) => {
  try {
    const { data, error } = await supabase
      .from("appointments")
      .select(`
        appointment_id,
        scheduled_at,
        scheduled_date,
        duration_minutes,
        procedure_title,
        reason,
        status,
        type,
        room_no,
        dentist_profile (
          dentist_id,
          staff (
            users (
              full_name
            )
          )
        )
      `)
      .eq("patient_id", patientId)
      .lt("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: false });

    if (error) throw error;

    return data;
  } catch (error) {
    console.error("Error fetching past appointments:", error);
    throw new Error("Failed to fetch past appointments");
  }
};