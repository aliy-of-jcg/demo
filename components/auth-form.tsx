"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Shield, Eye, EyeOff, User, Mail, Lock, CheckCircle2, Building2, Phone, Loader2 } from "lucide-react";
import type { UserType } from "@/lib/types";
import { ForgotPasswordForm } from "@/components/forgot-password-form";

type AuthMode = "login" | "signup" | "forgot-password";

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [selectedUserType, setSelectedUserType] = useState<UserType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    company_name: "",
    email: "",
    password: "",
    confirmPassword: "",
    contact_number: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    // Basic validation
    if (mode === "signup" && !formData.company_name.trim()) {
      newErrors.company_name = "Company name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (mode === "signup") {
      if (!formData.contact_number.trim()) {
        newErrors.contact_number = "Contact number is required";
      }
      if (!selectedUserType) {
        newErrors.user_type = "Please select a user type";
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      }
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      setIsSubmitting(true);
      try {
        if (mode === "login") {
          await handleLogin();
        } else {
          await handleSignup();
        }
      } catch (error) {
        console.error("Authentication error:", error);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleLogin = async () => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem("auth_token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        router.push("/");
      } else {
        setErrors({ form: data.message });
      }
    } catch (error) {
      setErrors({ form: "Login failed. Please try again." });
    }
  };

  const handleSignup = async () => {
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: formData.company_name,
          email: formData.email,
          password: formData.password,
          contact_number: formData.contact_number,
          user_type: selectedUserType,
        }),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem("auth_token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        router.push("/");
      } else {
        setErrors({ form: data.message });
      }
    } catch (error) {
      setErrors({ form: "Signup failed. Please try again." });
    }
  };

  const toggleMode = () => {
    setMode(mode === "login" ? "signup" : "login");
    setErrors({});
    setSelectedUserType(null);
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const selectUserType = (type: UserType) => {
    setSelectedUserType(type);
    if (errors.user_type) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.user_type;
        return newErrors;
      });
    }
  };

  // Show forgot password form
  if (mode === "forgot-password") {
    return <ForgotPasswordForm onBack={() => setMode("login")} />;
  }

  return (
    <Card className="w-full max-w-md backdrop-blur-lg bg-white/95 shadow-2xl border-white/20">
      <CardHeader className="space-y-1 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 shadow-lg">
          <Shield className="h-8 w-8 text-white" />
        </div>
        <CardTitle className="text-3xl font-bold">
          {mode === "login" ? "Welcome Back" : "Create Account"}
        </CardTitle>
        <CardDescription className="text-base">
          {mode === "login"
            ? "Enter your credentials to access the panel"
            : "Sign up to get started with your analytics"}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Form-level error message */}
          {errors.form && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3">
              <p className="text-sm text-red-600">{errors.form}</p>
            </div>
          )}

          {/* User Type Selection - Only for Signup */}
          {mode === "signup" && (
            <div className="space-y-3">
              <Label>Select User Type</Label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => selectUserType("admin")}
                  className={`relative flex flex-col items-center gap-1 rounded-lg border-2 p-3 transition-all hover:border-indigo-500 hover:bg-indigo-50 ${
                    selectedUserType === "admin"
                      ? "border-indigo-600 bg-indigo-50 ring-2 ring-indigo-600 ring-offset-2"
                      : "border-gray-200"
                  }`}
                >
                  {selectedUserType === "admin" && (
                    <div className="absolute -right-1 -top-1 rounded-full bg-indigo-600 p-1">
                      <CheckCircle2 className="h-3 w-3 text-white" />
                    </div>
                  )}
                  <Shield className="h-6 w-6 text-indigo-600" />
                  <span className="text-xs font-semibold">Admin</span>
                </button>

                <button
                  type="button"
                  onClick={() => selectUserType("observer")}
                  className={`relative flex flex-col items-center gap-1 rounded-lg border-2 p-3 transition-all hover:border-purple-500 hover:bg-purple-50 ${
                    selectedUserType === "observer"
                      ? "border-purple-600 bg-purple-50 ring-2 ring-purple-600 ring-offset-2"
                      : "border-gray-200"
                  }`}
                >
                  {selectedUserType === "observer" && (
                    <div className="absolute -right-1 -top-1 rounded-full bg-purple-600 p-1">
                      <CheckCircle2 className="h-3 w-3 text-white" />
                    </div>
                  )}
                  <Eye className="h-6 w-6 text-purple-600" />
                  <span className="text-xs font-semibold">Observer</span>
                </button>

                <button
                  type="button"
                  onClick={() => selectUserType("regular")}
                  className={`relative flex flex-col items-center gap-1 rounded-lg border-2 p-3 transition-all hover:border-green-500 hover:bg-green-50 ${
                    selectedUserType === "regular"
                      ? "border-green-600 bg-green-50 ring-2 ring-green-600 ring-offset-2"
                      : "border-gray-200"
                  }`}
                >
                  {selectedUserType === "regular" && (
                    <div className="absolute -right-1 -top-1 rounded-full bg-green-600 p-1">
                      <CheckCircle2 className="h-3 w-3 text-white" />
                    </div>
                  )}
                  <User className="h-6 w-6 text-green-600" />
                  <span className="text-xs font-semibold">Regular</span>
                </button>
              </div>
              {errors.user_type && (
                <p className="text-sm text-red-600">{errors.user_type}</p>
              )}
              <p className="text-xs text-gray-500">
                Regular users have observer features. Owner type is set manually.
              </p>
            </div>
          )}

          {/* Company Name - Only for Signup */}
          {mode === "signup" && (
            <div className="space-y-2">
              <Label htmlFor="company_name">Company Name</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <Input
                  id="company_name"
                  type="text"
                  placeholder="Acme Inc."
                  value={formData.company_name}
                  onChange={(e) => handleInputChange("company_name", e.target.value)}
                  className={`pl-10 ${errors.company_name ? "border-red-500" : ""}`}
                />
              </div>
              {errors.company_name && (
                <p className="text-sm text-red-600">{errors.company_name}</p>
              )}
            </div>
          )}

          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                className={`pl-10 ${errors.email ? "border-red-500" : ""}`}
              />
            </div>
            {errors.email && (
              <p className="text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          {/* Contact Number - Only for Signup */}
          {mode === "signup" && (
            <div className="space-y-2">
              <Label htmlFor="contact_number">Contact Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <Input
                  id="contact_number"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={formData.contact_number}
                  onChange={(e) => handleInputChange("contact_number", e.target.value)}
                  className={`pl-10 ${errors.contact_number ? "border-red-500" : ""}`}
                />
              </div>
              {errors.contact_number && (
                <p className="text-sm text-red-600">{errors.contact_number}</p>
              )}
            </div>
          )}

          {/* Password Field */}
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                className={`pl-10 pr-10 ${errors.password ? "border-red-500" : ""}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-red-600">{errors.password}</p>
            )}
          </div>

          {/* Confirm Password - Only for Signup */}
          {mode === "signup" && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    handleInputChange("confirmPassword", e.target.value)
                  }
                  className={`pl-10 pr-10 ${
                    errors.confirmPassword ? "border-red-500" : ""
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-red-600">{errors.confirmPassword}</p>
              )}
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg"
            size="lg"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {mode === "login" ? "Signing In..." : "Creating Account..."}
              </>
            ) : (
              mode === "login" ? "Sign In" : "Create Account"
            )}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="flex flex-col space-y-4">
        {mode === "login" && (
          <button
            type="button"
            onClick={() => setMode("forgot-password")}
            className="text-sm text-indigo-600 hover:text-indigo-700 hover:underline"
          >
            Forgot password?
          </button>
        )}

        <div className="text-sm text-center text-gray-600">
          {mode === "login" ? (
            <>
              Don't have an account?{" "}
              <button
                type="button"
                onClick={toggleMode}
                className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
              >
                Sign up
              </button>
            </>
          ) : mode === "signup" ? (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={toggleMode}
                className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
              >
                Sign in
              </button>
            </>
          ) : null}
        </div>
      </CardFooter>
    </Card>
  );
}
