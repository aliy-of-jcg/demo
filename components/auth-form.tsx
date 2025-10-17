"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Shield, Eye, EyeOff, User, Mail, Lock, CheckCircle2, Key } from "lucide-react";

type AuthMode = "login" | "signup";
type UserRole = "admin" | "observer" | null;

export function AuthForm() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [selectedRole, setSelectedRole] = useState<UserRole>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    inviteCode: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // This should be stored securely in your backend
  // For now, it's here for demonstration purposes
  const VALID_INVITE_CODE = "ADMIN2025";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    // Basic validation
    if (mode === "signup" && !formData.name.trim()) {
      newErrors.name = "Name is required";
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
      if (!selectedRole) {
        newErrors.role = "Please select a role";
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      }
      if (!formData.inviteCode.trim()) {
        newErrors.inviteCode = "Invite code is required";
      } else if (formData.inviteCode !== VALID_INVITE_CODE) {
        newErrors.inviteCode = "Invalid invite code";
      }
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      // Handle authentication (not connected to server yet)
      console.log("Form submitted:", {
        mode,
        role: selectedRole,
        ...formData,
      });
      alert(`${mode === "login" ? "Login" : "Signup"} successful! (Not connected to server yet)`);
    }
  };

  const toggleMode = () => {
    setMode(mode === "login" ? "signup" : "login");
    setErrors({});
    setSelectedRole(null);
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const selectRole = (role: UserRole) => {
    setSelectedRole(role);
    if (errors.role) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.role;
        return newErrors;
      });
    }
  };

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
            ? "Enter your credentials to access the admin panel"
            : "Sign up to get started with admin access"}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Role Selection - Only for Signup */}
          {mode === "signup" && (
            <div className="space-y-3">
              <Label>Select Your Role</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => selectRole("admin")}
                  className={`relative flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all hover:border-indigo-500 hover:bg-indigo-50 ${
                    selectedRole === "admin"
                      ? "border-indigo-600 bg-indigo-50 ring-2 ring-indigo-600 ring-offset-2"
                      : "border-gray-200"
                  }`}
                >
                  {selectedRole === "admin" && (
                    <div className="absolute -right-2 -top-2 rounded-full bg-indigo-600 p-1">
                      <CheckCircle2 className="h-4 w-4 text-white" />
                    </div>
                  )}
                  <Shield className="h-8 w-8 text-indigo-600" />
                  <span className="font-semibold">Admin</span>
                  <span className="text-xs text-gray-500 text-center">
                    Full system access
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => selectRole("observer")}
                  className={`relative flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all hover:border-purple-500 hover:bg-purple-50 ${
                    selectedRole === "observer"
                      ? "border-purple-600 bg-purple-50 ring-2 ring-purple-600 ring-offset-2"
                      : "border-gray-200"
                  }`}
                >
                  {selectedRole === "observer" && (
                    <div className="absolute -right-2 -top-2 rounded-full bg-purple-600 p-1">
                      <CheckCircle2 className="h-4 w-4 text-white" />
                    </div>
                  )}
                  <Eye className="h-8 w-8 text-purple-600" />
                  <span className="font-semibold">Observer</span>
                  <span className="text-xs text-gray-500 text-center">
                    View-only access
                  </span>
                </button>
              </div>
              {errors.role && (
                <p className="text-sm text-red-600">{errors.role}</p>
              )}
            </div>
          )}

          {/* Name Field - Only for Signup */}
          {mode === "signup" && (
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className={`pl-10 ${errors.name ? "border-red-500" : ""}`}
                />
              </div>
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name}</p>
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

          {/* Invite Code - Only for Signup */}
          {mode === "signup" && (
            <div className="space-y-2">
              <Label htmlFor="inviteCode" className="flex items-center gap-2">
                Invite Code
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                  Required
                </span>
              </Label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <Input
                  id="inviteCode"
                  type="text"
                  placeholder="Enter your invite code"
                  value={formData.inviteCode}
                  onChange={(e) =>
                    handleInputChange("inviteCode", e.target.value.toUpperCase())
                  }
                  className={`pl-10 font-mono uppercase ${
                    errors.inviteCode ? "border-red-500" : ""
                  }`}
                  maxLength={20}
                />
              </div>
              {errors.inviteCode && (
                <p className="text-sm text-red-600">{errors.inviteCode}</p>
              )}
              <p className="text-xs text-gray-500">
                Contact the system administrator to receive your invite code
              </p>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg"
            size="lg"
          >
            {mode === "login" ? "Sign In" : "Create Account"}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="flex flex-col space-y-4">
        {mode === "login" && (
          <button
            type="button"
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
          ) : (
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
          )}
        </div>
      </CardFooter>
    </Card>
  );
}

