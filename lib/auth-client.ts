import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();

export const signInWithGoogle = async (callbackURL = "/dashboard") => {
  return authClient.signIn.social({ provider: "google", callbackURL });
};

export const signOut = async () => {
  return authClient.signOut();
};
