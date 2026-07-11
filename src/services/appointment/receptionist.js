import ApiError from "../../utils/ApiError";
import { supabase } from "../../config/db";
import AsynHandler from "../../utils/AsynHandler";


export const getAllRequests = async (req,res)=>{
    const {data:allRequests,error:requestError} = await supabase 
    .from("appointment_requests")
    .select(
        `
        *,
        patients(
        patient_id,
        users(
        full_name,
        phone
        )
        )
        `
    ).order("created_at",{ascending:true})
}

export const getAvailableDentists = async (selectedDate) => {
    const { data, error } = await supabase
    .from("dentist_profile")
    .select(`
      dentist_id,
      consultation_fee,
      years_experience,
      bio,
      staff (
        specialization,
        users (
          full_name,
          email
        )
      ),
      appointment_slots!inner (
        slot_id,
        slot_date,
        start_time,
        end_time,
        is_available
      )
    `)
    .eq("appointment_slots.slot_date", selectedDate)
    .eq("appointment_slots.is_available", true);


  if (error) {
    throw new ApiError(500, error.message);
  }

  return data;
};


export const requestDentist = async ({
  patientId,
  dentistId,
  slotId,
  reason,
}) => {
  const { data, error } = await supabase
    .from("appointment_requests")
    .insert({
      patient_id: patientId,
      dentist_id: dentistId,
      slot_id: slotId,
      reason,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    throw new ApiError(500, error.message);
  }

  return data;
};