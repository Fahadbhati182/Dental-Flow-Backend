import { supabase } from "../config/db.js";
import {
  getNextAppointment,
  getPastAppointments,
  getUpcomingAppointments,
} from "../services/appointment/patient.js";
import AsynHandler from "../utils/AsynHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";

// Reusable helper to dynamically fetch patient_id inside route scopes
const getPatientIdFromUser = async (req) => {
  const authUserId = req.user?.userId || req.user?.id;
  if (!authUserId) {
    throw new ApiError(401, "Unauthorized: User context missing");
  }

  const { data: patient, error } = await supabase
    .from("patients")
    .select("patient_id")
    .eq("user_id", authUserId)
    .maybeSingle();

  if (error || !patient) {
    throw new ApiError(404, "Patient record not found. Please register first.");
  }

  return patient.patient_id;
};

// Runs after patient registration
export const addPatientDetails = AsynHandler(async (req, res) => {
  const authUserId = req.user?.userId || req.user?.id;

  if (!authUserId) {
    throw new ApiError(403, "Unauthorized");
  }

  const {
    date_of_birth,
    gender,
    phone,
    address,
    insurance_provider,
    insurance_policy_no,
  } = req.body;

  if (!date_of_birth || !gender || !phone || !address) {
    throw new ApiError(400, "Required fields are missing");
  }

  if (!["male", "female", "other"].includes(gender.toLowerCase())) {
    throw new ApiError(400, "Invalid gender");
  }

  const { data: existingPatient, error } = await supabase
    .from("patients")
    .select("*")
    .eq("user_id", authUserId)
    .maybeSingle();

  if (error) {
    throw new ApiError(500, "Something went wrong");
  }

  if (existingPatient) {
    throw new ApiError(400, "Patient already exists with this id");
  }

  const { data: prevPatient } = await supabase
    .from("patients")
    .select("patient_code")
    .order("patient_code", { ascending: false })
    .limit(1)
    .maybeSingle();

  let nextNumber = 1;
  if (prevPatient && prevPatient.patient_code) {
    nextNumber = parseInt(prevPatient.patient_code.replace("PAT-", ""), 10) + 1;
  }

  const patient_code = `PAT-${String(nextNumber).padStart(6, "0")}`;

  const { data: patient, error: createError } = await supabase
    .from("patients")
    .insert({
      user_id: authUserId,
      date_of_birth,
      gender,
      phone,
      address,
      insurance_provider,
      insurance_policy_no,
      patient_code,
    })
    .select(`*, user:users(id,name,email,role_type)`)
    .single();

  if (createError || !patient) {
    throw new ApiError(500, "Something went wrong creating patient details");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, "patient information added successfully", patient));
});

// Medical History APIs
export const addPatientMedicalHistory = AsynHandler(async (req, res) => {
  const patientId = await getPatientIdFromUser(req);
  
  const {
    allergies,
    chronicConditions,
    pastSurgeries,
    bloodGroup,
    diabetes,
    hypertension,
    heartDisease,
    asthma,
    hepatitis,
    pregnancy_status,
    smoking,
    alcoholConsumption,
    emergencyContactName,
    emergencyContactNumber
  } = req.body;

  if (!allergies || !chronicConditions || !pastSurgeries || !bloodGroup || !emergencyContactName || !emergencyContactNumber) {
    throw new ApiError(400, "Required fields are missing");
  }

  const { data: medicalHistory, error } = await supabase
    .from("medical_history")
    .upsert({
      patient_id: patientId,
      allergies,
      chronic_conditions: chronicConditions,
      past_surgeries: pastSurgeries,
      blood_group: bloodGroup,
      diabetes,
      hypertension,
      heart_disease: heartDisease,
      asthma,
      hepatitis,
      pregnancy_status,
      smoking,
      alcohol_consumption: alcoholConsumption,
      emergency_contact_name: emergencyContactName,
      emergency_contact_number: emergencyContactNumber
    }, { onConflict: "patient_id" })
    .select()
    .single();  

  if (error) {
    throw new ApiError(500, "Failed to save medical history");
  }

  return res.status(201).json({
    success: true,
    message: "Medical history added successfully",
    data: medicalHistory
  });
});

export const getPatientMedicalHistory = AsynHandler(async (req, res) => {
  const patientId = await getPatientIdFromUser(req);

  const { data: medicalHistory, error } = await supabase
    .from("medical_history")
    .select("*")
    .eq("patient_id", patientId)
    .maybeSingle();

  if (error) {
    throw new ApiError(500, "Failed to get medical history");
  }

  return res.status(200).json({
    success: true,
    data: medicalHistory || {}
  });
});

export const updatePatientMedicalHistory = AsynHandler(async (req, res) => {
  const patientId = await getPatientIdFromUser(req);

  const {
    allergies,
    chronicConditions,
    pastSurgeries,
    bloodGroup,
    diabetes,
    hypertension,
    heartDisease,
    asthma,
    hepatitis,
    pregnancy_status,
    smoking,
    alcoholConsumption,
    emergencyContactName,
    emergencyContactNumber
  } = req.body;

  const { data: medicalHistory, error } = await supabase
    .from("medical_history")
    .update({
      allergies,
      chronic_conditions: chronicConditions,
      past_surgeries: pastSurgeries,
      blood_group: bloodGroup,
      diabetes,
      hypertension,
      heart_disease: heartDisease,
      asthma,
      hepatitis,
      pregnancy_status,
      smoking,
      alcohol_consumption: alcoholConsumption,
      emergency_contact_name: emergencyContactName,
      emergency_contact_number: emergencyContactNumber
    })
    .eq("patient_id", patientId)
    .select()
    .single();

  if (error) {
    throw new ApiError(500, "Failed to update medical history");
  }

  return res.status(200).json({
    success: true,
    message: "Medical history updated successfully",
    data: medicalHistory
  });
});

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
    .eq("id", authUserId)
    .select()
    .single();

  if (userError) {
    throw new ApiError(400, `Failed to update user profile: ${userError.message}`);
  }

  const patientId = await getPatientIdFromUser(req);

  if (dob) {
    const { error: patientUpdateError } = await supabase
      .from("patients")
      .update({ date_of_birth: dob })
      .eq("patient_id", patientId);

    if (patientUpdateError) {
      throw new ApiError(400, `Failed to update birth date: ${patientUpdateError.message}`);
    }
  }

  const { error: historyError } = await supabase
    .from("medical_history")
    .upsert({
      patient_id: patientId,
      allergies,
      chronic_conditions: chronicConditions,
      current_medications: currentMedications,
      insurance_provider: insuranceProvider,
      insurance_policy_no: insurancePolicyNo,
      past_surgeries: pastSurgeries,
      notes: additionalNotes,
      updated_at: new Date().toISOString(),
    }, { onConflict: "patient_id" });

  if (historyError) {
    throw new ApiError(400, `Failed to update medical history: ${historyError.message}`);
  }

  return res.status(200).json({
    success: true,
    message: "Profile updated successfully.",
    data: { user: updatedUser },
  });
});

// Appointment Endpoints (Cleaned to pass string patientId directly to service)
export const getNext = AsynHandler(async (req, res) => {
  const patientId = await getPatientIdFromUser(req);
  const data = await getNextAppointment(patientId);
  return res.status(200).json({ success: true, data });
});

export const getPast = AsynHandler(async (req, res) => {
  const patientId = await getPatientIdFromUser(req);
  const data = await getPastAppointments(patientId);
  return res.status(200).json({ success: true, data });
});

export const getUpcoming = AsynHandler(async (req, res) => {
  const patientId = await getPatientIdFromUser(req);
  const data = await getUpcomingAppointments(patientId);
  return res.status(200).json({ success: true, data });
});