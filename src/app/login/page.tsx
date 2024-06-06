import { Metadata } from 'next';

import {signIn} from "@/auth/auth";

import AcmeLogo from '@/app/ui/acme-logo';
import LoginForm, {LoginButton} from '@/app/ui/login-form';

export const metadata: Metadata = {
  title: 'Login',
}

export default function LoginPage() {
  return (
    <main className="flex items-center justify-center md:h-screen">
      <div className="relative mx-auto flex w-full max-w-[400px] flex-col space-y-2.5 p-4 md:-mt-32">
        <div className="flex h-20 w-full items-end rounded-lg bg-blue-500 p-3 md:h-36">
          <div className="w-32 text-white md:w-36">
            <AcmeLogo/>
          </div>
        </div>
        <div className="flex-1 rounded-lg bg-gray-50 px-6 pb-4 pt-8" >
          <LoginForm/>
          <form action={async () => {
            'use server';
            await signIn("google");
          }}>
            <LoginButton text="Log in with Google"/>
          </form>
          <form action={async () => {
            'use server';
            await signIn("github");
          }}>
            <LoginButton text="Log in with Github"/>
          </form>
        </div>
      </div>
    </main>
);
}