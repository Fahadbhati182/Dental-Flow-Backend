import { supabase } from "../config/db.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import AsynHandler from "../utils/AsynHandler.js";

export const addDentistDetails = AsynHandler(async (req, res) => {
  const user = req.user;

  if (!user) {
    throw new ApiError(401, "Unauthorized");
  }

  const {
    specialization,
    qualification,
    license_number,
    experience_years,
    consultation_fee,
    bio,
  } = req.body;

  if (!specialization || !Array.isArray(specialization)) {
    throw new ApiError(400, "specializaion is required");
  }

  if (!qualification || !Array.isArray(qualification)) {
    throw new ApiError(400, "qualification is required");
  }

  if (!license_number || !bio) {
    throw new ApiError(400, "fields is required");
  }

  if (
    experience_years === undefined ||
    typeof experience_years !== "number" ||
    experience_years < 0
  ) {
    throw new ApiError(400, "Invalid experience years");
  }

  if (
    consultation_fee === undefined ||
    typeof consultation_fee !== "number" ||
    consultation_fee < 0
  ) {
    throw new ApiError(400, "Invalid experience years");
  }
  const { data: staffData, error: staffError } = await supabase
    .from("staff")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (staffError) {
    throw new ApiError(500, "Something went wrong ");
  }

  if (!staffData) {
    throw new ApiError(400, "staff data doesnot exits");
  }

  if (staffData.designation !== "dentist") {
    throw new ApiError(403, "Only dentists can add dentist details");
  }

  const { data: existingDentist } = await supabase
    .from("dentists")
    .select("id")
    .eq("staff_id", staffData.id)
    .maybeSingle();

  if (existingDentist) {
    throw new ApiError(409, "Dentist profile already exists");
  }

  const { data: dentistData, error: dentistError } = await supabase
    .from("dentists")
    .insert({
      staff_id: staffData.id,
      specialization,
      qualification,
      license_number,
      experience_years,
      consultation_fee,
      bio,
    })
    .select()
    .single();

  if (dentistError) {
    throw new ApiError(500, dentistError.message);
  }

  if (!dentistData) {
    throw new ApiError(500, "Failed to create dentist profile");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        "dentist information is added successfully",
        dentistData,
      ),
    );
});
