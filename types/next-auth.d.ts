import { type DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      rol: "ADMIN" | "USUARIO";
    } & DefaultSession["user"];
  }

  interface User {
    id?: string;
    rol?: "ADMIN" | "USUARIO";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    rol?: "ADMIN" | "USUARIO";
  }
}
