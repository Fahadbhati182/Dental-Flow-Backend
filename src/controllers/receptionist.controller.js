import { supabase } from "../config/db";
import ApiError from "../utils/ApiError";
import ApiResponse from "../utils/ApiResponse";
import AsynHandler from "../utils/AsynHandler";
import { getAllPatients, getPatientById } from "../services/userService.js";
import { getNextAppointment, getPastAppointments, getUpcomingAppointments } from "../services/appointment/patient.js";

const id = req.user?.userId;

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