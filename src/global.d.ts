// global.d.ts
export {};

declare global {
  interface AccessToken {
    token: string;
    accountId: string;
    createdAt?: number;
    expiresAt?: number;
  }

  namespace NodeJS {
    interface Global {
      accessTokens: AccessToken[];
    }
  }
}
