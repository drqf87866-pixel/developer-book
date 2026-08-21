export type Env = {
  DB: D1Database
  ASSETS: Fetcher
}

export type AuthUser = {
  id: number
  email: string
}

export type Variables = {
  user: AuthUser
}

export type AppEnv = {
  Bindings: Env
  Variables: Variables
}
