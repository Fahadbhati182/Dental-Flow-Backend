import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

async function comparePassword(userPassword, hashPassword) {
  return await bcrypt.compare(userPassword, hashPassword);
}

function generateAccessToken(id, role, name) {
  return jwt.sign(
    {
      userId: id,
      name: name,
      role: role,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN,
    },
  );
}

function generateRefreshToken(id) {
  return jwt.sign(
    {
      userId: id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN,
    },
  );
}

const authService = {
  generateAccessToken,
  generateRefreshToken,
  hashPassword,
  comparePassword,
};

export default authService;
