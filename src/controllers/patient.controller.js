import { supabase } from "../config/db.js";
import { getNextAppointment,getPastAppointments,getUpcomingAppointments } from "../services/appointment/patient.js";
import AsynHandler from "../utils/AsynHandler.js";
const {
  data: { user },
} = await supabase.auth.getUser();

const { data: patient, error } = await supabase
  .from("patients")
  .select("patient_id")
  .eq("user_id", user.id)
  .single();

if (error) throw error;

const patientId = patient.patient_id;

export const completePatientProfile = AsynHandler(async(req,res)=>{
  

})


export const getNext = AsynHandler(async(req,res)=>{
  return getNextAppointment
})
export const getPast = AsynHandler(async(req,res)=>{
  return getPastAppointments
})
export const getUpcoming = AsynHandler(async(req,res)=>{
  return getUpcomingAppointments
})