export interface InterviewSession {
  id: string;
  candidateName: string;
  problem: string;
  code: string;
  language: string;
  status: 'waiting' | 'active' | 'completed';
  output?: string;
  createdAt: Date;
  isInstructionPhase?: boolean;
  instructionTimeRemaining?: number;
  codingTimeRemaining?: number;
  lastUpdate?: number; // Timestamp to force updates
}

export interface Problem {
  id: string;
  title: string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  starterCode: {
    [key: string]: string;
  };
}
