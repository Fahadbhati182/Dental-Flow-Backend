import { supabase } from "../../config/db.js";
import ApiError from "../../utils/ApiError.js";

// Get next appointment (single)
export const getNextAppointment = async (patientId) => {
  try {
    const { data, error } = await supabase
      .from("appointments")
      .select(
        `
        appointment_id,
        scheduled_at,
        scheduled_date,
        duration_minutes,
        procedure_title,
        reason,
        status,
        type,
        room_no,
        dentists (
          id,
          staff (
            users (
              name
            )
          )
        )
      `,
      )
      .eq("patient_id", patientId)
      .gte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(1)
      .maybeSingle();

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
      .select(
        `
        appointment_id,
        scheduled_at,
        scheduled_date,
        duration_minutes,
        procedure_title,
        reason,
        status,
        type,
        room_no,
        dentists (
          id,
          staff (
            users (
              name
            )
          )
        )
      `,
      )
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
      .select(
        `
        appointment_id,
        scheduled_at,
        scheduled_date,
        duration_minutes,
        procedure_title,
        reason,
        status,
        type,
        room_no,
        dentists (
          id,
          staff (
            users (
              name
            )
          )
        )
      `,
      )
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

export const requestAppointment = async(
   patientId,
  reason,
  urgency,
  preferredDate,
  preferredTime)=>{
  try {
     const { data: patient, error: patientError } = await supabase
    .from("patients")
    .select("patient_id")
    .eq("patient_id", patientId)
    .single();

    if(patientError || !patient){
      throw new ApiError(404,"Patient not found")
    }
    const{data:existingRequest,error:requestError} = await supabase
    .from("appointment_requests")
    .select("request_id")
    .eq("patient_id",patientId)
    .eq("status","pending")
    .maybeSingle();
     if (requestError) {
    throw new ApiError(500, requestError.message);
  }

  if (existingRequest) {
    throw new ApiError(
      409,
      "You already have a pending appointment request."
    );
  }


  //prevent selecting a past date

   const today = new Date();
  today.setHours(0, 0, 0, 0);

  const selectedDate = new Date(preferredDate);

  if (selectedDate < today) {
    throw new ApiError(
      400,
      "Preferred appointment date cannot be in the past."
    );
  }

  const { data, error } = await supabase
    .from("appointment_requests")
    .insert({
      patient_id: patientId,
      reason,
      urgency,
      preferred_date: preferredDate,
      preferred_time: preferredTime,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    throw new ApiError(500, error.message);
  }
  } catch (error) {
    console.log(error)
  }
}