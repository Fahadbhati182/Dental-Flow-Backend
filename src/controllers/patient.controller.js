import { supabase } from "../config/db.js";
import {
  getNextAppointment,
  getPastAppointments,
  getUpcomingAppointments,
} from "../services/appointment/patient.js";
import AsynHandler from "../utils/AsynHandler.js";
import ApiError from "../utils/ApiError.js";

export const updatePatientProfile = AsynHandler(async (req, res) => {
  const authUserId = req.user?.userId || req.user?.id;

  if (!authUserId) {
    throw new ApiError(401, "User not authenticated or missing context.");
  }

  const {
    fullName,
    email,
    phone,
    dob,
    allergies,
    chronicConditions,
    currentMedications,
    insuranceProvider,
    insurancePolicyNo,
    pastSurgeries,
    additionalNotes,
  } = req.body;

  const { data: updatedUser, error: userError } = await supabase
    .from("users")
    .update({
      full_name: fullName,
      email,
      phone,
    })
    .eq("user_id", authUserId)
    .select()
    .single();

  if (userError) {
    throw new ApiError(
      400,
      `Failed to update user profile: ${userError.message}`
    );
  }

  const { data: patient, error: patientFetchError } = await supabase
    .from("patients")
    .select("patient_id")
    .eq("user_id", authUserId)
    .single();

  if (patientFetchError || !patient) {
    throw new ApiError(404, "Patient record not found.");
  }

  const patientId = patient.patientId || patient.patient_id;

  if (dob) {
    const { error: patientUpdateError } = await supabase
      .from("patients")
      .update({
        date_of_birth: dob,
      })
      .eq("patient_id", patientId);

    if (patientUpdateError) {
      throw new ApiError(
        400,
        `Failed to update birth date: ${patientUpdateError.message}`
      );
    }
  }

  const { error: historyError } = await supabase
    .from("medical_history")
    .upsert(
      {
        patient_id: patientId,
        allergies,
        chronic_conditions: chronicConditions,
        current_medications: currentMedications,
        insurance_provider: insuranceProvider,
        insurance_policy_no: insurancePolicyNo,
        past_surgeries: pastSurgeries,
        notes: additionalNotes,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "patient_id" }
    );

  if (historyError) {
    throw new ApiError(
      400,
      `Failed to update medical history: ${historyError.message}`
    );
  }

  return res.status(200).json({
    success: true,
    message: "Profile updated successfully.",
    data: {
      user: updatedUser,
    },
  });
});

export const getNext = AsynHandler(async (req, res) => {
  const data = await getNextAppointment(req);
  return res.status(200).json({ success: true, data });
});

export const getPast = AsynHandler(async (req, res) => {
  const data = await getPastAppointments(req);
  return res.status(200).json({ success: true, data });
});

export const getUpcoming = AsynHandler(async (req, res) => {
  const data = await getUpcomingAppointments(req);
  return res.status(200).json({ success: true, data });
});