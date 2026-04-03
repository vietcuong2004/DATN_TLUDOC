import mysql, { type Pool, type RowDataPacket } from "mysql2/promise"

let pool: Pool | null = null

function hasDbConfig() {
  return (
    process.env.DB_HOST !== undefined &&
    process.env.DB_PORT !== undefined &&
    process.env.DB_USER !== undefined &&
    process.env.DB_PASSWORD !== undefined &&
    process.env.DB_NAME !== undefined
  )
}

export function isDbConfigured() {
  return hasDbConfig()
}

export function getDbPool() {
  if (!hasDbConfig()) {
    throw new Error("Database env vars are missing")
  }

  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      charset: "utf8mb4",
    })
  }

  return pool
}

export async function queryRows<T extends RowDataPacket>(sql: string, params: unknown[] = []) {
  const db = getDbPool()
  const [rows] = await db.query<T[]>(sql, params)
  return rows
}
