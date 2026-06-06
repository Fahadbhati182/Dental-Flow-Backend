import { supabase } from "../config/db.js";

export const getUpcomingAppointments = async(dentistId)=>{
    const{data:getUpcomingApointments,error}=supabase
        .from("appointments")
        .select(`   
            scheduled_at,
            reason,
            patients(
                patient_id,
                users(full_name),
                medical_history(
                allergies,
                chronic_conditions
                )
            )
            `)
            .eq("dentist_id",dentistId)
            .order('scheduled_at', { ascending: true })
      .limit(limit);
            if (error) throw error;
    return data;
}


export const getTodaysSchedule=async(dentistId)=>{
    const today = new Date().toISOString().split('T')[0];
    const {data:todaysSchedule,error} = supabase
    .from("appointments")
    .select(`
        appointment_id,
        scheduled_at,
        duration_minutes,
        reason,
        status,
        patients(
        date_of_birth,
        medical_history(
        allergies,
        chronic_conditions
        )

        users(name)
        )
        
        `)
        .eq('dentist_id', dentistId)
      .gte('scheduled_at', `${today}T00:00:00`)
      .lte('scheduled_at', `${today}T23:59:59`)
      .order('scheduled_at', { ascending: true });

        if(error)throw error;
        return data.map(app => ({
    time: new Date(app.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    patientName: app.patients?.users?.full_name,
    age: app.patients?.date_of_birth 
        ? new Date().getFullYear() - new Date(app.patients.date_of_birth).getFullYear() 
        : 'N/A',
    procedure: app.type,
    duration: `${app.duration_minutes} min`,
    medicalAlert: app.patients?.medical_history?.[0]?.allergies || 'None',
    status: app.status
  }));  

}


