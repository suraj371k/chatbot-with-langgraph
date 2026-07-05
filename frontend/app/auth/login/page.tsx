"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useForm } from "react-hook-form";
import { LoginInput, LoginInputSchema } from "@/schemas/auth.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { login, loading } = useAuthStore();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginInputSchema),
    mode: "onBlur", //validate as user's leaves each field , not just on onSubmit
  });

  const onSubmit = async (data: LoginInput) => {
    try {
      await login(data);
      toast.success("login successfull");
      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    }
  };
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-neutral-950 px-4 py-10">
      <Card className="relative w-full max-w-md overflow-hidden border-neutral-800 bg-neutral-900/60 shadow-2xl shadow-lime-500/5 backdrop-blur-sm sm:max-w-lg">
        <div
          className="pointer-events-none absolute -top-10 -right-10 z-0 h-56 w-56
            bg-[radial-gradient(circle,#a3e635_1px,transparent_1px)]
            bg-size-[14px_14px]
            opacity-30
            mask-[radial-gradient(ellipse_at_top_right,black_35%,transparent_70%)]"
        />

        <CardHeader className="relative z-10 space-y-1.5 pb-2">
          <CardTitle className="text-2xl font-semibold tracking-tight text-neutral-50 sm:text-3xl">
            Welcome Back
          </CardTitle>
          <CardDescription className="text-sm text-neutral-400">
            Enter your email and password to login your account
          </CardDescription>
        </CardHeader>

        <CardContent className="relative z-10 pt-4">
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="email" className="text-neutral-300">
                Email
              </Label>
              <Input
                id="email"
                {...register("email")}
                type="email"
                placeholder="jane@company.com"
                required
                className="h-11 border-neutral-800 bg-neutral-950/50 text-neutral-100 placeholder:text-neutral-500 focus-visible:border-lime-400 focus-visible:ring-lime-400/30"
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password" className="text-neutral-300">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  {...register("password")}
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  required
                  className="h-11 border-neutral-800 bg-neutral-950/50 pr-10 text-neutral-100 placeholder:text-neutral-500 focus-visible:border-lime-400 focus-visible:ring-lime-400/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-neutral-500 transition-colors hover:text-neutral-300"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-500">
                  {errors.password?.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="mt-2 h-11 w-full bg-lime-400 font-medium text-neutral-950 hover:bg-lime-300"
            >
              {loading ? "Logging in" : "Login"}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="relative z-10 pt-2">
          <p className="w-full text-center text-sm text-neutral-400">
            Don't have an account?{" "}
            <Button
              variant="link"
              onClick={() => router.push("/auth/signup")}
              className="h-auto p-0 text-lime-400 hover:text-lime-300"
            >
              Sign up
            </Button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default LoginPage;
