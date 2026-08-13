export interface AuthenticatedUser {
  userId: string;
  email: string;
}

export interface RequestMetadata {
  ipAddress?: string;
  userAgent?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}
