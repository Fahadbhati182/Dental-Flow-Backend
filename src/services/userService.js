import { supabase } from "../config/db";
import ApiError from "../utils/ApiError";
import ApiResponse from "../utils/ApiResponse";
import AsynHandler from "../utils/AsynHandler";

// get all patients
//TODO: add medical history and appointments in patient details response

export const getAllPatients = async(page=1,limit=20)=>{
    const offset = (page - 1) * limit;
    const to = from + limit - 1;
    const { data, error, count } = await supabase
        .from("patients")
        .select("*", { count: "exact" })
        .range(from, to);

    if (error) throw new ApiError(500, error.message);

    return new ApiResponse({
        data,
        pagination: {
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit),
        },
    });
}
//get patient by id
export const getPatientById = async(id)=>{
    const {data,error} = await supabase.from("patients").select("*").eq("patient_id",id).single();
    if(error) throw new ApiError(500,error.message);
    return data;
}