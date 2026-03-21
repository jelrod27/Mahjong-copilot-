export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoUrl?: string;
  createdAt: Date;
  lastLoginAt: Date;
  isPremium: boolean;
}

export const userProfileToJson = (profile: UserProfile): Record<string, any> => {
  return {
    uid: profile.uid,
    email: profile.email,
    displayName: profile.displayName,
    photoUrl: profile.photoUrl,
    createdAt: profile.createdAt.toISOString(),
    lastLoginAt: profile.lastLoginAt.toISOString(),
    isPremium: profile.isPremium,
  };
};

export const userProfileFromJson = (json: Record<string, any>): UserProfile => {
  return {
    uid: json.uid as string,
    email: json.email as string,
    displayName: json.displayName as string | undefined,
    photoUrl: json.photoUrl as string | undefined,
    createdAt: new Date(json.createdAt as string),
    lastLoginAt: new Date(json.lastLoginAt as string),
    isPremium: (json.isPremium as boolean) ?? false,
  };
};
