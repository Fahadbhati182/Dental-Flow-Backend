import "dotenv/config";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import AsynHandler from "../utils/AsynHandler.js";
import { supabase } from "../config/db.js";
import authService from "../services/authServices.js";
import { sendEmail } from "../config/nodemailer.js";

export const loginAdmin = AsynHandler(async (req, res) => {
  const { email, password, role } = req.body;

  if (!role || role !== "admin") {
    res.status(400);
    throw new ApiError(400, "Unauthorized access");
  }

  if (!email || !password) {
    res.status(400);
    throw new ApiError(400, "Please fill all the fields");
  }

  if (
    email !== process.env.ADMIN_EMAIL ||
    password !== process.env.ADMIN_PASSWORD
  ) {
    res.status(401);
    throw new ApiError(401, "Invalid credentials");
  }

  let user = null;

  const { data: exitingAdmin, error: adminError } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  if (adminError) {
    res.status(500);
    throw new ApiError(500, "Something went wrong");
  }

  if (exitingAdmin) {
    user = exitingAdmin;
  } else {
    const hashPassword = await authService.hashPassword(password);

    const { data: newUser, error } = await supabase
      .from("users")
      .insert({
        name: "Admin",
        email: process.env.ADMIN_EMAIL,
        password: hashPassword,
        role_type: "admin",
      })
      .select()
      .single();

    if (error) {
      res.status(500);
      throw new ApiError(500, "Something went wrong while creating admin user");
    }

    if (!newUser) {
      res.status(500);
      throw new ApiError(500, "Failed to create admin user");
    }

    user = newUser;
  }
  console.log(user);
  const { refreshToken, accessToken } =
    await authService.generateAccessAndRefreshTokens(user.id);

  const { error: updateError } = await supabase
    .from("users")
    .update({ refresh_token: refreshToken })
    .eq("id", user.id);

  if (updateError) {
    throw new ApiError(500, "Failed to save refresh token");
  }

  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    signed: true,
    sameSite: "lax",
    maxAge: 1 * 24 * 60 * 60 * 1000, // 1 days
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    signed: true,
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  const userData = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role_type,
    accessToken,
    refreshToken,
  };

  return res
    .status(200)
    .json(new ApiResponse(200, "admin logged in successfully", userData));
});

export const addStaff = AsynHandler(async (req, res) => {
  const {
    name,
    email,
    password,
    role,
    phone,
    gender,
    date_of_birth,
    address,
    joining_date,
    salary,
  } = req.body;

  if (
    [
      name,
      email,
      password,
      role,
      phone,
      gender,
      date_of_birth,
      address,
      joining_date,
    ].some((field) => !field)
  ) {
    res.status(400);
    throw new ApiError(400, "Please fill all the fields");
  }

  const parsedSalary = Number(salary);
  if (typeof salary !== "number" || salary <= 0) {
    res.status(400);
    throw new ApiError(400, "Please provide a valid salary");
  }

  const allowedRoles = ["dentist", "receptionist"];

  if (!allowedRoles.includes(role)) {
    throw new ApiError(400, "Invalid role");
  }

  // staff already exit or not
  const { data: staffExits, error: staffExitsError } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  if (staffExitsError) {
    res.status(500);
    throw new ApiError(500, "Something went wrong");
  }

  if (staffExits) {
    throw new ApiError(409, "Staff already exists with this email");
  }

  const { data: user, error } = await supabase
    .from("users")
    .insert({
      name,
      email,
      password: await authService.hashPassword(password),
      role_type: role,
    })
    .select()
    .single();

  if (error) {
    res.status(500);
    throw new ApiError(500, "Something went wrong while creating staff user");
  }

  if (!user) {
    res.status(500);
    throw new ApiError(500, "Failed to create staff user");
  }

  const { data: lastStaff } = await supabase
    .from("staff")
    .select("employee_id")
    .order("employee_id", { ascending: false })
    .limit(1)
    .single();

  let nextNumber = 1;

  if (lastStaff) {
    nextNumber = parseInt(lastStaff.employee_id.replace("EMP-", ""), 10) + 1;
  }

  const employeeId = `EMP-${String(nextNumber).padStart(6, "0")}`;

  const { data: staffData, error: staffError } = await supabase
    .from("staff")
    .insert({
      user_id: user.id,
      phone,
      gender,
      designation: role,
      date_of_birth,
      address,
      joining_date,
      salary,
      employee_id: employeeId,
    })
    .select()
    .single();

  console.log(staffData);
  console.log(staffError);

  if (staffError) {
    await supabase.from("users").delete().eq("id", user.id);
    throw new ApiError(500, "Something went wrong while creating staff data");
  }

  await sendEmail(
    user.email,
    "Staff Account Created",
    `Your staff account has been created successfully. 
    Your login credentials are:\n
    Email: ${email}\n
    Password: ${password}\n
    Please log in and change your password immediately.`,
  );

  return res
    .status(201)
    .json(new ApiResponse(201, "Staff added successfully", staffData));
});

export const getAllStaff = AsynHandler(async (req, res) => {
  const { data: staffList, error } = await supabase
    .from("staff")
    .select(`*, user:users(id, name, email, role_type)`)
    .eq("is_deleted", false);

  if (error) {
    res.status(500);
    throw new ApiError(500, "Something went wrong while fetching staff data");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, "Staff data fetched successfully", staffList));
});

// soft delete staff data by setting is_deleted to true
export const deleteStaff = AsynHandler(async (req, res) => {
  const { staffId } = req.params;
  console.log(staffId);

  const { data: staff, error } = await supabase
    .from("staff")
    .select("*")
    .eq("id", staffId)
    .single();

  if (error || !staff) {
    res.status(404);
    throw new ApiError(404, "Staff not found");
  }

  await supabase.from("staff").update({ is_deleted: true }).eq("id", staffId);

  return res
    .status(200)
    .json(new ApiResponse(200, "Staff deleted successfully", null));
});
