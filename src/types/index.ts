export interface User {
  id: number
  email: string
}

export interface Bookmark {
  id: number
  url: string
  title: string | null
  description: string | null
  image_url: string | null
  notes: string | null
  created_at: string
}

export interface OgMetadata {
  title: string | null
  description: string | null
  image: string | null
  siteName: string | null
}
