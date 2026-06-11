import { supabase } from "../config/db.js";

import AsynHandler from "../utils/AsynHandler.js";
import ApiError from "../utils/ApiError.js";

// these api will run after patient registeraion
export const addPatientDetails = AsynHandler(async (req, res) => {
  const { user: authenticatedUser } = req.user;

  if (!authenticatedUser) {
    res.status(403);
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

  if (!["male", "female", "other"].includes(gender)) {
    throw new ApiError(400, "Invalid gender");
  }

  const { data: exitingPatient, error } = await supabase
    .from("patients")
    .select("*")
    .eq("user_id", authenticatedUser.id)
    .maybeSingle();

  if (error) {
    throw new ApiError(500, "Something went wrong");
  }

  if (exitingPatient) {
    throw new ApiError(400, "Patient already exit with this id");
  }

  // 000001

  const { data: prevPatient } = await supabase
    .from("patients")
    .select("patient_code")
    .order("patient_code", { ascending: false })
    .limit(1)
    .single();

  let nextNumber = 1;
  if (prevPatient) {
    nextNumber = parseInt(prevPatient.patient_code.replace("PAT-", ""), 10) + 1;
  }

  const patient_code = `PAT-${String(nextNumber).padStart(6, "0")}`;

  const { data: patient, error: createError } = await supabase
    .from("users")
    .insert({
      date_of_birth,
      gender,
      phone,
      address,
      insurance_provider,
      insurance_policy_no,
      patient_code,
    })
    .select(`*, :users(id,name,email,role_type)`)
    .single();

  if (createError || !patient) {
    throw new ApiError(500, "Something went wrong");
  }

  const patientData = {
    ...data,
    ...data.users,
  };

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        "patient information  added successfully",
        patientData,
      ),
    );
});

// Yaha par yeh appointment wala chod kar ...patient se unke medical_history leni ha uske liye add,get and update apis banani ha tuje chat gpt nhi karna laude ....abhi appointment wala fucntionality par kaam nhi karte

// ADil bana

export const addPatientMedicalHistory = AsynHandler(async (req, res) => {});
export const getPatientMedicalHistory = AsynHandler(async (req, res) => {});
export const updatePatientMedicalHistory = AsynHandler(async (req, res) => {});

export const updatePatientProfile = AsynHandler(async (req, res) => {});
export const getNext = AsynHandler(async (req, res) => {});
export const getPast = AsynHandler(async (req, res) => {});
export const getUpcoming = AsynHandler(async (req, res) => {});
