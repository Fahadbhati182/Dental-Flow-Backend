import { supabase } from "../config/db.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import AsynHandler from "../utils/AsynHandler.js";
import { getAllPatients, getPatientById } from "../services/userService.js";
import { getAvailableDentists } from "../services/appointment/receptionist.js";

export const getPatients = AsynHandler(async (req, res) => {
    const { page, limit } = req.query;
    const response = await getAllPatients(page, limit);
    res.json(response);
});

export const getPatientDetails = AsynHandler(async (req, res) => {
    const patientId = req.params.id;
    const patient = await getPatientById(patientId);
    if (!patient) {
        throw new ApiError(404, "Patient not found");
    }
    res.json(new ApiResponse(patient));
});

export const getTodaysAppointments = AsynHandler(async (req, res) => {
    //TODO:Implement payment status feature too
    const today = new Date().toISOString().split("T")[0];

    const { data: todaysAppointments, error } = await supabase
        .from("appointments")
        .select(`
            appointment_id,
            scheduled_at,
            status,
            patients (
                patient_id,
                users (
                    full_name
                )
            ),
            dentist_profile (
                staff (
                    users (
                        full_name
                    )
                )
            )
        `)
        .gte("scheduled_at", `${today}T00:00:00`)
        .lte("scheduled_at", `${today}T23:59:59`)
        .order("scheduled_at", { ascending: true });

    if (error) {
        throw new ApiError(500, error.message);
    }

    res.json(
        new ApiResponse(
            true,
            "Today's appointments fetched successfully",
            todaysAppointments
        )
    );
});


export const nextAppointment = AsynHandler(async(req,res)=>{
    const now = new Date().toISOString();

const { data: nextAppointment, error } = await supabase
    .from("appointments")
    .select(`
        appointment_id,
        scheduled_at,
        status,
        patients (
            patient_id,
            users (
                full_name
            )
        ),
        dentist_profile (
            staff (
                users (
                    full_name
                )
            )
        )
    `)
    .eq("status", "confirmed")
    .gte("scheduled_at", now)
    .order("scheduled_at", { ascending: true })
    .limit(1)
    .single();
     if (error) {
        throw new ApiError(500, error.message);
    }
     res.json(
        new ApiResponse(
            true,
            "Next appointments fetched successfully",
            nextAppointment
        )
    );


})

export const getAvailableDentistsWithSlots = AsynHandler(async (req, res) => {
  const { date } = req.query;

  if (!date) {
    throw new ApiError(400, "Date is required.");
  }

  const dentists = await getAvailableDentists(date);

  res.status(200).json({
    success: true,
    data: dentists,
  });
});

export const requestDentistAppointment = AsynHandler(async(req,res)=>{
     const { patientId, dentistId, slotId, reason } = req.body;

  if (!patientId || !dentistId || !slotId || !reason) {
    throw new ApiError(400, "All fields are required.");
  }

  const appointmentRequest = await createAppointmentRequest({
    patientId,
    dentistId,
    slotId,
    reason,
  });

  return res.status(201).json({
    success: true,
    message: "Appointment request created successfully.",
    data: appointmentRequest,
  });
})