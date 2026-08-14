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
  refreshTokenExpiresAt: Date;
}

export interface AuthenticationResult extends TokenPair {
  user: {
    id: string;
    name: string;
    email: string;
    timezone: string;
  };
}
