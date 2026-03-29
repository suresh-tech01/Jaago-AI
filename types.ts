export enum Persona {
  STUDENT = 'Student',
  UPSC_ASPIRANT = 'UPSC Aspirant',
  GYM_FREAK = 'Gym Freak',
  NIGHT_SHIFT_WORKER = 'Night-shift Worker',
  CEO = 'CEO',
  SCHOOL_KID = 'School Kid'
}

export enum TaskType {
  CHANTING = 'CHANTING',
  PHOTO_FACE = 'PHOTO_FACE',
  READ_SENTENCE = 'READ_SENTENCE',
  WALK_STEPS = 'WALK_STEPS',
  SCAN_QR = 'SCAN_QR'
}

export enum Ringtone {
  COSMIC = 'COSMIC', // Sine wave, gentle
  CLASSIC = 'CLASSIC', // Digital beep
  WAR = 'WAR', // The original annoying one
  CUSTOM = 'CUSTOM' // User uploaded audio
}

export interface AlarmConfig {
  time: string; // HH:mm
  enabled: boolean;
  tasks: TaskType[];
  snoozeAllowed: boolean;
  // New features
  days: number[]; // 0 = Sunday, 1 = Monday, etc. Empty = Once
  label: string;
  ringtone: Ringtone;
  is24Hour: boolean;
}

export interface ValidationResult {
  passed: boolean;
  message: string;
}