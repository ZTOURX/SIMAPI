export interface Personality {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  traits: PersonalityTrait[];
  greetings: string[];
  farewells: string[];
  fallbacks: string[];
  style: PersonalityStyle;
  metadata: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
  isDefault: boolean;
}

export interface PersonalityTrait {
  name: string;
  value: number;
  description: string;
}

export interface PersonalityStyle {
  tone: "formal" | "casual" | "friendly" | "professional" | "playful";
  verbosity: "minimal" | "moderate" | "verbose";
  emojiUsage: "none" | "minimal" | "moderate" | "heavy";
  useMarkdown: boolean;
  language: string;
}

export interface PersonalityAdaptation {
  threadId: string;
  adaptations: Record<string, number>;
  learnedPreferences: string[];
  interactionCount: number;
  lastAdapted: number;
}
