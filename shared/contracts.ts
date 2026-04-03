export type MembershipStatus = {
  is_member: boolean
  status: string
  remaining_days: number
  expires_at?: string | null
  plan_code?: string | null
}

export type RegisterRequest = {
  email: string
  password: string
}

export type RegisterResponse = {
  message: string
  requires_email_verification: boolean
  debug_verify_url?: string | null
}

export type LoginRequest = {
  email: string
  password: string
}

export type UserProfile = {
  id: string
  email: string
  email_verified: boolean
}

export type LoginResponse = {
  user: UserProfile
  access_token: string
  token_type: string
}

export type CurrentUserResponse = {
  authenticated: boolean
  user?: UserProfile | null
}

export type AnalyzeRequest = {
  url: string
}

export type LocalAnalyzeRequest = {
  video_title: string
  transcript: TranscriptSegment[]
  transcript_language?: string
  source_url?: string
}

export type TranscriptSegment = {
  start: number
  end: number
  timestamp: string
  text: string
}

export type SummarySection = {
  title: string
  start: string
  summary: string
}

export type VideoSummary = {
  overview: string
  key_points: string[]
  sections: SummarySection[]
}

export type MindMapNode = {
  id: string
  label: string
  children: MindMapNode[]
}

export type VideoAnalysisResponse = {
  analysis_id: string
  video_title: string
  summary: VideoSummary
  transcript: TranscriptSegment[]
  mind_map: MindMapNode
  transcript_language?: string
}

export type ChatCitation = {
  timestamp: string
  text: string
}

export type VideoChatResponse = {
  answer: string
  citations: ChatCitation[]
}

export type LocalAiPrepareResponse = {
  source_url: string
  video_title: string
  transcript: TranscriptSegment[]
  transcript_language?: string
}

export type VideoFormat = {
  format_id: string
  ext: string
  quality: string
  filesize?: number
  filesize_display?: string
  resolution?: string
  fps?: number
  fps_display?: string
}

export type VideoInfo = {
  title: string
  duration?: number
  thumbnail?: string
  thumbnail_proxy_url?: string
  platform: string
  uploader?: string
  view_count?: number
  formats: VideoFormat[]
  note?: string
  error?: string
}

export type DownloadRequest = {
  url: string
  format?: string
  quality?: string
}

export type DownloadResponse = {
  task_id: string
  status: string
}

export type TaskStatus = {
  task_id: string
  status: string
  progress: number
  speed: string
  eta: number
  file_path?: string
  error?: string
}
