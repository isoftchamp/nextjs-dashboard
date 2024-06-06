import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import bcrypt from "bcrypt";

import type { User } from "@/app/lib/definitions";
import prisma from "@/lib/prisma";

import { authConfig } from "./auth.config";
 
async function getUser(email: string): Promise<User | null> {
  try {
    // const user = await sql<User>`SELECT * FROM users WHERE email=${email}`;
    const user = await prisma.users.findFirst({
      where: {
        email: email,
      }
    })
    return user;
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw new Error('Failed to fetch user.');
  }
}
 
export const { auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    GitHub,
    Google,
    Credentials({
      async authorize(credentials) {
        const parsedCredentials = z
          .object({ email: z.string().email(), password: z.string().min(6) })
          .safeParse(credentials);
 
        if (parsedCredentials.success) {
          const { email, password } = parsedCredentials.data;
          const user = await getUser(email);
          if (!user) return null;
          
          const passwordsMatch = await bcrypt.compare(password, user.password);
 
          if (passwordsMatch) return user;
        }
 
        console.log('Invalid credentials');
        return null;
      },
    }),
  ],
});
