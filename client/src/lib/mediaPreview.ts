/** Browser-playable media detection — MIME is often empty for .mp4/.mov drops. */

const VIDEO_EXT = /\.(mp4|webm|mov|mkv|m4v|avi|ogv|mpeg|mpg|qt)$/i
const AUDIO_EXT = /\.(mp3|wav|m4a|aac|ogg|flac|wma|opus)$/i

export function isPlayableVideoFile(file: File): boolean {
  if (file.type.startsWith('video/')) return true
  if (file.type.startsWith('audio/')) return false
  return VIDEO_EXT.test(file.name)
}

export function isPlayableAudioFile(file: File): boolean {
  if (file.type.startsWith('audio/')) return true
  if (file.type.startsWith('video/')) return false
  return AUDIO_EXT.test(file.name)
}

/** Video or audio that can drive cue verification playback. */
export function isPlayableMediaFile(file: File): boolean {
  return isPlayableVideoFile(file) || isPlayableAudioFile(file)
}
