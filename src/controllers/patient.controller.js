import { supabase } from "../config/db.js";
import { getNextAppointment, getPastAppointments, getUpcomingAppointments } from "../services/appointment/patient.js";
import AsynHandler from "../utils/AsynHandler.js";
import ApiError from "../utils/ApiError.js";



export const updatePatientProfile = AsynHandler(async (req, res) => {
  // 1. Extract user data injected by authUser middleware
  // Note: authUser checks decoded.id. Ensure your middleware maps decoded.id to req.user.user_id 
  // or adjust according to what your authUser maps to req.user.
  const authUserId = req.user?.user_id || req.user?.id; 

  if (!authUserId) {
    throw new ApiError(401, "User not authenticated or missing context.");
  }

  // 2. Destructure data coming from the frontend form
  const {
    fullName,
    email,
    phone,
    dob,
    // Elements from the 'patients' or 'medical_history' table
    allergies,
    chronicConditions,
    currentMedications,
    pastSurgeries,
    additionalNotes
  } = req.body;

  // 3. Step 1: Update the 'users' table
  const { data: updatedUser, error: userError } = await supabase
    .from("users")
    .update({
      full_name: fullName,
      email: email,
      phone: phone,
    })
    .eq("user_id", authUserId)
    .select()
    .single();

  if (userError) {
    throw new ApiError(400, `Failed to update user profile: ${userError.message}`);
  }

  // 4. Step 2: Fetch the patient record linked to this user to get patient_id
  const { data: patient, error: patientFetchError } = await supabase
    .from("patients")
    .select("patient_id")
    .eq("user_id", authUserId)
    .single();

  if (patientFetchError || !patient) {
    throw new ApiError(404, "Patient record not found.");
  }

  const patientId = patient.patient_id;

  // 5. Step 3: Update the 'patients' table (e.g., date of birth)
  if (dob) {
    const { error: patientUpdateError } = await supabase
      .from("patients")
      .update({
        date_of_birth: dob
      })
      .eq("patient_id", patientId);

    if (patientUpdateError) {
      throw new ApiError(400, `Failed to update birth date: ${patientUpdateError.message}`);
    }
  }

  // 6. Step 4: Upsert (Update or Insert) the 'medical_history' record
  // Since medical_history might not exist yet for a brand new user, we use .upsert()
  const { error: historyError } = await supabase
    .from("medical_history")
    .upsert({
      patient_id: patientId,
      allergies: allergies,
      chronic_conditions: chronicConditions,
      current_medications: currentMedications,
      past_surgeries: pastSurgeries,
      notes: additionalNotes,
      updated_at: new Date().toISOString()
    }, { onConflict: 'patient_id' }); // Ensures it updates if patient_id already exists

  if (historyError) {
    throw new ApiError(400, `Failed to update medical history: ${historyError.message}`);
  }

  // 7. Send successful response back to frontend
  return res.status(200).json({
    success: true,
    message: "Profile updated successfully.",
    data: {
      user: updatedUser
    }
  });
});

// Fixed Appointment Wrapper Functions (Executing the services correctly)
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