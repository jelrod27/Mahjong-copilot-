import {LearningLevel} from './UserProgress';

export enum ContentType {
  LESSON = 'lesson',
  QUIZ = 'quiz',
  SCENARIO = 'scenario',
  VIDEO = 'video',
  INFOGRAPHIC = 'infographic',
}

export enum Difficulty {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
}

export interface LearningContent {
  id: string;
  title: string;
  description: string;
  type: ContentType;
  level: LearningLevel;
  difficulty: Difficulty;
  variant: string;
  content: Record<string, any>;
  tags: string[];
  estimatedMinutes: number;
  thumbnailUrl?: string;
  videoUrl?: string;
  translations?: Record<string, string>;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  imageUrl?: string;
  level: LearningLevel;
}

export const learningContentToJson = (content: LearningContent): Record<string, any> => {
  return {
    id: content.id,
    title: content.title,
    description: content.description,
    type: content.type,
    level: content.level,
    difficulty: content.difficulty,
    variant: content.variant,
    content: content.content,
    tags: content.tags,
    estimatedMinutes: content.estimatedMinutes,
    thumbnailUrl: content.thumbnailUrl,
    videoUrl: content.videoUrl,
    translations: content.translations,
    order: content.order,
    createdAt: content.createdAt.toISOString(),
    updatedAt: content.updatedAt.toISOString(),
  };
};

export const learningContentFromJson = (json: Record<string, any>): LearningContent => {
  return {
    id: json.id as string,
    title: json.title as string,
    description: json.description as string,
    type: json.type as ContentType,
    level: json.level as LearningLevel,
    difficulty: json.difficulty as Difficulty,
    variant: json.variant as string,
    content: json.content as Record<string, any>,
    tags: (json.tags as string[]) ?? [],
    estimatedMinutes: (json.estimatedMinutes as number) ?? 5,
    thumbnailUrl: json.thumbnailUrl as string | undefined,
    videoUrl: json.videoUrl as string | undefined,
    translations: json.translations as Record<string, string> | undefined,
    order: (json.order as number) ?? 0,
    createdAt: new Date(json.createdAt as string),
    updatedAt: new Date(json.updatedAt as string),
  };
};

export const quizQuestionToJson = (question: QuizQuestion): Record<string, any> => {
  return {
    id: question.id,
    question: question.question,
    options: question.options,
    correctAnswerIndex: question.correctAnswerIndex,
    explanation: question.explanation,
    imageUrl: question.imageUrl,
    level: question.level,
  };
};

export const quizQuestionFromJson = (json: Record<string, any>): QuizQuestion => {
  return {
    id: json.id as string,
    question: json.question as string,
    options: json.options as string[],
    correctAnswerIndex: json.correctAnswerIndex as number,
    explanation: json.explanation as string,
    imageUrl: json.imageUrl as string | undefined,
    level: json.level as LearningLevel,
  };
};
